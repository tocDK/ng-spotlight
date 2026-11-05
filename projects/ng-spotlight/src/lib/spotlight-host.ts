import { FocusTrapFactory, type FocusTrap } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT, NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  DestroyRef,
  effect,
  inject,
  Injector,
  TemplateRef,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { SpotlightHotkeyArbiter, type SpotlightHotkeyClient } from './hotkey-arbiter';
import { matchesHotkey } from './hotkeys';
import { resolveParts } from './parts/default-parts';
import { SpotlightDefaultTheme } from './parts/default-theme';
import { SPOTLIGHT_RENDERER, type SpotlightInputContext } from './renderer';
import { SpotlightService, type SpotlightOption } from './spotlight.service';
import {
  SpotlightEmptyTemplate,
  SpotlightFooterTemplate,
  SpotlightItemTemplate,
  type SpotlightItemTemplateContext,
} from './templates';

const PHONE_QUERY = '(max-width: 600px)';

/** The palette. Place it once in the app shell. */
@Component({
  selector: 'spotlight-host',
  imports: [NgComponentOutlet, NgTemplateOutlet, SpotlightDefaultTheme],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
  template: `
    @if (themeDefault) {
      <spotlight-theme-default />
    }
    <ng-template #panel>
      <div class="sp-dialog" role="dialog" aria-modal="true" [attr.aria-label]="texts.placeholder()" (mousedown)="onPanelMousedown($event)">
        <div class="sp-input">
          <ng-container *ngComponentOutlet="parts.input; inputs: { ctx: inputCtx() }" />
        </div>
        @if (svc.chips().length > 1) {
          <div class="sp-chips">
            @for (chip of svc.chips(); track chip.id ?? '') {
              <button
                type="button"
                class="sp-chip-button"
                tabindex="-1"
                [attr.aria-pressed]="chip.id === svc.chip()"
                [attr.aria-label]="chip.label"
                (click)="svc.setChip(chip.id)"
              >
                <ng-container
                  *ngComponentOutlet="parts.chips; inputs: { ctx: { label: chip.label, active: chip.id === svc.chip() } }"
                />
              </button>
            }
          </div>
        }
        <div class="sp-list" role="listbox" tabindex="-1" [attr.aria-busy]="svc.loading() || null" [id]="ids.listbox" [attr.aria-label]="texts.placeholder()">
          @for (group of svc.groups(); track group.key; let g = $index) {
            <div class="sp-group" role="group" [attr.aria-labelledby]="ids.prefix + '-g' + g">
              <div class="sp-group-header" [id]="ids.prefix + '-g' + g">
                <ng-container
                  *ngComponentOutlet="
                    parts.groupHeader;
                    inputs: { ctx: { label: group.label, total: group.total, loading: group.loading, loadingText: loadingTextFor(group.label) } }
                  "
                />
              </div>
              @for (opt of optionsByGroup().get(group.key) ?? []; track opt.key) {
                <div
                  class="sp-option"
                  role="option"
                  [id]="opt.domId"
                  [attr.aria-selected]="opt.domId === activeId()"
                  (mousemove)="svc.setActive(opt.key)"
                  (click)="choose(opt, $event)"
                >
                  @if (opt.item; as item) {
                    @let rowTemplate = templateFor(item.group);
                    @if (rowTemplate) {
                      <ng-container
                        *ngTemplateOutlet="rowTemplate; context: { $implicit: item, active: opt.domId === activeId(), query: svc.query() }"
                      />
                    } @else {
                      <ng-container
                        *ngComponentOutlet="
                          parts.row;
                          inputs: { ctx: { item: item, active: opt.domId === activeId(), query: svc.query(), badge: parts.badge } }
                        "
                      />
                    }
                  } @else {
                    <span class="sp-error">{{ texts.error() }}</span>
                    <span class="sp-retry">{{ texts.retry() }}</span>
                  }
                </div>
              }
            </div>
          }
        </div>
        @if (showEmpty()) {
          <div class="sp-empty">
            @if (emptyTemplate(); as empty) {
              <ng-container *ngTemplateOutlet="empty.template; context: { $implicit: svc.query() }" />
            } @else {
              {{ texts.noResults() }}
            }
          </div>
        }
        <div class="sp-footer">
          @if (footerTemplate(); as footer) {
            <ng-container *ngTemplateOutlet="footer.template" />
          } @else {
            <span><kbd>↑</kbd><kbd>↓</kbd> {{ texts.hintNavigate() }}</span>
            <span><kbd>↵</kbd> {{ texts.hintOpen() }}</span>
            <span><kbd>esc</kbd> {{ texts.hintClose() }}</span>
          }
        </div>
        <div
          role="status"
          aria-live="polite"
          style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"
        >
          {{ svc.announcement() }}
        </div>
      </div>
    </ng-template>
  `,
})
export class SpotlightHost {
  /** @internal */
  protected readonly svc = inject(SpotlightService);
  private readonly overlay = inject(Overlay);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly arbiter = inject(SpotlightHotkeyArbiter);
  private readonly hotkeyClient: SpotlightHotkeyClient = {
    hotkeys: () => this.svc.settings.hotkeys,
    isOpen: () => this.svc.isOpen(),
    openedAt: 0,
  };

  /** @internal */
  protected readonly parts = resolveParts(inject(SPOTLIGHT_RENDERER, { optional: true }));
  /** @internal */
  protected readonly themeDefault = this.svc.settings.theme === 'default';
  /** @internal */
  protected readonly ids = {
    prefix: this.svc.idPrefix,
    input: `${this.svc.idPrefix}-input`,
    listbox: `${this.svc.idPrefix}-listbox`,
  };

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private readonly itemTemplates = contentChildren(SpotlightItemTemplate);
  /** @internal */
  protected readonly emptyTemplate = contentChild(SpotlightEmptyTemplate);
  /** @internal */
  protected readonly footerTemplate = contentChild(SpotlightFooterTemplate);

  private overlayRef: OverlayRef | null = null;
  private focusTrap: FocusTrap | null = null;
  private restoreFocus: HTMLElement | null = null;

  /** @internal */
  protected readonly activeId = computed(() => this.svc.activeOption()?.domId ?? null);

  /** @internal */
  protected readonly optionsByGroup = computed(() => {
    const byGroup = new Map<string, SpotlightOption[]>();
    for (const option of this.svc.options()) {
      const list = byGroup.get(option.groupKey) ?? [];
      list.push(option);
      byGroup.set(option.groupKey, list);
    }
    return byGroup;
  });

  /** @internal */
  protected readonly showEmpty = computed(
    () => this.svc.query().trim() !== '' && this.svc.options().length === 0 && !this.svc.loading(),
  );

  private readonly handleInput = (value: string): void => this.svc.setQuery(value);
  private readonly handleKeydown = (event: KeyboardEvent): void => this.onInputKeydown(event);

  /** @internal */
  protected readonly inputCtx = computed<SpotlightInputContext>(() => ({
    id: this.ids.input,
    value: this.svc.query(),
    placeholder: this.texts.placeholder(),
    label: this.texts.placeholder(),
    expanded: this.svc.options().length > 0 || this.svc.loading(),
    controls: this.ids.listbox,
    activeDescendant: this.activeId(),
    onInput: this.handleInput,
    onKeydown: this.handleKeydown,
  }));

  constructor() {
    const unregister = this.arbiter.register(this.hotkeyClient);
    effect(() => {
      const open = this.svc.isOpen();
      untracked(() => {
        if (open) {
          this.arbiter.opened(this.hotkeyClient);
          this.attach();
        } else {
          this.detach();
        }
      });
    });
    afterRenderEffect(() => {
      const id = this.activeId();
      if (id === null || this.overlayRef === null) return;
      this.document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
    });
    inject(DestroyRef).onDestroy(() => {
      unregister();
      this.svc.close();
      this.detach();
    });
  }

  /** @internal */
  protected get texts() {
    return this.svc.texts;
  }

  /** @internal A placeholder header already reads "Loading…"; don't announce it twice. */
  protected loadingTextFor(label: string): string {
    const loading = this.texts.loading();
    return label === loading ? '' : loading;
  }

  /** @internal */
  protected templateFor(groupId: string): TemplateRef<SpotlightItemTemplateContext> | null {
    const templates = this.itemTemplates();
    const match =
      templates.find((t) => t.spotlightItem() === groupId) ?? templates.find((t) => t.spotlightItem() === '');
    return match?.template ?? null;
  }

  /** @internal */
  protected choose(option: SpotlightOption, event: MouseEvent): void {
    void this.svc.select(option, { newTab: event.ctrlKey || event.metaKey });
  }

  /** @internal A press on a non-editable part of the palette must not move keyboard focus out of the field. */
  protected onPanelMousedown(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
  }

  /** @internal */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.svc.settings.hotkeys.some((hotkey) => matchesHotkey(event, hotkey))) return;
    event.preventDefault();
    if (event.repeat) return;
    // With several palettes on the page, exactly one reacts (see SpotlightHotkeyArbiter).
    if (this.arbiter.handler(event) !== this.hotkeyClient) return;
    this.svc.toggle();
  }

  private onInputKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.svc.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.svc.moveActive(-1);
        break;
      case 'Enter': {
        event.preventDefault();
        const option = this.svc.activeOption();
        if (option) void this.svc.select(option, { newTab: event.ctrlKey || event.metaKey });
        break;
      }
      case 'Tab':
        if (this.svc.chips().length > 1) {
          event.preventDefault();
          this.svc.cycleChip(event.shiftKey ? -1 : 1);
        }
        break;
    }
  }

  private attach(): void {
    if (this.overlayRef) return;
    const active = this.document.activeElement;
    this.restoreFocus = active instanceof HTMLElement ? active : null;
    const sheet = this.breakpoints.isMatched(PHONE_QUERY);
    const theme = this.themeDefault ? ['sp-theme-default'] : [];
    const position = this.overlay.position().global();
    const ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: ['sp-backdrop', ...theme, ...(this.parts.backdropClass ? [this.parts.backdropClass] : [])],
      panelClass: ['sp-pane', ...theme, ...(sheet ? ['sp-sheet'] : []), ...(this.parts.panelClass ? [this.parts.panelClass] : [])],
      positionStrategy: sheet ? position.top('0').left('0') : position.centerHorizontally().top('12vh'),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      width: sheet ? '100vw' : 'min(640px, calc(100vw - 32px))',
      height: sheet ? '100dvh' : undefined,
    });
    ref.attach(new TemplatePortal(this.panel(), this.viewContainerRef));
    ref.backdropClick().subscribe(() => this.svc.close());
    ref.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.svc.close();
      }
    });
    this.focusTrap = this.focusTrapFactory.create(ref.overlayElement);
    this.overlayRef = ref;
    afterNextRender(() => this.overlayRef?.overlayElement.querySelector<HTMLElement>('[role="combobox"]')?.focus(), {
      injector: this.injector,
    });
  }

  private detach(): void {
    if (!this.overlayRef) return;
    this.focusTrap?.destroy();
    this.focusTrap = null;
    this.overlayRef.dispose();
    this.overlayRef = null;
    const target = this.restoreFocus;
    this.restoreFocus = null;
    if (target?.isConnected) target.focus();
  }
}
