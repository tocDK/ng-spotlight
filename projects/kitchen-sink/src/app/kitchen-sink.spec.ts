import { provideHttpClient } from '@angular/common/http';
import { createEnvironmentInjector, EnvironmentInjector, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { localStorageRecent, provideSpotlight, SpotlightHost, SpotlightService, spotlightRouteAudit } from '@tocdk-oss/ng-spotlight';
import { LinguiService } from '@tocdk/lingui-angular';
import { providePrimeNG } from 'primeng/config';
import { expectNoAxeViolations } from '../../../ng-spotlight/src/lib/testing.spec-util';
import { routes } from './app.routes';
import { EXAMPLES } from './examples';
import { byoLinguiProviders } from './examples/byo-lingui.example';
import { SOURCES } from './examples/sources.generated';
import { ExampleCard } from './shared/example-card';
import type { PageContent } from './shared/page-content.types';

const pageExamples = routes.flatMap((r) => (r.data?.['content'] as PageContent | undefined)?.examples.map((e) => e.key) ?? []);

describe('kitchen sink', () => {
  it('has a page for every section of the spec', () => {
    expect(routes.flatMap((r) => (typeof r.title === 'string' ? [r.title] : []))).toEqual([
      'Getting started',
      'Route source',
      'HTTP source',
      'Custom templates',
      'Themes',
      'Hotkeys & prefixes',
      'Accessibility',
      'Build your own',
      'API reference',
    ]);
  });

  it('byo-lingui switches the palette texts live with the locale', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    const env = createEnvironmentInjector(byoLinguiProviders, TestBed.inject(EnvironmentInjector));
    const svc = env.get(SpotlightService);
    expect(svc.texts.placeholder()).toBe('Search…');
    expect(svc.texts.resultsAnnouncement(3)).toBe('3 results');
    await env.get(LinguiService).activate('da');
    expect(svc.texts.placeholder()).toBe('Søg…');
    expect(svc.texts.all()).toBe('Alle');
    expect(svc.texts.resultsAnnouncement(3)).toBe('3 resultater');
    env.destroy();
  });

  it('labels every route (dogfoods spotlightRouteAudit)', () => {
    expect(spotlightRouteAudit(routes)).toEqual([]);
  });

  it('references only existing examples, each with its generated source, and uses every example', () => {
    expect(pageExamples.length).toBeGreaterThan(0);
    for (const key of pageExamples) {
      expect(EXAMPLES[key], key).toBeDefined();
      expect(SOURCES[key], key).toContain('provideSpotlight');
    }
    expect(new Set(pageExamples)).toEqual(new Set(Object.keys(EXAMPLES)));
  });

  async function openExample(key: string) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideHttpClient(),
        providePrimeNG({}),
        provideSpotlight({ hotkeys: [], recent: { storage: localStorageRecent('kitchen-sink-test') } }),
      ],
    });
    const fixture = TestBed.createComponent(ExampleCard);
    fixture.componentRef.setInput('key', key);
    fixture.componentRef.setInput('title', key);
    await fixture.whenStable();
    const host = fixture.debugElement.query(By.directive(SpotlightHost));
    expect(host, `${key} renders <spotlight-host>`).not.toBeNull();
    const svc = host.injector.get(SpotlightService);
    expect(svc).not.toBe(TestBed.inject(SpotlightService));
    svc.open();
    await fixture.whenStable();
    return { fixture, svc };
  }

  it.each(Object.keys(EXAMPLES))('renders example "%s" with its own palette', async (key) => {
    const { fixture, svc } = await openExample(key);
    expect(document.querySelector('[role="combobox"]')).not.toBeNull();
    svc.close();
    await fixture.whenStable();
    fixture.destroy();
  });

  it('byo-renderer shows its dot badge through the custom row', async () => {
    const { fixture, svc } = await openExample('byo-renderer');
    expect(document.querySelector('app-compact-row')).not.toBeNull();
    expect(document.querySelector('app-dot-badge')?.textContent?.trim()).toBe('● 12 new');
    svc.close();
    await fixture.whenStable();
    fixture.destroy();
  });

  it('accessibility example has no axe violations when open', async () => {
    const { fixture, svc } = await openExample('accessibility');
    await expectNoAxeViolations();
    svc.close();
    await fixture.whenStable();
    fixture.destroy();
  });
});
