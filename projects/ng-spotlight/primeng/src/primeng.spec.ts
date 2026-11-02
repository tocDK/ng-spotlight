import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpotlight, SpotlightHost, SpotlightService, staticSource } from '@tocdk-oss/ng-spotlight';
import { providePrimeNG } from 'primeng/config';
import { expectNoAxeViolations, memoryRecent } from '../../src/lib/testing.spec-util';
import { toneToSeverity } from './primeng-parts';
import { provideSpotlightPrimeNG } from './public-api';

@Component({ imports: [SpotlightHost], template: '<spotlight-host />' })
class Wrapper {}

const pages = staticSource({
  group: 'Pages',
  items: [
    { id: 'dash', title: 'Dashboard', suggested: true, icon: 'pi pi-home', action: { route: '/dashboard' } },
    { id: 'cust', title: 'Customers', icon: 'pi pi-users', badges: [{ label: 'new', tone: 'success' }], action: { route: '/customers' } },
  ],
});
const orders = staticSource({ group: 'Orders', items: [{ id: '1001', title: 'Order 1001', action: { route: '/orders/1001' } }] });

async function openWith(primeng: boolean, query = 'o') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideSpotlight({ recent: { storage: memoryRecent() }, sources: [pages, orders] }),
      ...(primeng ? [provideSpotlightPrimeNG(), providePrimeNG({})] : []),
    ],
  });
  const fixture = TestBed.createComponent(Wrapper);
  await fixture.whenStable();
  const svc = TestBed.inject(SpotlightService);
  svc.open();
  await fixture.whenStable();
  svc.setQuery(query);
  await fixture.whenStable();
  return { fixture, svc };
}

/** Roles and ARIA attributes of every non-hidden element, ids normalised to first-seen order. */
function a11yTree(root: Element): string[] {
  const ids = new Map<string, string>();
  const norm = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => {
        if (!ids.has(id)) ids.set(id, `#${ids.size}`);
        return ids.get(id)!;
      })
      .join(' ');
  const idRefs = new Set(['aria-controls', 'aria-activedescendant', 'aria-labelledby']);
  const out: string[] = [];
  const walk = (el: Element, depth: number) => {
    if (el.getAttribute('aria-hidden') === 'true') return;
    const role = el.getAttribute('role');
    const aria = Array.from(el.attributes)
      .filter((a) => a.name.startsWith('aria-'))
      .map((a) => `${a.name}=${idRefs.has(a.name) ? norm(a.value) : a.value}`)
      .sort();
    if (role || aria.length > 0) {
      const id = el.id ? norm(el.id) : '';
      out.push(`${'  '.repeat(depth)}${el.tagName.toLowerCase()}[${role ?? ''}]${id} ${aria.join(' ')}`.trimEnd());
    }
    for (const child of Array.from(el.children)) walk(child, role ? depth + 1 : depth);
  };
  walk(root, 0);
  return out;
}

describe('@tocdk-oss/ng-spotlight/primeng', () => {
  it('maps badge tones to p-tag severities', () => {
    expect(toneToSeverity('info')).toBe('info');
    expect(toneToSeverity('success')).toBe('success');
    expect(toneToSeverity('warn')).toBe('warn');
    expect(toneToSeverity('danger')).toBe('danger');
    expect(toneToSeverity(undefined)).toBe('secondary');
  });

  it('renders PrimeNG components inside the core overlay', async () => {
    const { fixture } = await openWith(true);
    expect(document.querySelector('.sp-pane')!.classList).toContain('sp-primeng');
    expect(document.querySelector('.cdk-overlay-backdrop')!.classList).toContain('sp-primeng-backdrop');
    expect(document.querySelector('p-iconfield input[pinputtext][role="combobox"]')).not.toBeNull();
    expect(document.querySelectorAll('p-chip')).toHaveLength(3);
    expect(document.querySelector('p-tag')!.textContent).toContain('new');
    expect(document.querySelector('[role="option"] i.pi-users')).not.toBeNull();
    fixture.destroy();
  });

  it('keeps the core keyboard behaviour through the PrimeNG input', async () => {
    const { fixture, svc } = await openWith(true);
    const input = document.querySelector<HTMLInputElement>('[role="combobox"]')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(svc.activeIndex()).toBe(1);
    input.value = 'cust';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(svc.query()).toBe('cust');
    fixture.destroy();
  });

  it('produces the same accessibility tree as the core renderer', async () => {
    const core = await openWith(false);
    const coreTree = a11yTree(document.querySelector('.cdk-overlay-container')!);
    core.fixture.destroy();
    const prime = await openWith(true);
    const primeTree = a11yTree(document.querySelector('.cdk-overlay-container')!);
    prime.fixture.destroy();
    expect(coreTree.length).toBeGreaterThan(5);
    expect(primeTree).toEqual(coreTree);
  });

  it('names a group with a total the same way as the core renderer ("Customers, 2")', async () => {
    const headerText = async (primeng: boolean) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideRouter([]),
          provideSpotlight({
            recent: { storage: memoryRecent() },
            sources: [
              {
                id: 'crm',
                search: () => ({
                  groups: [{ id: 'customers', label: 'Customers', total: 2, items: [{ id: 'a', title: 'Acme', group: 'customers', action: { route: '/a' } }] }],
                }),
              },
            ],
          }),
          ...(primeng ? [provideSpotlightPrimeNG(), providePrimeNG({})] : []),
        ],
      });
      const fixture = TestBed.createComponent(Wrapper);
      await fixture.whenStable();
      TestBed.inject(SpotlightService).open('a');
      await fixture.whenStable();
      const header = document.getElementById(document.querySelector('[role="group"]')!.getAttribute('aria-labelledby')!)!;
      const text = header.textContent.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
      fixture.destroy();
      return text;
    };
    expect(await headerText(false)).toBe('Customers, 2');
    expect(await headerText(true)).toBe('Customers, 2');
  });

  it('has no axe violations with the open PrimeNG overlay', async () => {
    const { fixture } = await openWith(true);
    await expectNoAxeViolations();
    fixture.destroy();
  });
});
