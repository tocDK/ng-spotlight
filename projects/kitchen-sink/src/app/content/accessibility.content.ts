import type { PageContent } from '../shared/page-content.types';

export const ACCESSIBILITY_CONTENT: PageContent = {
  title: 'Accessibility',
  sections: [
    {
      id: 'keyboard',
      title: 'Keyboard-only walkthrough',
      markdown: `
1. Press **Ctrl+Space** (or **⌘K / Ctrl+K**), or focus a \`spotlightTrigger\` button and press **Enter**.
2. Type. The first result is already active, so **Enter** opens it.
3. **↓ / ↑** move through results (they wrap). **Tab / Shift+Tab** switch between the group chips.
4. **Ctrl+Enter / ⌘+Enter** opens a link result in a new tab.
5. On an error row, **Enter** retries that source.
6. **Esc** closes; focus returns to where it was.
      `,
    },
    {
      id: 'screen-readers',
      title: 'Screen-reader notes',
      markdown: `
The palette follows the WAI-ARIA combobox pattern inside a modal dialog: the input is \`role="combobox"\` with
\`aria-expanded\`, \`aria-controls\` and \`aria-activedescendant\`; results are a \`role="listbox"\` of \`role="group"\`
sections (labelled by their headers) containing \`role="option"\` rows with \`aria-selected\`. Focus stays in the input
and is trapped in the dialog. A polite live region announces the result count (\`texts.resultsAnnouncement\`).
Chips are buttons with \`aria-pressed\`. The test suite runs axe on the open palette in light, dark and PrimeNG modes;
colour contrast is checked by hand because the test DOM cannot compute it.
      `,
    },
  ],
  examples: [{ key: 'accessibility', title: 'Keyboard-only, with the selected stream' }],
};
