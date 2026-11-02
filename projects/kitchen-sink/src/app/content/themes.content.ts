import type { PageContent } from '../shared/page-content.types';

export const THEMES_CONTENT: PageContent = {
  title: 'Themes',
  sections: [
    {
      id: 'default',
      title: "theme: 'default'",
      markdown: `
One stylesheet that uses CSS variables only: \`--sp-bg\`, \`--sp-fg\`, \`--sp-muted\`, \`--sp-accent\`, \`--sp-accent-fg\`,
\`--sp-active-bg\`, \`--sp-border\`, \`--sp-backdrop\`, \`--sp-radius\`, \`--sp-font\`, \`--sp-shadow\` and the badge tones
\`--sp-info\`, \`--sp-success\`, \`--sp-warn\`, \`--sp-danger\`. It follows \`prefers-color-scheme\`; the classes \`sp-dark\`
and \`sp-light\` on any ancestor force a mode. Override a variable on \`:root\` or on a pane class.
      `,
    },
    {
      id: 'none',
      title: "theme: 'none'",
      markdown: `
Ships no CSS. Style \`.sp-dialog\`, \`.sp-input-el\`, \`.sp-option[aria-selected='true']\`, … yourself, scoped by a pane
class from a partial \`SpotlightRenderer\` (\`{ dialog: { panelClass } }\` via \`SPOTLIGHT_RENDERER\`).
      `,
    },
    {
      id: 'primeng',
      title: 'PrimeNG',
      markdown: `
\`\`\`ts
import { provideSpotlightPrimeNG } from '@tocdk-oss/ng-spotlight/primeng';
providers: [providePrimeNG({ theme: { preset: Aura } }), provideSpotlight({ … }), provideSpotlightPrimeNG()]
\`\`\`

The palette then renders with \`p-iconfield\` + \`pInputText\`, \`p-chip\`, \`p-tag\` and \`pi\` icon classes, and takes its
colours from the PrimeNG preset (the adapter maps the \`--sp-*\` variables to PrimeNG tokens), so white-label
presets apply. Apps that never import \`/primeng\` never load PrimeNG. A test keeps its accessibility tree identical to the core's.
      `,
    },
  ],
  examples: [
    { key: 'theme-default', title: 'Default theme (toggle dark mode in the top bar)' },
    { key: 'theme-none', title: "theme: 'none' with app CSS" },
    { key: 'theme-primeng', title: 'PrimeNG adapter (Aura preset)' },
    { key: 'theme-variables', title: 'CSS-variable overrides' },
  ],
};
