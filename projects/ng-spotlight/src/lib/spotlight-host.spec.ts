import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, provideZonelessChangeDetection, type Provider, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { throwError } from 'rxjs';
import { provideSpotlight } from './provide-spotlight';
import { staticSource } from './sources/static-source';
import { SpotlightHost } from './spotlight-host';
import { SpotlightService } from './spotlight.service';
import { SpotlightEmptyTemplate, SpotlightFooterTemplate, SpotlightItemTemplate, SpotlightTrigger } from './templates';
import { expectNoAxeViolations, flush, memoryRecent } from './testing.spec-util';
import type { SpotlightConfig, SpotlightSource } from './types';

@Component({
  imports: [SpotlightHost, SpotlightTrigger],
  template: `
    <button id="trigger" type="button" spotlightTrigger>Search</button>
    <button id="hash" type="button" spotlightTrigger="#">Orders</button>
    <spotlight-host />
  `,
})
class PlainWrapper {}

@Component({
  imports: [SpotlightHost, SpotlightItemTemplate, SpotlightEmptyTemplate, SpotlightFooterTemplate],
  template: `
    <spotlight-host>
      <ng-template spotlightItem="Orders" let-item let-active="active">
        <span class="tpl-orders" [class.is-active]="active">#{{ item.title }}</span>
      </ng-template>
      <ng-template spotlightItem let-item><span class="tpl-fallback">{{ item.title }}</span></ng-template>
      <ng-template spotlightEmpty let-query><span class="tpl-empty">Nothing for "{{ query }}"</span></ng-template>
      <ng-template spotlightFooter><span class="tpl-footer">Custom footer</span></ng-template>
    </spotlight-host>
  `,
})
class TemplatedWrapper {}

const pages = staticSource({
  group: 'Pages',
  items: [
    { id: 'dash', title: 'Dashboard', suggested: true, icon: 'pi pi-home', action: { route: '/dashboard' } },
    { id: 'cust', title: 'Customers', badges: [{ label: 'new', tone: 'success' }], action: { route: '/customers' } },
  ],
});
const orders = staticSource({ group: 'Orders', prefix: '#', items: [{ id: '1001', title: 'Order 1001', action: { route: '/orders/1001' } }] });

async function setup(config: SpotlightConfig = {}, wrapper: Type<unknown> = PlainWrapper, providers: Provider[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideSpotlight({ recent: { storage: memoryRecent() }, sources: [pages, orders], ...config }),
      ...providers,
    ],
  });
  const fixture = TestBed.createComponent(wrapper);
  await fixture.whenStable();
  const svc = TestBed.inject(SpotlightService);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const stable = async () => {
    await flush();
    await fixture.whenStable();
  };
  return { fixture, svc, navigate, stable };
}

const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const qa = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector));
const combobox = () => q<HTMLInputElement>('[role="combobox"]')!;
const rowTitles = () => qa('[role="option"] .sp-title').map((e) => e.textContent);

function typeInto(text: string): void {
  const input = combobox();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function press(target: EventTarget, init: KeyboardEventInit): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove('sp-dark');
});

describe('SpotlightHost', () => {
  it('renders the combobox pattern and focuses the input when opened', async () => {
    const { svc, stable } = await setup();
    svc.open();
    await stable();
    const input = combobox();
    const listbox = q('[role="listbox"]')!;
    const options = qa('[role="option"]');
    expect(q('[role="dialog"]')!.getAttribute('aria-modal')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(rowTitles()).toEqual(['Dashboard']);
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id);
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(q('[role="group"]')!.getAttribute('aria-labelledby')).toBe(q('.sp-group-header')!.id);
    expect(document.activeElement).toBe(input);
  });

  it('navigates with the arrow keys, selects with Enter and restores focus', async () => {
    const { navigate, stable } = await setup();
    const trigger = q<HTMLButtonElement>('#trigger')!;
    trigger.focus();
    trigger.click();
    await stable();
    typeInto('o');
    await stable();
    expect(rowTitles()).toEqual(['Dashboard', 'Customers', 'Order 1001']);
    press(combobox(), { key: 'ArrowDown' });
    await stable();
    const active = document.getElementById(combobox().getAttribute('aria-activedescendant')!)!;
    expect(active.querySelector('.sp-title')!.textContent).toBe('Customers');
    press(combobox(), { key: 'ArrowUp' });
    press(combobox(), { key: 'ArrowUp' });
    await stable();
    expect(document.getElementById(combobox().getAttribute('aria-activedescendant')!)!.textContent).toContain('Order 1001');
    press(combobox(), { key: 'Enter' });
    await stable();
    expect(navigate).toHaveBeenCalledWith('/orders/1001');
    expect(q('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('selects with a mouse click', async () => {
    const { svc, navigate, stable } = await setup();
    svc.open('cust');
    await stable();
    qa('[role="option"]')[0].click();
    await stable();
    expect(navigate).toHaveBeenCalledWith('/customers');
  });

  it('closes on Escape and on a backdrop click', async () => {
    const { svc, stable } = await setup();
    svc.open();
    await stable();
    press(combobox(), { key: 'Escape' });
    await stable();
    expect(svc.isOpen()).toBe(false);
    expect(q('[role="dialog"]')).toBeNull();
    svc.open();
    await stable();
    q('.cdk-overlay-backdrop')!.click();
    await stable();
    expect(svc.isOpen()).toBe(false);
  });

  it('toggles on the hotkeys and ignores IME composition', async () => {
    const { svc, stable } = await setup();
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true });
    await stable();
    expect(svc.isOpen()).toBe(true);
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true });
    await stable();
    expect(svc.isOpen()).toBe(false);
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true, isComposing: true });
    await stable();
    expect(svc.isOpen()).toBe(false);
    press(document.body, { key: 'k', code: 'KeyK', ctrlKey: true });
    await stable();
    expect(svc.isOpen()).toBe(true);
  });

  it('keeps a single overlay under key repeat and repeated open()', async () => {
    const { svc, stable } = await setup();
    const trigger = q<HTMLButtonElement>('#trigger')!;
    trigger.focus();
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true });
    await stable();
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true, repeat: true });
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true, repeat: true });
    await stable();
    expect(svc.isOpen()).toBe(true);
    svc.open();
    svc.open('dash');
    await stable();
    expect(qa('.sp-pane')).toHaveLength(1);
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true });
    await stable();
    expect(qa('.sp-pane')).toHaveLength(0);
    expect(document.activeElement).toBe(trigger);
    svc.open();
    svc.close();
    svc.open();
    await stable();
    expect(qa('.sp-pane')).toHaveLength(1);
  });

  it('opens with the trigger value as the query', async () => {
    const { stable } = await setup();
    q<HTMLButtonElement>('#hash')!.click();
    await stable();
    expect(combobox().value).toBe('#');
    expect(rowTitles()).toEqual(['Order 1001']);
    expect(q('#hash')!.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('cycles chips with Tab and Shift+Tab', async () => {
    const { svc, stable } = await setup();
    svc.open();
    await stable();
    typeInto('o');
    await stable();
    const chips = () => qa('.sp-chip-button');
    expect(chips().map((c) => c.textContent?.trim())).toEqual(['All', 'Pages', 'Orders']);
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
    press(combobox(), { key: 'Tab' });
    await stable();
    expect(chips()[1].getAttribute('aria-pressed')).toBe('true');
    expect(rowTitles()).toEqual(['Dashboard', 'Customers']);
    press(combobox(), { key: 'Tab', shiftKey: true });
    await stable();
    expect(chips()[0].getAttribute('aria-pressed')).toBe('true');
    chips()[2].click();
    await stable();
    expect(rowTitles()).toEqual(['Order 1001']);
  });

  it('shows an error row with Retry that re-runs the source on Enter', async () => {
    let fail = true;
    const flaky: SpotlightSource = {
      id: 'flaky',
      group: 'Flaky',
      search: () =>
        fail ? throwError(() => new Error('down')) : [{ id: 'up', title: 'Back up', group: 'Flaky', suggested: true, action: { route: '/up' } }],
    };
    const { svc, stable } = await setup({ sources: [flaky], onError: () => undefined });
    svc.open();
    await stable();
    const row = qa('[role="option"]')[0];
    expect(row.textContent).toContain('Something went wrong');
    expect(row.textContent).toContain('Retry');
    fail = false;
    press(combobox(), { key: 'Enter' });
    await stable();
    expect(rowTitles()).toEqual(['Back up']);
  });

  it('uses per-group, fallback, empty and footer templates in that precedence', async () => {
    const { svc, stable } = await setup({}, TemplatedWrapper);
    svc.open();
    await stable();
    typeInto('o');
    await stable();
    expect(qa('.tpl-orders').map((e) => e.textContent)).toEqual(['#Order 1001']);
    expect(qa('.tpl-fallback').map((e) => e.textContent)).toEqual(['Dashboard', 'Customers']);
    expect(q('.tpl-fallback')!.closest('[role="option"]')).not.toBeNull();
    expect(q('.tpl-footer')).not.toBeNull();
    expect(q('.sp-footer kbd')).toBeNull();
    typeInto('zzz');
    await stable();
    expect(q('.tpl-empty')!.textContent).toBe('Nothing for "zzz"');
  });

  it('shows the default empty state, footer hints and live announcement', async () => {
    const { svc, stable } = await setup();
    svc.open();
    await stable();
    typeInto('o');
    await stable();
    expect(q('[role="status"]')!.textContent.trim()).toBe('3 results');
    expect(qa('.sp-footer kbd').map((k) => k.textContent)).toEqual(['↑', '↓', '↵', 'esc']);
    typeInto('zzz');
    await stable();
    expect(q('.sp-empty')!.textContent.trim()).toBe('No results');
    expect(q('[role="status"]')!.textContent.trim()).toBe('No results');
  });

  it('becomes a full-screen sheet at phone width', async () => {
    const { svc, stable } = await setup({}, PlainWrapper, [{ provide: BreakpointObserver, useValue: { isMatched: () => true } }]);
    svc.open();
    await stable();
    expect(q('.sp-pane')!.classList).toContain('sp-sheet');
  });

  it("loads the default theme, and no theme for theme: 'none'", async () => {
    const first = await setup();
    first.svc.open();
    await first.stable();
    expect(q('.sp-pane')!.classList).toContain('sp-theme-default');
    expect(q('.cdk-overlay-backdrop')!.classList).toContain('sp-theme-default');
    expect(q('spotlight-theme-default')).not.toBeNull();
    first.fixture.destroy();
    TestBed.resetTestingModule();

    const second = await setup({ theme: 'none' });
    second.svc.open();
    await second.stable();
    expect(q('.sp-pane')!.classList).not.toContain('sp-theme-default');
    expect(q('spotlight-theme-default')).toBeNull();
  });

  it('renders badges through the default row inside the overlay', async () => {
    const { svc, stable } = await setup();
    svc.open('cust');
    await stable();
    expect(q('[role="option"] .sp-badge')!.textContent.trim()).toBe('new');
  });

  it('keeps a loading group header with a spinner and gives Recent options valid unique ids', async () => {
    const slow: SpotlightSource = { id: 'slow', group: 'Slow', search: () => new Promise<never[]>(() => undefined) };
    const { svc, navigate, stable } = await setup({ sources: [pages, slow] });
    svc.open();
    await stable();
    typeInto('d');
    await stable();
    const headers = qa('.sp-group-header').map((h) => h.textContent.trim());
    expect(headers.some((h) => h.includes('Slow'))).toBe(true);
    expect(q('.sp-group-header [role="progressbar"], .sp-group-header .sp-spinner')).not.toBeNull();
    qa('[role="option"]')[0].click();
    await stable();
    expect(navigate).toHaveBeenCalled();
    svc.open();
    await stable();
    const ids = qa('[role="option"]').map((o) => o.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z][\w-]*$/);
  });

  it.each(['light', 'dark'])('has no axe violations with the open overlay (%s)', async (mode) => {
    document.documentElement.classList.toggle('sp-dark', mode === 'dark');
    const { svc, stable } = await setup();
    svc.open();
    await stable();
    typeInto('o');
    await stable();
    await expectNoAxeViolations();
  });
});
