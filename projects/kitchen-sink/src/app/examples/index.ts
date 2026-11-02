import type { EnvironmentProviders, Provider, Type } from '@angular/core';
import { GettingStartedExample, gettingStartedProviders } from './getting-started.example';
import { RouteSourceExample, routeSourceProviders } from './route-source.example';

export interface ExampleDef {
  component: Type<unknown>;
  providers: Array<Provider | EnvironmentProviders>;
}

/** Key = example file name without `.example.ts` (also the key into SOURCES). */
export const EXAMPLES: Record<string, ExampleDef> = {
  'getting-started': { component: GettingStartedExample, providers: gettingStartedProviders },
  'route-source': { component: RouteSourceExample, providers: routeSourceProviders },
};
