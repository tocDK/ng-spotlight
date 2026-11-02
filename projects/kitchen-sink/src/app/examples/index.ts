import type { EnvironmentProviders, Provider, Type } from '@angular/core';
import { AccessibilityExample, accessibilityProviders } from './accessibility.example';
import { ByoLinguiExample, byoLinguiProviders } from './byo-lingui.example';
import { ByoRecentExample, byoRecentProviders } from './byo-recent.example';
import { ByoRendererExample, byoRendererProviders } from './byo-renderer.example';
import { ByoSourceExample, byoSourceProviders } from './byo-source.example';
import { CustomTemplatesExample, customTemplatesProviders } from './custom-templates.example';
import { GettingStartedExample, gettingStartedProviders } from './getting-started.example';
import { HotkeysPrefixesExample, hotkeysPrefixesProviders } from './hotkeys-prefixes.example';
import { HttpSourceExample, httpSourceProviders } from './http-source.example';
import { RouteSourceExample, routeSourceProviders } from './route-source.example';
import { ThemeDefaultExample, themeDefaultProviders } from './theme-default.example';
import { ThemeNoneExample, themeNoneProviders } from './theme-none.example';
import { ThemePrimengExample, themePrimengProviders } from './theme-primeng.example';
import { ThemeVariablesExample, themeVariablesProviders } from './theme-variables.example';

export interface ExampleDef {
  component: Type<unknown>;
  providers: Array<Provider | EnvironmentProviders>;
}

/** Key = example file name without `.example.ts` (also the key into SOURCES). */
export const EXAMPLES: Record<string, ExampleDef> = {
  'getting-started': { component: GettingStartedExample, providers: gettingStartedProviders },
  'route-source': { component: RouteSourceExample, providers: routeSourceProviders },
  'http-source': { component: HttpSourceExample, providers: httpSourceProviders },
  'custom-templates': { component: CustomTemplatesExample, providers: customTemplatesProviders },
  'theme-default': { component: ThemeDefaultExample, providers: themeDefaultProviders },
  'theme-none': { component: ThemeNoneExample, providers: themeNoneProviders },
  'theme-primeng': { component: ThemePrimengExample, providers: themePrimengProviders },
  'theme-variables': { component: ThemeVariablesExample, providers: themeVariablesProviders },
  'hotkeys-prefixes': { component: HotkeysPrefixesExample, providers: hotkeysPrefixesProviders },
  accessibility: { component: AccessibilityExample, providers: accessibilityProviders },
  'byo-source': { component: ByoSourceExample, providers: byoSourceProviders },
  'byo-lingui': { component: ByoLinguiExample, providers: byoLinguiProviders },
  'byo-recent': { component: ByoRecentExample, providers: byoRecentProviders },
  'byo-renderer': { component: ByoRendererExample, providers: byoRendererProviders },
};
