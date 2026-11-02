import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  localStorageRecent,
  provideSpotlight,
  SPOTLIGHT_RENDERER,
  SpotlightHost,
  SpotlightTrigger,
  type SpotlightBadgeContext,
  type SpotlightRenderer,
  type SpotlightRowContext,
} from '@tocdk/ng-spotlight';
import { demoSources } from '../shared/demo-data';

/** A row part: markup only; it renders badges through the badge part it is given. The host already provides role="option", ids and aria-selected. */
@Component({
  selector: 'app-compact-row',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: flex; flex: 1; justify-content: space-between; gap: 12px; }
    .group { color: var(--sp-muted); font-size: 12px; }
  `,
  template: `
    <span>{{ ctx().item.title }}</span>
    <span class="group">{{ ctx().item.group }}</span>
    @for (badge of ctx().item.badges ?? []; track $index) {
      <ng-container *ngComponentOutlet="ctx().badge; inputs: { ctx: { badge: badge } }" />
    }
  `,
})
export class CompactRow {
  readonly ctx = input.required<SpotlightRowContext>();
}

/** A badge part. Rows that keep the core row render badges through it. */
@Component({
  selector: 'app-dot-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `● {{ ctx().badge.label }}`,
})
export class DotBadge {
  readonly ctx = input.required<SpotlightBadgeContext>();
}

// A starter adapter: replace any subset of dialog/input/chips/groupHeader/row/badge.
const compactRenderer: SpotlightRenderer = { row: CompactRow, badge: DotBadge };

export const byoRendererProviders = [
  provideSpotlight({ isolated: true, hotkeys: [], recent: { storage: localStorageRecent('example-byo-renderer') }, sources: demoSources() }),
  { provide: SPOTLIGHT_RENDERER, useValue: compactRenderer },
];

@Component({
  selector: 'app-byo-renderer-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Open with a custom row part</button>
    <spotlight-host />
  `,
})
export class ByoRendererExample {}
