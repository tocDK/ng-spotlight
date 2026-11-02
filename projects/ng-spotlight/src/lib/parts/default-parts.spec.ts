import { Component, provideZonelessChangeDetection, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  resolveParts,
  SpotlightDefaultBadge,
  SpotlightDefaultChip,
  SpotlightDefaultGroupHeader,
  SpotlightDefaultInput,
  SpotlightDefaultRow,
} from './default-parts';
import { SPOTLIGHT_DEFAULT_CSS, SpotlightDefaultTheme } from './default-theme';
import type { SpotlightInputContext } from '../renderer';

async function render(type: Type<unknown>, ctx: unknown): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(type);
  fixture.componentRef.setInput('ctx', ctx);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('default parts', () => {
  it('input: renders the combobox with every ARIA attribute from its context and forwards events', async () => {
    const onInput = vi.fn();
    const onKeydown = vi.fn();
    const ctx: SpotlightInputContext = {
      id: 'sp-x-input',
      value: 'ord',
      placeholder: 'Search…',
      label: 'Search…',
      expanded: true,
      controls: 'sp-x-listbox',
      activeDescendant: 'sp-x-o0',
      onInput,
      onKeydown,
    };
    const el = await render(SpotlightDefaultInput, ctx);
    const input = el.querySelector('input')!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('sp-x-listbox');
    expect(input.getAttribute('aria-activedescendant')).toBe('sp-x-o0');
    expect(input.getAttribute('aria-label')).toBe('Search…');
    expect(input.placeholder).toBe('Search…');
    expect(input.id).toBe('sp-x-input');
    expect(input.value).toBe('ord');
    input.value = 'orde';
    input.dispatchEvent(new Event('input'));
    expect(onInput).toHaveBeenCalledWith('orde');
    const key = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    input.dispatchEvent(key);
    expect(onKeydown).toHaveBeenCalledWith(key);
  });

  it('row: title, subtitle, class icon and badges through the badge part', async () => {
    const el = await render(SpotlightDefaultRow, {
      item: {
        id: 'c',
        title: 'Customers',
        subtitle: '/customers',
        icon: 'pi pi-users',
        group: 'Pages',
        badges: [{ label: 'new', tone: 'success' }, { label: 'beta' }],
        action: { route: '/customers' },
      },
      active: false,
      query: '',
      badge: SpotlightDefaultBadge,
    });
    expect(el.querySelector('.sp-title')!.textContent).toBe('Customers');
    expect(el.querySelector('.sp-subtitle')!.textContent).toBe('/customers');
    expect(el.querySelector('.sp-icon i')!.className).toBe('pi pi-users');
    expect(el.querySelector('.sp-icon')!.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(el.querySelectorAll('.sp-badge')).map((b) => [b.textContent, b.getAttribute('data-tone')])).toEqual([
      ['new', 'success'],
      ['beta', 'info'],
    ]);
  });

  it('row: image icons render as decorative images', async () => {
    const el = await render(SpotlightDefaultRow, {
      item: { id: 'a', title: 'Acme', icon: 'https://cdn.example.com/acme.png', group: 'g', action: { route: '/a' } },
      active: true,
      query: 'ac',
      badge: SpotlightDefaultBadge,
    });
    const img = el.querySelector('.sp-icon img')!;
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/acme.png');
    expect(img.getAttribute('alt')).toBe('');
    expect(el.querySelector('.sp-subtitle')).toBeNull();
    expect(el.querySelector('.sp-badges')).toBeNull();
  });

  it('group header: label, total and a spinner with hidden loading text', async () => {
    const el = await render(SpotlightDefaultGroupHeader, { label: 'Customers', total: 42, loading: true, loadingText: 'Loading…' });
    expect(el.querySelector('.sp-group-label')!.textContent).toBe('Customers');
    expect(el.querySelector('.sp-group-total')!.textContent).toBe('42');
    expect(el.querySelector('.sp-spinner')!.getAttribute('aria-hidden')).toBe('true');
    // Accessible name with separators, not "Customers42Loading…".
    expect(el.textContent.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim()).toBe('Customers, 42, Loading…');
  });

  it('group header: skips the hidden loading text when it is empty', async () => {
    const el = await render(SpotlightDefaultGroupHeader, { label: 'Loading…', total: undefined, loading: true, loadingText: '' });
    expect(el.querySelector('.sp-spinner')).not.toBeNull();
    expect(el.textContent.trim()).toBe('Loading…');
  });

  it('chip: marks the active chip', async () => {
    const el = await render(SpotlightDefaultChip, { label: 'Orders', active: true });
    expect(el.querySelector('.sp-chip')!.classList).toContain('sp-chip-active');
    expect(el.textContent.trim()).toBe('Orders');
  });

  it('resolveParts: core parts by default, renderer parts when given', () => {
    @Component({ selector: 'spotlight-test-row', template: '' })
    class CustomRow {}
    expect(resolveParts(null)).toEqual({
      panelClass: null,
      backdropClass: null,
      input: SpotlightDefaultInput,
      chips: SpotlightDefaultChip,
      groupHeader: SpotlightDefaultGroupHeader,
      row: SpotlightDefaultRow,
      badge: SpotlightDefaultBadge,
    });
    expect(resolveParts({ row: CustomRow, dialog: { panelClass: 'x', backdropClass: 'y' } })).toMatchObject({
      row: CustomRow,
      input: SpotlightDefaultInput,
      panelClass: 'x',
      backdropClass: 'y',
    });
  });
});

describe('default theme', () => {
  it('uses the spec CSS variables, has a dark variant and is scoped to .sp-theme-default', () => {
    for (const name of ['--sp-bg', '--sp-fg', '--sp-muted', '--sp-accent', '--sp-radius', '--sp-font', '--sp-shadow']) {
      expect(SPOTLIGHT_DEFAULT_CSS).toContain(`${name}:`);
    }
    expect(SPOTLIGHT_DEFAULT_CSS).toContain('@media (prefers-color-scheme: dark)');
    expect(SPOTLIGHT_DEFAULT_CSS).toContain(':where(.sp-dark)');
    expect(SPOTLIGHT_DEFAULT_CSS).toContain('.sp-theme-default .sp-dialog');
    expect(SPOTLIGHT_DEFAULT_CSS).not.toMatch(/(^|\n)\.sp-dialog/);
  });

  it('keeps the sheet layout, the badge background and the tone selectors in the CSS', () => {
    expect(SPOTLIGHT_DEFAULT_CSS).toContain('.sp-theme-default.sp-sheet .sp-dialog');
    expect(SPOTLIGHT_DEFAULT_CSS).toMatch(/\.sp-theme-default \.sp-badge \{[^}]*background: var\(--sp-bg\)/);
    for (const tone of ['success', 'warn', 'danger']) {
      expect(SPOTLIGHT_DEFAULT_CSS).toContain(`.sp-theme-default .sp-badge[data-tone='${tone}']`);
    }
  });

  it('adds the stylesheet to the document when rendered', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(SpotlightDefaultTheme);
    await fixture.whenStable();
    const css = Array.from(document.head.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n');
    expect(css).toContain('.sp-theme-default .sp-dialog');
  });
});
