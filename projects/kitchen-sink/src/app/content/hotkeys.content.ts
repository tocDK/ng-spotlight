import type { PageContent } from '../shared/page-content.types';

export const HOTKEYS_CONTENT: PageContent = {
  title: 'Hotkeys & prefixes',
  sections: [
    {
      id: 'hotkeys',
      title: 'Hotkeys',
      markdown: `
Default: \`['ctrl.space', 'mod.k']\`. \`mod\` is Cmd on macOS and Ctrl elsewhere. Modifiers: \`ctrl\`, \`alt\`, \`shift\`,
\`meta\`, \`mod\`; keys: letters, digits, \`space\`, \`slash\`, \`period\`, \`comma\`, \`dash\`, \`enter\`, \`escape\`.
Pressing the hotkey again closes the palette. Hotkeys are ignored during IME composition.

**Several palettes on one page** (the app shell's palette next to an \`isolated: true\` one, say): one key press
reaches exactly one palette. An open palette gets it, so the hotkey closes it. Otherwise the palette opened most
recently (by hotkey, \`spotlightTrigger\` or \`open()\`) gets it, and before any has been opened the
\`<spotlight-host>\` created first (normally the app shell's) does. A palette whose own \`hotkeys\` don't match the key,
for example \`hotkeys: []\`, never takes part. Place one \`<spotlight-host>\` per palette.

**macOS caveat:** the system may use Ctrl+Space to switch input source, which is why \`mod.k\` is in the default set.
      `,
    },
    {
      id: 'prefixes',
      title: 'Prefixes',
      markdown: `
A source with \`prefix: '#'\` runs alone when the query starts with \`#\`, and receives the query without it.
\`#\` alone lists everything that source returns. Without the prefix the source still takes part in normal searches.
      `,
    },
  ],
  examples: [{ key: 'hotkeys-prefixes', title: 'Alt+K, # for orders and @ for people' }],
};
