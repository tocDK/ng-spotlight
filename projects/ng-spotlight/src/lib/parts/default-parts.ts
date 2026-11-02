import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type Type } from '@angular/core';
import type {
  SpotlightBadgeContext,
  SpotlightChipContext,
  SpotlightGroupHeaderContext,
  SpotlightInputContext,
  SpotlightRenderer,
  SpotlightRowContext,
} from '../renderer';

@Component({
  selector: 'spotlight-default-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      class="sp-input-el"
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
  `,
})
export class SpotlightDefaultInput {
  readonly ctx = input.required<SpotlightInputContext>();

  /** @internal */
  protected onInput(event: Event): void {
    this.ctx().onInput((event.target as HTMLInputElement).value);
  }
}

@Component({
  selector: 'spotlight-default-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sp-chip" [class.sp-chip-active]="ctx().active">{{ ctx().label }}</span>`,
})
export class SpotlightDefaultChip {
  readonly ctx = input.required<SpotlightChipContext>();
}

@Component({
  selector: 'spotlight-default-group-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="sp-group-label">{{ ctx().label }}</span>
    @if (ctx().total !== undefined) {
      <!-- The separator keeps the group's accessible name readable: "Customers, 2". -->
      <span style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">, </span>
      <span class="sp-group-total">{{ ctx().total }}</span>
    }
    @if (ctx().loading) {
      <span class="sp-spinner" aria-hidden="true"></span>
      @if (ctx().loadingText) {
        <span
          style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"
          >, {{ ctx().loadingText }}</span
        >
      }
    }
  `,
})
export class SpotlightDefaultGroupHeader {
  readonly ctx = input.required<SpotlightGroupHeaderContext>();
}

@Component({
  selector: 'spotlight-default-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sp-badge" [attr.data-tone]="ctx().badge.tone ?? 'info'">{{ ctx().badge.label }}</span>`,
})
export class SpotlightDefaultBadge {
  readonly ctx = input.required<SpotlightBadgeContext>();
}

@Component({
  selector: 'spotlight-default-row',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let item = ctx().item;
    @if (item.icon) {
      <span class="sp-icon" aria-hidden="true">
        @if (isImage(item.icon)) {
          <img [src]="item.icon" alt="" />
        } @else {
          <i [class]="item.icon"></i>
        }
      </span>
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
export class SpotlightDefaultRow {
  readonly ctx = input.required<SpotlightRowContext>();

  /** @internal */
  protected isImage(icon: string): boolean {
    return /^(https?:|data:image\/|\/|\.)/.test(icon);
  }
}

export interface SpotlightResolvedParts {
  panelClass: string | null;
  backdropClass: string | null;
  input: Type<unknown>;
  chips: Type<unknown>;
  groupHeader: Type<unknown>;
  row: Type<unknown>;
  badge: Type<unknown>;
}

export function resolveParts(renderer: SpotlightRenderer | null): SpotlightResolvedParts {
  return {
    panelClass: renderer?.dialog?.panelClass ?? null,
    backdropClass: renderer?.dialog?.backdropClass ?? null,
    input: renderer?.input ?? SpotlightDefaultInput,
    chips: renderer?.chips ?? SpotlightDefaultChip,
    groupHeader: renderer?.groupHeader ?? SpotlightDefaultGroupHeader,
    row: renderer?.row ?? SpotlightDefaultRow,
    badge: renderer?.badge ?? SpotlightDefaultBadge,
  };
}
