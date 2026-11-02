import { Injector, isSignal, signal, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, isObservable, of } from 'rxjs';
import type { SpotlightTexts, SpotlightTextValue } from './types';

export type SpotlightTextKey = Exclude<keyof SpotlightTexts, 'resultsAnnouncement'>;

export const SPOTLIGHT_TEXT_KEYS: readonly SpotlightTextKey[] = [
  'placeholder',
  'all',
  'recent',
  'noResults',
  'loading',
  'error',
  'retry',
  'hintNavigate',
  'hintOpen',
  'hintClose',
];

export const DEFAULT_SPOTLIGHT_TEXTS: { readonly [K in SpotlightTextKey]: string } & {
  readonly resultsAnnouncement: (count: number) => string;
} = {
  placeholder: 'Search…',
  all: 'All',
  recent: 'Recent',
  noResults: 'No results',
  loading: 'Loading…',
  error: 'Something went wrong',
  retry: 'Retry',
  hintNavigate: 'to navigate',
  hintOpen: 'to open',
  hintClose: 'to close',
  resultsAnnouncement: (count) => (count === 0 ? 'No results' : count === 1 ? '1 result' : `${count} results`),
};

export type ResolvedSpotlightTexts = { readonly [K in SpotlightTextKey]: Signal<string> } & {
  readonly resultsAnnouncement: (count: number) => string;
};

function toTextSignal(value: SpotlightTextValue | undefined, fallback: string, injector: Injector): Signal<string> {
  if (value === undefined) return signal(fallback).asReadonly();
  if (isSignal(value)) return value;
  // An erroring source keeps the fallback; without this, toSignal rethrows on every read.
  if (isObservable(value)) {
    return toSignal(value.pipe(catchError(() => of(fallback))), { initialValue: fallback, injector });
  }
  return signal(value).asReadonly();
}

/** Every text becomes a Signal<string>; Observables are subscribed for the injector's lifetime. */
export function resolveTexts(texts: Partial<SpotlightTexts> | undefined, injector: Injector): ResolvedSpotlightTexts {
  const resolved = {} as Record<SpotlightTextKey, Signal<string>>;
  for (const key of SPOTLIGHT_TEXT_KEYS) {
    resolved[key] = toTextSignal(texts?.[key], DEFAULT_SPOTLIGHT_TEXTS[key], injector);
  }
  return {
    ...resolved,
    resultsAnnouncement: texts?.resultsAnnouncement ?? DEFAULT_SPOTLIGHT_TEXTS.resultsAnnouncement,
  };
}
