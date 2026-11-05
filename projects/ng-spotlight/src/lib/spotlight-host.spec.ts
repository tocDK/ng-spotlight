import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ApplicationRef,
  Component,
  createComponent,
  createEnvironmentInjector,
  EnvironmentInjector,
  provideZonelessChangeDetection,
  type Provider,
  type Type,
} from '@angular/core';
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

@Component({
  imports: [SpotlightHost],
  template: `<spotlight-host /><spotlight-host />`,
})
class TwoHostsWrapper {}

/** A second, isolated palette with its own <spotlight-host>, attached to the test application. */
function isolatedPalette(config: SpotlightConfig = {}) {
  const env = createEnvironmentInjector(
    [provideSpotlight({ isolated: true, recent: { storage: memoryRecent() }, sources: [pages], ...config })],
    TestBed.inject(EnvironmentInjector),
  );
  const ref = createComponent(SpotlightHost, { environmentInjector: env });
  TestBed.inject(ApplicationRef).attachView(ref.hostView);
  document.body.appendChild(ref.location.nativeElement as HTMLElement);
  return {
    svc: env.get(SpotlightService),
    destroy: () => {
      ref.destroy();
      env.destroy();
    },
  };
}

const hotkey = () => press(document.body, { key: ' ', code: 'Space', ctrlKey: true });

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

  describe('with several palettes on the page', () => {
    it('lets only the first palette react to a shared hotkey until another one is opened', async () => {
      const { svc: root, stable } = await setup();
      const other = isolatedPalette();
      hotkey();
      await stable();
      expect([root.isOpen(), other.svc.isOpen()]).toEqual([true, false]);
      expect(qa('.sp-pane')).toHaveLength(1);
      hotkey();
      await stable();
      expect([root.isOpen(), other.svc.isOpen()]).toEqual([false, false]);
      other.destroy();
    });

    it('hands the hotkey to the palette opened most recently, and the open one always closes first', async () => {
      const { svc: root, stable } = await setup();
      const other = isolatedPalette();
      other.svc.open();
      await stable();
      other.svc.close();
      await stable();
      hotkey();
      await stable();
      expect([root.isOpen(), other.svc.isOpen()]).toEqual([false, true]);
      hotkey();
      await stable();
      expect([root.isOpen(), other.svc.isOpen()]).toEqual([false, false]);
      root.open();
      await stable();
      hotkey();
      await stable();
      expect([root.isOpen(), other.svc.isOpen()]).toEqual([false, false]);
      hotkey();
      await stable();
      expect([root.isOpen(), other.svc.isOpen()]).toEqual([true, false]);
      other.destroy();
    });

    it('skips palettes whose hotkeys do not match, and destroyed palettes', async () => {
      const { svc: root, stable } = await setup({ hotkeys: ['mod.k'] });
      const other = isolatedPalette();
      hotkey();
      await stable();
      expect([root.isOpen(), other.svc.isOpen()]).toEqual([false, true]);
      hotkey();
      await stable();
      other.destroy();
      press(document.body, { key: 'k', code: 'KeyK', ctrlKey: true });
      await stable();
      expect(root.isOpen()).toBe(true);
    });

    it('toggles a palette once when two hosts share its service', async () => {
      const { svc, stable } = await setup({}, TwoHostsWrapper);
      hotkey();
      await stable();
      expect(svc.isOpen()).toBe(true);
      hotkey();
      await stable();
      expect(svc.isOpen()).toBe(false);
    });
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

  describe('mousedown keeps keyboard focus in the search field', () => {
    /** Presses the mouse on `target` and reports whether the focus-moving default was cancelled. */
    function mousedownPrevented(target: Element): boolean {
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    }

    async function openWithResults() {
      const { svc, stable } = await setup();
      svc.open();
      await stable();
      typeInto('o');
      await stable();
    }

    it('cancels it on the footer', async () => {
      await openWithResults();
      expect(mousedownPrevented(q('.sp-footer')!)).toBe(true);
    });

    it('cancels it on the blank listbox itself', async () => {
      await openWithResults();
      expect(mousedownPrevented(q('[role="listbox"]')!)).toBe(true);
    });

    it('leaves the search input its mouse defaults', async () => {
      await openWithResults();
      expect(mousedownPrevented(combobox())).toBe(false);
    });

    it('still cancels it on an option row', async () => {
      await openWithResults();
      expect(mousedownPrevented(q('[role="option"]')!)).toBe(true);
    });

    it('still cancels it on a chip', async () => {
      await openWithResults();
      expect(qa('.sp-chip-button').length).toBeGreaterThan(1);
      expect(mousedownPrevented(q('.sp-chip-button')!)).toBe(true);
    });

    describe('editable parts keep their mouse defaults', () => {
      const editables: Record<string, string> = {
        textarea: '<textarea></textarea>',
        select: '<select><option>a</option></select>',
        'contenteditable=""': '<div contenteditable="">x</div>',
        'contenteditable="plaintext-only"': '<div contenteditable="plaintext-only">x</div>',
        'contenteditable="TRUE"': '<div contenteditable="TRUE">x</div>',
        'child span of a contenteditable': '<div contenteditable="true"><span>x</span></div>',
      };
      for (const [name, html] of Object.entries(editables)) {
        it(`does not cancel it on a ${name}`, async () => {
          await openWithResults();
          const host = q('.sp-footer')!;
          host.insertAdjacentHTML('beforeend', html);
          expect(mousedownPrevented(host.lastElementChild!.querySelector('span') ?? host.lastElementChild!)).toBe(false);
        });
      }

      it('does not cancel it on an input inside an open shadow root', async () => {
        await openWithResults();
        const shadowHost = document.createElement('div');
        q('.sp-footer')!.append(shadowHost);
        const input = document.createElement('input');
        shadowHost.attachShadow({ mode: 'open' }).append(input);
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true });
        input.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      });

      it('still cancels it on contenteditable="false"', async () => {
        await openWithResults();
        const host = q('.sp-footer')!;
        host.insertAdjacentHTML('beforeend', '<div contenteditable="false">x</div>');
        expect(mousedownPrevented(host.lastElementChild!)).toBe(true);
      });
    });

    it('cancels it on the input wrapper padding and on a group header', async () => {
      await openWithResults();
      expect(mousedownPrevented(q('.sp-input')!)).toBe(true);
      expect(mousedownPrevented(q('.sp-group-header')!)).toBe(true);
    });

    it('cancels it on a custom footer and a custom empty state', async () => {
      const { svc, stable } = await setup({}, TemplatedWrapper);
      svc.open();
      await stable();
      expect(mousedownPrevented(q('.tpl-footer')!)).toBe(true);
      typeInto('zzz');
      await stable();
      expect(mousedownPrevented(q('.tpl-empty')!)).toBe(true);
    });
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
    await expectNoAxeViolations();
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

  it('keeps a loading group header and spinner with no option rows', async () => {
    const hangs: SpotlightSource = {
      id: 'hangs',
      group: 'Hangs',
      search: (query) =>
        query === 'a' ? [{ id: 'a1', title: 'Alpha', group: 'Hangs', action: { route: '/a' } }] : new Promise<never[]>(() => undefined),
    };
    const { svc, stable } = await setup({ sources: [hangs] });
    svc.open();
    await stable();
    typeInto('a');
    await stable();
    expect(qa('[role="option"]')).toHaveLength(1);
    typeInto('ab');
    await stable();
    expect(qa('[role="option"]')).toHaveLength(0);
    expect(qa('[role="group"] .sp-group-header .sp-spinner')).toHaveLength(1);
    await expectNoAxeViolations();
  });

  it('stays expanded and announces loading while the first answer is pending', async () => {
    const remote: SpotlightSource = { id: 'remote', search: () => new Promise<never[]>(() => undefined) };
    const { svc, stable } = await setup({ sources: [remote] });
    svc.open();
    await stable();
    typeInto('acme');
    await stable();
    expect(qa('[role="option"]')).toHaveLength(0);
    expect(combobox().getAttribute('aria-expanded')).toBe('true');
    expect(q('[role="status"]')!.textContent.trim()).toBe('Loading…');
    // The placeholder header reads the loading text once, never the source id.
    expect(q('.sp-group-header')!.textContent.trim()).toBe('Loading…');
    await expectNoAxeViolations();
  });

  it('gives Recent options valid, unique ids', async () => {
    const { svc, navigate, stable } = await setup();
    svc.open('cust');
    await stable();
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

  it('does not cycle or prevent Tab with a single chip', async () => {
    const { svc, stable } = await setup();
    svc.open();
    await stable();
    typeInto('zzz');
    await stable();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    combobox().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(qa('.sp-chip-button')).toHaveLength(0);
  });

  it('wraps ArrowDown from the last row to the first', async () => {
    const { svc, stable } = await setup();
    svc.open();
    await stable();
    typeInto('o');
    await stable();
    for (let n = 0; n < 3; n++) press(combobox(), { key: 'ArrowDown' });
    await stable();
    expect(document.getElementById(combobox().getAttribute('aria-activedescendant')!)!.textContent).toContain('Dashboard');
  });

  it('passes newTab for Ctrl+Enter and Ctrl-click', async () => {
    const select = vi.fn(() => Promise.resolve());
    const { svc, stable } = await setup();
    vi.spyOn(svc, 'select').mockImplementation(select);
    svc.open();
    await stable();
    press(combobox(), { key: 'Enter', ctrlKey: true });
    press(combobox(), { key: 'Enter' });
    qa('[role="option"]')[0].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(select.mock.calls.map((c) => (c as unknown[])[1])).toEqual([{ newTab: true }, { newTab: false }, { newTab: true }]);
  });

  it('ignores Enter with no active option and keys that match no hotkey', async () => {
    const { svc, navigate, stable } = await setup();
    svc.open();
    await stable();
    typeInto('zzz');
    await stable();
    press(combobox(), { key: 'Enter' });
    await stable();
    expect(navigate).not.toHaveBeenCalled();
    expect(svc.isOpen()).toBe(true);
    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(svc.isOpen()).toBe(true);
  });

  it('closes and stops reacting to hotkeys when the host is destroyed', async () => {
    const { fixture, svc, stable } = await setup();
    svc.open();
    await stable();
    expect(qa('.sp-pane')).toHaveLength(1);
    fixture.destroy();
    expect(qa('.sp-pane')).toHaveLength(0);
    expect(svc.isOpen()).toBe(false);
    press(document.body, { key: ' ', code: 'Space', ctrlKey: true });
    await flush();
    expect(svc.isOpen()).toBe(false);
    expect(qa('.sp-pane')).toHaveLength(0);
  });

  it('has no axe violations in the error state', async () => {
    const flaky: SpotlightSource = {
      id: 'flaky',
      group: 'Flaky',
      search: (query) => (query === 'x' ? throwError(() => new Error('down')) : new Promise<never[]>(() => undefined)),
    };
    const { svc, stable } = await setup({ sources: [pages, flaky], onError: () => undefined });
    svc.open();
    await stable();
    typeInto('x');
    await stable();
    await expectNoAxeViolations();
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
