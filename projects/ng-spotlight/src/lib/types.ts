import type { Injector, Signal } from '@angular/core';
import type { Observable } from 'rxjs';

/** Visual tone of a badge. The renderer maps it to its own colours. */
export type SpotlightBadgeTone = 'info' | 'success' | 'warn' | 'danger';

export interface SpotlightBadge {
  label: string;
  tone?: SpotlightBadgeTone;
}

/** What happens when an item is selected. */
export type SpotlightAction =
  { route: unknown[] | string } | { url: string; newTab?: boolean } | { run: () => void | Promise<void> };

export interface SpotlightItem {
  id: string;
  title: string;
  subtitle?: string;
  /** The renderer decides the meaning (CSS class name, image URL, …). */
  icon?: string;
  group: string;
  keywords?: string[];
  badges?: SpotlightBadge[];
  /** Shown on an empty query. */
  suggested?: boolean;
  /** Free payload for custom templates. */
  data?: unknown;
  action: SpotlightAction;
  /** Reserved for nested pages (v1.x). Must be absent in v1: items that set it are dropped. */
  children?: never;
}

/** An item as written for staticSource(): `group` falls back to the source's group. */
export type SpotlightItemInput = Omit<SpotlightItem, 'group'> & { group?: string };

export interface SpotlightGroup {
  id: string;
  label: string;
  total?: number;
  items: SpotlightItem[];
}

export interface SpotlightResponse {
  groups: SpotlightGroup[];
}

export type SpotlightResult = SpotlightItem[] | SpotlightResponse;

export interface SpotlightContext {
  /** Aborted when the next keystroke supersedes this search. */
  signal: AbortSignal;
  /** Group id of the active chip, or null for "All". */
  chip: string | null;
  /** Environment injector of the provideSpotlight() call that registered the source. */
  injector: Injector;
}

export interface SpotlightSource {
  id: string;
  /** Default group for items that do not set one. */
  group?: string;
  /** e.g. '#', '@'. When the query starts with it, only this source runs. */
  prefix?: string;
  /** Default 0 (httpSource: 2). */
  minLength?: number;
  /** Default 0 (httpSource: 150). */
  debounceMs?: number;
  /** Default 5000. */
  timeoutMs?: number;
  /** Group order; lower comes first. Default: registration order. */
  priority?: number;
  /** true: the library ranks and filters the results. false (default): keep the source's order. */
  local?: boolean;
  search(
    query: string,
    ctx: SpotlightContext,
  ): Observable<SpotlightResult> | Promise<SpotlightResult> | SpotlightResult;
}

export type SpotlightTextValue = string | Signal<string> | Observable<string>;

export interface SpotlightTexts {
  placeholder: SpotlightTextValue;
  all: SpotlightTextValue;
  recent: SpotlightTextValue;
  noResults: SpotlightTextValue;
  loading: SpotlightTextValue;
  error: SpotlightTextValue;
  retry: SpotlightTextValue;
  /** Called inside a computed: reading signals here makes the announcement reactive. */
  resultsAnnouncement: (count: number) => string;
  hintNavigate: SpotlightTextValue;
  hintOpen: SpotlightTextValue;
  hintClose: SpotlightTextValue;
}

export interface SpotlightHttpRequest {
  method?: string;
  params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
  headers?: Record<string, string | string[]>;
  body?: unknown;
}

export interface SpotlightHttpOptions {
  request?: (query: string, ctx: SpotlightContext) => SpotlightHttpRequest;
  map?: (response: unknown, query: string) => SpotlightResult;
}

/** The serialisable subset of SpotlightAction. */
export type SpotlightStoredAction = { route: unknown[] | string } | { url: string; newTab?: boolean };

export interface SpotlightRecentEntry {
  id: string;
  title: string;
  group: string;
  sourceId: string;
  subtitle?: string;
  icon?: string;
  badges?: SpotlightBadge[];
  /** Absent for run() items: those are resolved through their source by id. */
  action?: SpotlightStoredAction;
}

export interface SpotlightRecentStorage {
  load(): Promise<SpotlightRecentEntry[]>;
  save(items: SpotlightRecentEntry[]): Promise<void>;
}

export interface SpotlightConfig {
  /** Default ['ctrl.space', 'mod.k']. 'mod' = Cmd on macOS, Ctrl elsewhere. */
  hotkeys?: string[];
  texts?: Partial<SpotlightTexts>;
  recent?: { max?: number; storage?: SpotlightRecentStorage };
  /** Global defaults for every httpSource registered by this call (inherited by child calls). */
  http?: SpotlightHttpOptions;
  theme?: 'default' | 'none';
  onError?: (error: unknown, source: SpotlightSource) => void;
  sources?: SpotlightSource[];
  /** true: create a separate palette instead of adding sources to the parent injector's one. */
  isolated?: boolean;
}
