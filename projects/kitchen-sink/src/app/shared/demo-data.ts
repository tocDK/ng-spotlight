import { staticSource, type SpotlightSource } from '@tocdk-oss/ng-spotlight';

/** The same small data set for every theme and template demo. */
export function demoSources(): SpotlightSource[] {
  return [
    staticSource({
      group: 'Pages',
      items: [
        { id: 'dashboard', title: 'Dashboard', icon: 'pi pi-home', suggested: true, action: { route: '/getting-started' } },
        {
          id: 'customers',
          title: 'Customers',
          icon: 'pi pi-users',
          keywords: ['clients'],
          badges: [{ label: '12 new', tone: 'info' }],
          suggested: true,
          action: { route: '/getting-started' },
        },
        { id: 'orders', title: 'Orders', icon: 'pi pi-shopping-cart', badges: [{ label: '3 late', tone: 'warn' }], action: { route: '/getting-started' } },
        { id: 'reports', title: 'Reports', icon: 'pi pi-chart-bar', action: { route: '/getting-started' } },
      ],
    }),
    staticSource({
      group: 'Commands',
      items: [
        { id: 'invite', title: 'Invite a user', icon: 'pi pi-user-plus', badges: [{ label: 'admin', tone: 'danger' }], action: { run: () => undefined } },
        { id: 'export', title: 'Export orders as CSV', icon: 'pi pi-download', badges: [{ label: 'ready', tone: 'success' }], action: { run: () => undefined } },
      ],
    }),
  ];
}
