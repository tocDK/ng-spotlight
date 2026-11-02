import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  localStorageRecent,
  provideSpotlight,
  SpotlightEmptyTemplate,
  SpotlightFooterTemplate,
  SpotlightHost,
  SpotlightItemTemplate,
  SpotlightTrigger,
  staticSource,
  type SpotlightItem,
} from '@tocdk-oss/ng-spotlight';

export const customTemplatesProviders = [
  provideSpotlight({
    isolated: true,
    hotkeys: [],
    recent: { storage: localStorageRecent('example-custom-templates') },
    sources: [
      staticSource({
        group: 'Customers',
        items: [
          {
            id: 'acme',
            title: 'Acme A/S',
            subtitle: 'Copenhagen',
            suggested: true,
            badges: [{ label: 'VIP', tone: 'success' }],
            data: { revenue: 1_200_000 },
            action: { route: '/custom-templates' },
          },
          {
            id: 'nordlys',
            title: 'Nordlys ApS',
            subtitle: 'Aarhus',
            badges: [{ label: 'overdue', tone: 'danger' }],
            data: { revenue: 340_000 },
            action: { route: '/custom-templates' },
          },
        ],
      }),
      staticSource({
        group: 'Commands',
        items: [{ id: 'new', title: 'New campaign', icon: 'pi pi-plus', suggested: true, action: { run: () => undefined } }],
      }),
    ],
  }),
];

@Component({
  selector: 'app-custom-templates-example',
  imports: [SpotlightHost, SpotlightTrigger, SpotlightItemTemplate, SpotlightEmptyTemplate, SpotlightFooterTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .customer-row { display: flex; flex-direction: column; flex: 1; }
    .customer-row.is-active strong { text-decoration: underline; }
    .customer-meta { color: var(--sp-muted); font-size: 12px; }
    .customer-badge { margin-left: 6px; font-size: 11px; text-transform: uppercase; }
    .customer-badge[data-tone='danger'] { color: var(--sp-danger); }
    .customer-badge[data-tone='success'] { color: var(--sp-success); }
  `,
  template: `
    <button type="button" class="demo-button" spotlightTrigger>Open with custom rows</button>
    <spotlight-host>
      <!-- Per-group row: only the Customers group uses it. -->
      <ng-template spotlightItem="Customers" let-item let-active="active">
        <span class="customer-row" [class.is-active]="active">
          <strong>
            {{ item.title }}
            @for (badge of item.badges ?? []; track badge.label) {
              <span class="customer-badge" [attr.data-tone]="badge.tone">{{ badge.label }}</span>
            }
          </strong>
          <span class="customer-meta">{{ item.subtitle }} · revenue {{ revenue(item) }} DKK</span>
        </span>
      </ng-template>
      <!-- No fallback template here, so Commands keep the renderer's row. -->
      <ng-template spotlightEmpty let-query>No match for "{{ query }}". Try "acme".</ng-template>
      <ng-template spotlightFooter><span>Custom footer: Enter opens, Esc closes.</span></ng-template>
    </spotlight-host>
  `,
})
export class CustomTemplatesExample {
  protected revenue(item: SpotlightItem): string {
    return ((item.data as { revenue: number }).revenue).toLocaleString('en-US');
  }
}
