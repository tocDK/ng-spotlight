import type { Injector } from '@angular/core';
import {
  catchError,
  combineLatest,
  filter,
  from,
  isObservable,
  map,
  merge,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  timeout,
  timer,
  withLatestFrom,
  type Subscription,
} from 'rxjs';
import { normalizeResult, type NormalizedGroup } from './normalize';
import { rankItems } from './rank';
import { DEFAULT_SPOTLIGHT_TEXTS } from './texts';
import type { SpotlightItem, SpotlightResult, SpotlightSource } from './types';

export const DEFAULT_TIMEOUT_MS = 5000;

export interface SpotlightRegisteredSource {
  source: SpotlightSource;
  injector: Injector;
  order: number;
}

export interface SpotlightQueryState {
  query: string;
  chip: string | null;
}

export interface SpotlightGroupState {
  /** `<sourceId>::<groupId>`: unique across sources. */
  key: string;
  id: string;
  label: string;
  total?: number;
  sourceId: string;
  items: SpotlightItem[];
  loading: boolean;
  /** null when the source answered; the error otherwise. */
  error: unknown;
}

export interface SpotlightEngineOptions {
  sources: readonly SpotlightRegisteredSource[];
  input$: Observable<SpotlightQueryState>;
  retry$: Observable<string>;
  recentIds: () => ReadonlySet<string>;
  onError: (error: unknown, source: SpotlightSource) => void;
  /**
   * Group labels learned from earlier answers. Pass the same map on every restart so a
   * group-less source keeps its header label across close/open.
   */
  learned?: SpotlightLearnedGroups;
  /**
   * Header label for a group-less source that has not answered yet: the `loading` text while
   * it loads, the `error` text when it failed. Defaults to the built-in English texts.
   */
  placeholderLabel?: (state: 'loading' | 'error') => string;
}

export interface SpotlightQueryPlan {
  query: string;
  only: SpotlightSource | null;
}

interface SourceState {
  groups: NormalizedGroup[];
  loading: boolean;
  error: unknown;
}

const IDLE: SourceState = { groups: [], loading: false, error: null };

/** sourceId → (groupId → label), learned from answers so chips can target multi-group sources. */
export type SpotlightLearnedGroups = Map<string, Map<string, string>>;
type LearnedGroups = SpotlightLearnedGroups;

export function planQuery(sources: readonly SpotlightRegisteredSource[], raw: string): SpotlightQueryPlan {
  const trimmed = raw.trim();
  const prefixed = sources
    .filter((reg) => typeof reg.source.prefix === 'string' && reg.source.prefix !== '')
    .sort((a, b) => (b.source.prefix as string).length - (a.source.prefix as string).length);
  for (const reg of prefixed) {
    const prefix = reg.source.prefix as string;
    if (trimmed.startsWith(prefix)) return { query: trimmed.slice(prefix.length).trim(), only: reg.source };
  }
  return { query: trimmed, only: null };
}

export function sortSources(sources: readonly SpotlightRegisteredSource[]): SpotlightRegisteredSource[] {
  return [...sources].sort(
    (a, b) => (a.source.priority ?? a.order) - (b.source.priority ?? b.order) || a.order - b.order,
  );
}

export function toObservableResult(result: ReturnType<SpotlightSource['search']>): Observable<SpotlightResult> {
  if (isObservable(result)) return result;
  if (typeof (result as { then?: unknown }).then === 'function') return from(result as PromiseLike<SpotlightResult>);
  return of(result as SpotlightResult);
}

function knownGroups(learned: LearnedGroups, source: SpotlightSource): Map<string, string> {
  let known = learned.get(source.id);
  if (!known) {
    known = new Map<string, string>(source.group ? [[source.group, source.group]] : []);
    learned.set(source.id, known);
  }
  return known;
}

/** Calls search() with a fresh AbortSignal that is aborted if the call is superseded. */
function callSource(reg: SpotlightRegisteredSource, query: string, chip: string | null): Observable<SpotlightResult> {
  return new Observable<SpotlightResult>((subscriber) => {
    const controller = new AbortController();
    let finished = false;
    let inner: Subscription | undefined;
    try {
      inner = toObservableResult(reg.source.search(query, { signal: controller.signal, chip, injector: reg.injector })).subscribe({
        next: (value) => subscriber.next(value),
        error: (error: unknown) => {
          finished = true;
          subscriber.error(error);
        },
        complete: () => {
          finished = true;
          subscriber.complete();
        },
      });
    } catch (error) {
      finished = true;
      subscriber.error(error);
    }
    return () => {
      if (!finished) controller.abort();
      inner?.unsubscribe();
    };
  });
}

function runSource(
  reg: SpotlightRegisteredSource,
  all: readonly SpotlightRegisteredSource[],
  input$: Observable<SpotlightQueryState>,
  options: SpotlightEngineOptions,
  learned: LearnedGroups,
): Observable<SourceState> {
  const source = reg.source;
  let last: NormalizedGroup[] = [];
  const retried$ = options.retry$.pipe(
    filter((id) => id === source.id),
    withLatestFrom(input$),
    map(([, state]) => state),
  );
  return merge(input$, retried$).pipe(
    switchMap((state): Observable<SourceState> => {
      const plan = planQuery(all, state.query);
      const known = knownGroups(learned, source);
      const eligible =
        (plan.only === null || plan.only === source) &&
        (state.chip === null || known.has(state.chip)) &&
        plan.query.length >= (source.minLength ?? 0);
      if (!eligible) {
        last = [];
        return of(IDLE);
      }
      const browseAll = plan.only !== null;
      const result$ = callSource(reg, plan.query, state.chip).pipe(
        timeout({ first: source.timeoutMs ?? DEFAULT_TIMEOUT_MS }),
        map((result): SourceState => {
          let groups = normalizeResult(result, source.group ?? source.id);
          for (const g of groups) known.set(g.id, g.label);
          if (state.chip !== null) groups = groups.filter((g) => g.id === state.chip);
          if (source.local === true && plan.query !== '') {
            const recent = options.recentIds();
            groups = groups.map((g) => ({ ...g, items: rankItems(g.items, plan.query, recent) }));
          }
          if (plan.query === '' && !browseAll) {
            groups = groups.map((g) => ({ ...g, items: g.items.filter((i) => i.suggested === true) }));
          }
          groups = groups.filter((g) => g.items.length > 0);
          last = groups;
          return { groups, loading: false, error: null };
        }),
        catchError((error: unknown) => {
          last = [];
          try {
            options.onError(error, source);
          } catch {
            // a throwing consumer callback must not take down other groups
          }
          return of<SourceState>({ groups: [], loading: false, error });
        }),
      );
      const debounceMs = source.debounceMs ?? 0;
      const delayed$ = debounceMs > 0 ? timer(debounceMs).pipe(switchMap(() => result$)) : result$;
      return delayed$.pipe(startWith<SourceState>({ groups: last, loading: true, error: null }));
    }),
  );
}

function toGroupStates(
  reg: SpotlightRegisteredSource,
  state: SourceState,
  learned: LearnedGroups,
  placeholderLabel: (state: 'loading' | 'error') => string,
): SpotlightGroupState[] {
  const source = reg.source;
  if (state.groups.length > 0) {
    return state.groups.map((g) => ({
      key: `${source.id}::${g.id}`,
      id: g.id,
      label: g.label,
      ...(g.total !== undefined ? { total: g.total } : {}),
      sourceId: source.id,
      items: g.items,
      loading: state.loading,
      error: null,
    }));
  }
  if (!state.loading && state.error === null) return [];
  // Placeholder header (spinner or error row) in the source's usual group. A group-less
  // source that never answered gets a neutral label, never its internal id.
  const known = learned.get(source.id);
  const id = source.group ?? (known && known.size > 0 ? [...known.keys()][0] : source.id);
  return [
    {
      key: `${source.id}::${id}`,
      id,
      label: known?.get(id) ?? placeholderLabel(state.error === null ? 'loading' : 'error'),
      sourceId: source.id,
      items: [],
      loading: state.loading,
      error: state.error,
    },
  ];
}

/** Streams the grouped results for every query emitted on input$ (spec §5). */
export function createSearchEngine(options: SpotlightEngineOptions): Observable<SpotlightGroupState[]> {
  const sources = sortSources(options.sources);
  if (sources.length === 0) return of([]);
  const learned: LearnedGroups = options.learned ?? new Map<string, Map<string, string>>();
  const placeholderLabel =
    options.placeholderLabel ?? ((state: 'loading' | 'error'): string => DEFAULT_SPOTLIGHT_TEXTS[state]);
  const input$ = options.input$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
  return combineLatest(
    sources.map((reg) =>
      runSource(reg, sources, input$, options, learned).pipe(map((state) => toGroupStates(reg, state, learned, placeholderLabel))),
    ),
  ).pipe(map((lists) => lists.flat()));
}
