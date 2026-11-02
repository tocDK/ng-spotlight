import { Directive, inject, input, TemplateRef } from '@angular/core';
import { SpotlightService } from './spotlight.service';
import type { SpotlightItem } from './types';

export interface SpotlightItemTemplateContext {
  $implicit: SpotlightItem;
  active: boolean;
  query: string;
}

export interface SpotlightEmptyTemplateContext {
  /** The current query. */
  $implicit: string;
}

/** `<ng-template spotlightItem="customers" let-item>`: row for one group; without a value: for every group. */
@Directive({ selector: '[spotlightItem]' })
export class SpotlightItemTemplate {
  readonly spotlightItem = input('');
  /** @internal */
  readonly template = inject<TemplateRef<SpotlightItemTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: SpotlightItemTemplate, _ctx: unknown): _ctx is SpotlightItemTemplateContext {
    return true;
  }
}

/** `<ng-template spotlightEmpty let-query>`: shown when a non-empty query has no results. */
@Directive({ selector: '[spotlightEmpty]' })
export class SpotlightEmptyTemplate {
  /** @internal */
  readonly template = inject<TemplateRef<SpotlightEmptyTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: SpotlightEmptyTemplate, _ctx: unknown): _ctx is SpotlightEmptyTemplateContext {
    return true;
  }
}

/** `<ng-template spotlightFooter>`: replaces the default key hints. */
@Directive({ selector: '[spotlightFooter]' })
export class SpotlightFooterTemplate {
  /** @internal */
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/** Opens the palette on click. `spotlightTrigger="#"` opens it with an initial query. */
@Directive({
  selector: '[spotlightTrigger]',
  host: { '(click)': 'open()', 'aria-haspopup': 'dialog' },
})
export class SpotlightTrigger {
  private readonly svc = inject(SpotlightService);
  readonly spotlightTrigger = input('');

  /** @internal */
  protected open(): void {
    this.svc.open(this.spotlightTrigger() || undefined);
  }
}
