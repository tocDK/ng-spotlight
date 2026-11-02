import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import type {
  SpotlightBadgeContext,
  SpotlightBadgeTone,
  SpotlightChipContext,
  SpotlightGroupHeaderContext,
  SpotlightInputContext,
  SpotlightRowContext,
} from '@tocdk-oss/ng-spotlight';
import { Chip } from 'primeng/chip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';

export type SpotlightPrimeTagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

export function toneToSeverity(tone: SpotlightBadgeTone | undefined): SpotlightPrimeTagSeverity {
  switch (tone) {
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    case 'warn':
      return 'warn';
    case 'danger':
      return 'danger';
    default:
      return 'secondary';
  }
}

/** Maps the core's --sp-* variables to PrimeNG design tokens, so presets and white-label themes apply. */
export const SPOTLIGHT_PRIMENG_CSS = `
.sp-primeng {
  --sp-bg: var(--p-content-background, #ffffff);
  --sp-fg: var(--p-text-color, #334155);
  --sp-muted: var(--p-text-muted-color, #64748b);
  --sp-accent: var(--p-primary-color, #10b981);
  --sp-accent-fg: var(--p-primary-contrast-color, #ffffff);
  --sp-active-bg: var(--p-content-hover-background, #f1f5f9);
  --sp-border: var(--p-content-border-color, #e2e8f0);
  --sp-radius: var(--p-content-border-radius, 6px);
  --sp-shadow: var(--p-overlay-modal-shadow, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  --sp-font: inherit;
}
.sp-primeng-backdrop { --sp-backdrop: var(--p-mask-background, rgba(0, 0, 0, 0.4)); background: var(--sp-backdrop); }
.sp-primeng .sp-input { padding: 12px; }
.sp-primeng .sp-primeng-field { display: block; flex: 1; }
.sp-primeng .sp-primeng-field input { width: 100%; box-sizing: border-box; }
.sp-primeng .sp-chip-button .p-chip.sp-primeng-chip-active { background: var(--p-primary-color); color: var(--p-primary-contrast-color); }
`;

@Component({
  selector: 'spotlight-primeng-input',
  imports: [IconField, InputIcon, InputText],
  encapsulation: ViewEncapsulation.None,
  styles: [SPOTLIGHT_PRIMENG_CSS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-iconfield class="sp-primeng-field">
      <p-inputicon><i class="pi pi-search" aria-hidden="true"></i></p-inputicon>
      <input
        pInputText
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        [id]="ctx().id"
        [value]="ctx().value"
        [attr.placeholder]="ctx().placeholder"
        [attr.aria-label]="ctx().label"
        [attr.aria-expanded]="ctx().expanded"
        [attr.aria-controls]="ctx().controls"
        [attr.aria-activedescendant]="ctx().activeDescendant"
        (input)="onInput($event)"
        (keydown)="ctx().onKeydown($event)"
      />
    </p-iconfield>
  `,
})
export class SpotlightPrimeNgInput {
  readonly ctx = input.required<SpotlightInputContext>();

  /** @internal */
  protected onInput(event: Event): void {
    this.ctx().onInput((event.target as HTMLInputElement).value);
  }
}

@Component({
  selector: 'spotlight-primeng-chip',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span aria-hidden="true"><p-chip [label]="ctx().label" [styleClass]="ctx().active ? 'sp-primeng-chip-active' : ''" /></span>`,
})
export class SpotlightPrimeNgChip {
  readonly ctx = input.required<SpotlightChipContext>();
}

@Component({
  selector: 'spotlight-primeng-group-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="sp-group-label">{{ ctx().label }}</span>
    @if (ctx().total !== undefined) {
      <!-- The separator keeps the group's accessible name readable: "Customers, 2". -->
      <span style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">, </span>
      <span class="sp-group-total">{{ ctx().total }}</span>
    }
    @if (ctx().loading) {
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
      @if (ctx().loadingText) {
        <span
          style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"
          >, {{ ctx().loadingText }}</span
        >
      }
    }
  `,
})
export class SpotlightPrimeNgGroupHeader {
  readonly ctx = input.required<SpotlightGroupHeaderContext>();
}

@Component({
  selector: 'spotlight-primeng-badge',
  imports: [Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p-tag [value]="ctx().badge.label" [severity]="severity()" />`,
})
export class SpotlightPrimeNgBadge {
  readonly ctx = input.required<SpotlightBadgeContext>();
  /** @internal */
  protected readonly severity = computed(() => toneToSeverity(this.ctx().badge.tone));
}

@Component({
  selector: 'spotlight-primeng-row',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let item = ctx().item;
    @if (item.icon) {
      <span class="sp-icon" aria-hidden="true"><i [class]="item.icon"></i></span>
    }
    <span class="sp-text">
      <span class="sp-title">{{ item.title }}</span>
      @if (item.subtitle) {
        <span class="sp-subtitle">{{ item.subtitle }}</span>
      }
    </span>
    @if (item.badges?.length) {
      <span class="sp-badges">
        @for (badge of item.badges ?? []; track $index) {
          <ng-container *ngComponentOutlet="ctx().badge; inputs: { ctx: { badge: badge } }" />
        }
      </span>
    }
  `,
})
export class SpotlightPrimeNgRow {
  readonly ctx = input.required<SpotlightRowContext>();
}
