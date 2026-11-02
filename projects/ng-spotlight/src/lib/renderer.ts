import { InjectionToken, type Type } from '@angular/core';
import type { SpotlightBadge, SpotlightItem } from './types';

/** Context of the `input` part. The part must copy every ARIA field onto its <input>. */
export interface SpotlightInputContext {
  id: string;
  value: string;
  placeholder: string;
  label: string;
  expanded: boolean;
  controls: string;
  activeDescendant: string | null;
  onInput: (value: string) => void;
  onKeydown: (event: KeyboardEvent) => void;
}

/** Context of the `chips` part (rendered once per chip, inside a host-owned <button>). */
export interface SpotlightChipContext {
  label: string;
  active: boolean;
}

export interface SpotlightGroupHeaderContext {
  label: string;
  total: number | undefined;
  loading: boolean;
  loadingText: string;
}

/** Context of the `row` part (rendered inside a host-owned role="option" element). */
export interface SpotlightRowContext {
  item: SpotlightItem;
  active: boolean;
  query: string;
  /** The badge part to render badges with (NgComponentOutlet, input `ctx: SpotlightBadgeContext`). */
  badge: Type<unknown>;
}

export interface SpotlightBadgeContext {
  badge: SpotlightBadge;
}

/**
 * Markup for each part of the palette. Every component takes one `ctx` input with the
 * part's context. Parts left out fall back to the core parts. `dialog` adds classes to the
 * overlay pane and backdrop (the core always owns the CDK overlay itself).
 */
export interface SpotlightRenderer {
  dialog?: { panelClass: string; backdropClass?: string };
  input?: Type<unknown>;
  chips?: Type<unknown>;
  groupHeader?: Type<unknown>;
  row?: Type<unknown>;
  badge?: Type<unknown>;
}

export const SPOTLIGHT_RENDERER = new InjectionToken<SpotlightRenderer>('SPOTLIGHT_RENDERER');
