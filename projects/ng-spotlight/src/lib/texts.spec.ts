import { EnvironmentInjector, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable } from 'rxjs';
import { DEFAULT_SPOTLIGHT_TEXTS, resolveTexts, SPOTLIGHT_TEXT_KEYS } from './texts';

describe('resolveTexts', () => {
  let injector: EnvironmentInjector;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    injector = TestBed.inject(EnvironmentInjector);
  });

  it('falls back to the English defaults for every key', () => {
    const texts = resolveTexts(undefined, injector);
    for (const key of SPOTLIGHT_TEXT_KEYS) expect(texts[key]()).toBe(DEFAULT_SPOTLIGHT_TEXTS[key]);
    expect(texts.placeholder()).toBe('Search…');
    expect(texts.resultsAnnouncement(0)).toBe('No results');
    expect(texts.resultsAnnouncement(1)).toBe('1 result');
    expect(texts.resultsAnnouncement(7)).toBe('7 results');
  });

  it('accepts plain strings', () => {
    expect(resolveTexts({ placeholder: 'Find…' }, injector).placeholder()).toBe('Find…');
  });

  it('passes signals through so changes show live', () => {
    const placeholder = signal('Search…');
    const texts = resolveTexts({ placeholder }, injector);
    placeholder.set('Søg…');
    expect(texts.placeholder()).toBe('Søg…');
  });

  it('subscribes to observables', () => {
    const recent = new BehaviorSubject('Recent');
    const texts = resolveTexts({ recent }, injector);
    expect(texts.recent()).toBe('Recent');
    recent.next('Seneste');
    expect(texts.recent()).toBe('Seneste');
  });

  it('uses a custom results announcement', () => {
    expect(resolveTexts({ resultsAnnouncement: (n) => `${n} hits` }, injector).resultsAnnouncement(3)).toBe('3 hits');
  });

  it('keeps the fallback when an observable errors, and does not throw on read', () => {
    const failing = new Observable<string>((subscriber) => subscriber.error(new Error('boom')));
    const texts = resolveTexts({ recent: failing }, injector);
    expect(() => texts.recent()).not.toThrow();
    expect(texts.recent()).toBe(DEFAULT_SPOTLIGHT_TEXTS.recent);
  });
});
