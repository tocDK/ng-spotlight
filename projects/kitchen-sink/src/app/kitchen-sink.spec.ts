import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { localStorageRecent, provideSpotlight, SpotlightHost, SpotlightService, spotlightRouteAudit } from '@tocdk/ng-spotlight';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { EXAMPLES } from './examples';
import { SOURCES } from './examples/sources.generated';
import { ExampleCard } from './shared/example-card';
import type { PageContent } from './shared/page-content.types';

const pageExamples = routes.flatMap((r) => (r.data?.['content'] as PageContent | undefined)?.examples.map((e) => e.key) ?? []);

describe('kitchen sink', () => {
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

  it.each(Object.keys(EXAMPLES))('renders example "%s" with its own palette', async (key) => {
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
    expect(document.querySelector('[role="combobox"]')).not.toBeNull();
    svc.close();
    await fixture.whenStable();
    fixture.destroy();
  });
});
