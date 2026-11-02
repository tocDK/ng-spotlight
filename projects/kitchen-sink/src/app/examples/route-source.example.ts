import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { Routes } from '@angular/router';
import {
  localStorageRecent,
  provideSpotlight,
  routeSource,
  SpotlightHost,
  spotlightRouteAudit,
  SpotlightTrigger,
} from '@tocdk-oss/ng-spotlight';

@Component({ template: '' })
class DemoPage {}

/** A route config like an app's, to show what the audit reports. */
const DEMO_ROUTES: Routes = [
  { path: 'customers', component: DemoPage, title: 'Customers', data: { spotlight: { keywords: ['clients', 'accounts'] } } },
  { path: 'customers/:id', component: DemoPage, title: 'Customer' }, // skipped: has a :param segment
  { path: 'reports', component: DemoPage, data: { breadcrumb: 'Reports' } }, // label from data.breadcrumb
  { path: 'internal', component: DemoPage, data: { spotlight: false } }, // opted out
  { path: 'settings', component: DemoPage }, // no label: the audit reports it
];

export const routeSourceProviders = [
  provideSpotlight({
    isolated: true,
    hotkeys: [],
    recent: { storage: localStorageRecent('example-route-source') },
    // The kitchen sink's own routes; the filter hides one page, like an app hiding pages by role.
    sources: [routeSource({ group: 'Kitchen sink pages', filter: (_route, url) => url !== '/api' })],
  }),
];

@Component({
  selector: 'app-route-source-example',
  imports: [SpotlightHost, SpotlightTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Search the kitchen-sink routes</button>
    <p><code>spotlightRouteAudit(DEMO_ROUTES)</code> returns:</p>
    <pre>{{ audit }}</pre>
    <spotlight-host />
  `,
})
export class RouteSourceExample {
  protected readonly audit = JSON.stringify(spotlightRouteAudit(DEMO_ROUTES), null, 2);
}
