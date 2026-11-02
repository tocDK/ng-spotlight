import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, Injector, signal, type EnvironmentInjector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Subject, timeout, type Observable, type Subscription } from 'rxjs';
import {
  createSearchEngine,
  DEFAULT_TIMEOUT_MS,
  toObservableResult,
  type SpotlightGroupState,
  type SpotlightLearnedGroups,
  type SpotlightQueryState,
  type SpotlightRegisteredSource,
} from './engine';
import { DEFAULT_HOTKEYS, detectMac, parseHotkey, type ParsedHotkey } from './hotkeys';
import { normalizeResult } from './normalize';
import { entryToItem, isRecentEntry, localStorageRecent, pushRecent, toRecentEntry } from './recent';
import { resolveTexts, type ResolvedSpotlightTexts } from './texts';
import type {
  SpotlightAction,
  SpotlightConfig,
  SpotlightItem,
  SpotlightRecentEntry,
  SpotlightRecentStorage,
  SpotlightSource,
} from './types';
import { isSafeUrl } from './url';

export const RECENT_GROUP_ID = '__recent';

/**
 * How long select() waits for a run() action before it closes the palette anyway (spec §5.9:
 * run() is awaited, then the palette closes). A run() that settles later still records Recent and
 * emits `selected` (or reports its error); it never locks the palette.
 */
export const RUN_WAIT_MS = 5000;

export interface SpotlightOption {
  /** `<groupKey>::<itemId>`, or `retry::<sourceId>` for an error row. */
  key: string;
  /** DOM id of the role="option" element (target of aria-activedescendant). */
  domId: string;
  kind: 'item' | 'retry';
  item: SpotlightItem | null;
  sourceId: string;
  groupKey: string;
}

export interface SpotlightChip {
  /** Group id, or null for "All". */
  id: string | null;
  label: string;
}

export interface SpotlightSettings {
  hotkeys: readonly ParsedHotkey[];
  theme: 'default' | 'none';
  recentMax: number;
  storage: SpotlightRecentStorage;
  onError: (error: unknown, source: SpotlightSource) => void;
}

let nextInstanceId = 0;

/** Settings only the first (root or isolated) provideSpotlight() call may set. */
const IGNORED_IN_CHILD = ['hotkeys', 'texts', 'recent', 'theme', 'onError'] as const;

const defaultOnError = (error: unknown, source: SpotlightSource): void => {
  console.error(`[ng-spotlight] source "${source.id}" failed`, error);
};

function parseHotkeys(specs: readonly string[]): ParsedHotkey[] {
  const isMac = detectMac();
  return specs.map((spec) => parseHotkey(spec, isMac));
}

function chipsFrom(groups: readonly SpotlightGroupState[]): SpotlightChip[] {
  const seen = new Map<string, string>();
  for (const group of groups) {
    if (group.items.length > 0 && !seen.has(group.id)) seen.set(group.id, group.label);
  }
  return [...seen].map(([id, label]) => ({ id, label }));
}

/**
 * State and behaviour of one palette. Provided by provideSpotlight(); never providedIn root.
 * Deliberately has no ngOnDestroy: a child injector re-provides the parent's instance and
 * must not destroy it. Cleanup runs through the creating injector's DestroyRef.
 */
@Injectable()
export class SpotlightService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router, { optional: true });
  private readonly regs = signal<readonly SpotlightRegisteredSource[]>([]);
  private registrationOrder = 0;
  private configured = false;
  /** Token of the select() whose action is still running; null when none is. */
  private selecting: object | null = null;
  /** Incremented on every open(), so a late action never closes a palette opened after it. */
  private session = 0;

  /** Prefix for this instance's DOM ids. */
  readonly idPrefix = `sp-${nextInstanceId++}`;

  private _settings: SpotlightSettings = {
    hotkeys: parseHotkeys(DEFAULT_HOTKEYS),
    theme: 'default',
    recentMax: 8,
    storage: localStorageRecent('default'),
    onError: defaultOnError,
  };
  private readonly _texts = signal<ResolvedSpotlightTexts>(resolveTexts(undefined, inject(Injector)));

  private readonly _isOpen = signal(false);
  readonly isOpen = this._isOpen.asReadonly();
  private readonly _query = signal('');
  readonly query = this._query.asReadonly();
  private readonly _chip = signal<string | null>(null);
  readonly chip = this._chip.asReadonly();
  private readonly _results = signal<readonly SpotlightGroupState[]>([]);
  private readonly _recent = signal<readonly SpotlightRecentEntry[]>([]);
  private readonly _resolvedRuns = signal<ReadonlyMap<string, SpotlightItem>>(new Map());
  private readonly _activeKey = signal<string | null>(null);
  private readonly _chipGroups = signal<readonly SpotlightChip[]>([]);
  private readonly selectedSubject = new Subject<SpotlightItem>();
  readonly selected: Observable<SpotlightItem> = this.selectedSubject.asObservable();

  private input$ = new BehaviorSubject<SpotlightQueryState>({ query: '', chip: null });
  private readonly retry$ = new Subject<string>();
  private engine: Subscription | null = null;
  /** Group labels learned from answers; outlives the engine, which restarts on every open(). */
  private readonly learnedGroups: SpotlightLearnedGroups = new Map();

  private readonly recentItems = computed(() => {
    const runs = this._resolvedRuns();
    const out: Array<{ item: SpotlightItem; sourceId: string }> = [];
    for (const entry of this._recent()) {
      const item = entryToItem(entry) ?? runs.get(`${entry.sourceId}::${entry.id}`) ?? null;
      if (item) out.push({ item, sourceId: entry.sourceId });
    }
    return out;
  });

  /** Visible groups: Recent first on the empty query, then the sources' groups. */
  readonly groups = computed<readonly SpotlightGroupState[]>(() => {
    const results = this._results();
    if (this._query().trim() !== '' || this._chip() !== null) return results;
    const recent = this.recentItems();
    if (recent.length === 0) return results;
    const recentKeys = new Set(recent.map((r) => `${r.sourceId}::${r.item.id}`));
    const rest = results
      .map((g) => ({ ...g, items: g.items.filter((i) => !recentKeys.has(`${g.sourceId}::${i.id}`)) }))
      .filter((g) => g.items.length > 0 || g.loading || g.error !== null);
    const recentGroup: SpotlightGroupState = {
      key: RECENT_GROUP_ID,
      id: RECENT_GROUP_ID,
      label: this.texts.recent(),
      sourceId: RECENT_GROUP_ID,
      items: recent.map((r) => r.item),
      loading: false,
      error: null,
    };
    return [recentGroup, ...rest];
  });

  /** Every selectable row in display order, including one retry row per failed source. */
  readonly options = computed<readonly SpotlightOption[]>(() => {
    const out: SpotlightOption[] = [];
    const recent = this.recentItems();
    for (const group of this.groups()) {
      if (group.error !== null) {
        out.push({
          key: `retry::${group.sourceId}`,
          domId: `${this.idPrefix}-o${out.length}`,
          kind: 'retry',
          item: null,
          sourceId: group.sourceId,
          groupKey: group.key,
        });
        continue;
      }
      // A loading group still shows the previous query's rows; they must not be selectable.
      if (group.loading) continue;
      group.items.forEach((item, index) => {
        const sourceId = group.key === RECENT_GROUP_ID ? recent[index].sourceId : group.sourceId;
        out.push({
          key: group.key === RECENT_GROUP_ID ? `${RECENT_GROUP_ID}::${sourceId}::${item.id}` : `${group.key}::${item.id}`,
          domId: `${this.idPrefix}-o${out.length}`,
          kind: 'item',
          item,
          sourceId,
          groupKey: group.key,
        });
      });
    }
    return out;
  });

  readonly activeIndex = computed(() => {
    const options = this.options();
    if (options.length === 0) return -1;
    const key = this._activeKey();
    if (key === null) return 0;
    const index = options.findIndex((o) => o.key === key);
    return index === -1 ? 0 : index;
  });

  readonly activeOption = computed<SpotlightOption | null>(() => {
    const index = this.activeIndex();
    return index === -1 ? null : this.options()[index];
  });

  readonly chips = computed<readonly SpotlightChip[]>(() => [{ id: null, label: this.texts.all() }, ...this._chipGroups()]);

  readonly loading = computed(() => this._results().some((g) => g.loading));

  readonly announcement = computed(() => {
    const count = this.options().filter((o) => o.kind === 'item').length;
    // Announce "Loading…" rather than "No results" while sources are still answering.
    if (count === 0 && this.loading()) return this.texts.loading();
    return this.texts.resultsAnnouncement(count);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.close();
      this.selectedSubject.complete();
    });
  }

  get texts(): ResolvedSpotlightTexts {
    return this._texts();
  }

  get settings(): Readonly<SpotlightSettings> {
    return this._settings;
  }

  /** @internal Called by provideSpotlight(). The first call owns the settings; every call adds its sources. */
  configure(config: SpotlightConfig, injector: EnvironmentInjector): void {
    if (!this.configured) {
      this.configured = true;
      this._settings = {
        hotkeys: parseHotkeys(config.hotkeys ?? DEFAULT_HOTKEYS),
        theme: config.theme ?? 'default',
        recentMax: config.recent?.max ?? 8,
        storage: config.recent?.storage ?? localStorageRecent('default'),
        onError: config.onError ?? defaultOnError,
      };
      this._texts.set(resolveTexts(config.texts, injector));
    } else if (typeof ngDevMode === 'undefined' || ngDevMode) {
      const ignored = IGNORED_IN_CHILD.filter((key) => config[key] !== undefined);
      if (ignored.length > 0) {
        console.warn(
          `[ng-spotlight] a child provideSpotlight() only adds sources and http defaults; ${ignored.join(', ')} ` +
            'ignored. Set them in the first provideSpotlight() call, or pass isolated: true for a separate palette.',
        );
      }
    }
    const added: SpotlightRegisteredSource[] = (config.sources ?? []).map((source) => ({
      source,
      injector,
      order: this.registrationOrder++,
    }));
    if (added.length === 0) return;
    this.regs.update((regs) => [...regs, ...added]);
    injector.get(DestroyRef).onDestroy(() => {
      this.regs.update((regs) => regs.filter((reg) => !added.includes(reg)));
      const removed = new Set(added.map((reg) => reg.source.id));
      const stillRegistered = new Set(this.regs().map((reg) => reg.source.id));
      this._resolvedRuns.update((runs) => {
        const next = new Map(runs);
        for (const key of runs.keys()) {
          const sourceId = key.slice(0, key.indexOf('::'));
          if (removed.has(sourceId) && !stillRegistered.has(sourceId)) next.delete(key);
        }
        return next;
      });
      this.restartEngine();
    });
    this.restartEngine();
  }

  open(query?: string): void {
    if (this._isOpen()) {
      if (query !== undefined) this.setQuery(query);
      return;
    }
    this._query.set(query ?? '');
    this._chip.set(null);
    this._activeKey.set(null);
    this._chipGroups.set([]);
    this.session++;
    this._isOpen.set(true);
    void this.loadRecent();
    this.restartEngine();
  }

  close(): void {
    if (!this._isOpen()) return;
    this.selecting = null;
    this._isOpen.set(false);
    this.engine?.unsubscribe();
    this.engine = null;
    this._results.set([]);
    this._query.set('');
    this._chip.set(null);
    this._activeKey.set(null);
  }

  toggle(): void {
    if (this._isOpen()) this.close();
    else this.open();
  }

  setQuery(query: string): void {
    this._query.set(query);
    this._activeKey.set(null);
    this.input$.next({ query, chip: this._chip() });
  }

  setChip(chip: string | null): void {
    this._chip.set(chip);
    this._activeKey.set(null);
    this.input$.next({ query: this._query(), chip });
  }

  cycleChip(direction: 1 | -1): void {
    const chips = this.chips();
    if (chips.length < 2) return;
    const index = chips.findIndex((c) => c.id === this._chip());
    this.setChip(chips[(index + direction + chips.length) % chips.length].id);
  }

  moveActive(delta: number): void {
    const options = this.options();
    if (options.length === 0) return;
    const n = options.length;
    const next = (((this.activeIndex() + delta) % n) + n) % n;
    this._activeKey.set(options[next].key);
  }

  setActive(key: string): void {
    this._activeKey.set(key);
  }

  retry(sourceId: string): void {
    this.retry$.next(sourceId);
  }

  /** Runs the action, records Recent, closes and emits `selected` (spec §5.9). */
  async select(option: SpotlightOption, modifiers: { newTab?: boolean } = {}): Promise<void> {
    if (option.kind === 'retry' || option.item === null) {
      this.retry(option.sourceId);
      return;
    }
    if (this.selecting !== null) return;
    const token = {};
    this.selecting = token;
    const session = this.session;
    const item = option.item;
    const source: SpotlightSource = this.regs().find((reg) => reg.source.id === option.sourceId)?.source ?? {
      id: option.sourceId,
      search: () => [],
    };
    const done = this.runAction(item.action, modifiers.newTab === true, source).then(
      () => null,
      (error: unknown) => ({ error }),
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const waited = new Promise<'waiting'>((resolve) => (timer = setTimeout(() => resolve('waiting'), RUN_WAIT_MS)));
    const first = await Promise.race([done, waited]);
    clearTimeout(timer);
    if (this.selecting === token) this.selecting = null;

    const finish = (outcome: { error: unknown } | null): void => {
      if (outcome === null) this.remember(item, option.sourceId);
      else this.report(outcome.error, source);
      // Don't close a palette the user opened again after this select().
      if (this.session === session) this.close();
      if (outcome === null) this.selectedSubject.next(item);
    };
    if (first !== 'waiting') {
      finish(first);
      return;
    }
    if (this.session === session) this.close();
    void done.then(finish);
  }

  private async runAction(action: SpotlightAction, newTab: boolean, source: SpotlightSource): Promise<void> {
    if ('run' in action) {
      await action.run();
      return;
    }
    if ('route' in action) {
      const router = this.router;
      if (!router) throw new Error('[ng-spotlight] a route action needs provideRouter()');
      const navigation =
        typeof action.route === 'string' ? router.navigateByUrl(action.route) : router.navigate(action.route);
      void navigation.catch((error: unknown) => this.report(error, source));
      return;
    }
    if (!isSafeUrl(action.url)) {
      throw new Error(`[ng-spotlight] blocked a url with an unsafe scheme: ${JSON.stringify(action.url)}`);
    }
    const view = this.document.defaultView;
    if (!view) return;
    if (action.newTab === true || newTab) view.open(action.url, '_blank', 'noopener');
    else view.location.assign(action.url);
  }

  private remember(item: SpotlightItem, sourceId: string): void {
    if ('run' in item.action) {
      const key = `${sourceId}::${item.id}`;
      this._resolvedRuns.update((runs) => new Map(runs).set(key, item));
    }
    const next = pushRecent(this._recent(), toRecentEntry(item, sourceId), this._settings.recentMax);
    this._recent.set(next);
    const storage = this._settings.storage;
    void Promise.resolve()
      .then(() => storage.save(next))
      .catch((error: unknown) => console.warn('[ng-spotlight] could not save recent items', error));
  }

  private async loadRecent(): Promise<void> {
    let loaded: unknown;
    try {
      loaded = await this._settings.storage.load();
    } catch (error) {
      console.warn('[ng-spotlight] could not load recent items', error);
      loaded = [];
    }
    const entries = Array.isArray(loaded)
      ? (loaded as unknown[]).filter(isRecentEntry).slice(0, this._settings.recentMax)
      : [];
    this._recent.set(entries);
    await this.resolveRunEntries(entries);
  }

  /** run() entries are stored without an action; look them up in their source by id. */
  private async resolveRunEntries(entries: readonly SpotlightRecentEntry[]): Promise<void> {
    const pending = entries.filter((e) => e.action === undefined && !this._resolvedRuns().has(`${e.sourceId}::${e.id}`));
    for (const sourceId of new Set(pending.map((e) => e.sourceId))) {
      const reg = this.regs().find((r) => r.source.id === sourceId);
      // Sources that need a query would be hit with an empty one just to open the palette.
      if (!reg || (reg.source.minLength ?? 0) > 0) continue;
      try {
        const result = await firstValueFrom(
          toObservableResult(
            reg.source.search('', { signal: new AbortController().signal, chip: null, injector: reg.injector }),
          ).pipe(timeout(reg.source.timeoutMs ?? DEFAULT_TIMEOUT_MS)),
        );
        const items = normalizeResult(result, reg.source.group ?? reg.source.id).flatMap((g) => g.items);
        this._resolvedRuns.update((runs) => {
          const next = new Map(runs);
          for (const item of items) next.set(`${sourceId}::${item.id}`, item);
          return next;
        });
      } catch {
        // An unresolvable run() entry stays hidden.
      }
    }
  }

  private restartEngine(): void {
    if (!this._isOpen()) return;
    this.engine?.unsubscribe();
    this.input$ = new BehaviorSubject<SpotlightQueryState>({ query: this._query(), chip: this._chip() });
    this.engine = createSearchEngine({
      sources: this.regs(),
      input$: this.input$,
      retry$: this.retry$,
      recentIds: (sourceId) =>
        new Set(this._recent().flatMap((entry) => (entry.sourceId === sourceId ? [entry.id] : []))),
      onError: (error, source) => this.report(error, source),
      learned: this.learnedGroups,
      placeholderLabel: (state) => (state === 'loading' ? this.texts.loading() : this.texts.error()),
    }).subscribe((groups) => {
      this._results.set(groups);
      if (this._chip() === null) this._chipGroups.set(chipsFrom(groups));
    });
  }

  private report(error: unknown, source: SpotlightSource): void {
    try {
      this._settings.onError(error, source);
    } catch (handlerError) {
      console.error('[ng-spotlight] onError threw', handlerError);
    }
  }
}
