export interface ParsedHotkey {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /** Lower-case KeyboardEvent.key value (' ' for space). */
  key: string;
}

export const DEFAULT_HOTKEYS: readonly string[] = ['ctrl.space', 'mod.k'];

const MODIFIERS = new Set(['ctrl', 'alt', 'shift', 'meta', 'mod']);

const KEY_ALIASES: Record<string, string> = {
  space: ' ',
  slash: '/',
  period: '.',
  comma: ',',
  dash: '-',
  esc: 'escape',
  escape: 'escape',
  enter: 'enter',
};

/** Parses 'ctrl.space', 'mod.k', 'alt.shift.slash', … 'mod' = Cmd on macOS, Ctrl elsewhere. */
export function parseHotkey(spec: string, isMac: boolean): ParsedHotkey {
  const parts = spec.toLowerCase().split('.').filter((p) => p !== '');
  const key = parts.pop();
  if (key === undefined) throw new Error(`[ng-spotlight] invalid hotkey "${spec}"`);
  for (const modifier of parts) {
    if (!MODIFIERS.has(modifier)) throw new Error(`[ng-spotlight] unknown modifier "${modifier}" in hotkey "${spec}"`);
  }
  const mods = new Set(parts);
  return {
    ctrl: mods.has('ctrl') || (mods.has('mod') && !isMac),
    alt: mods.has('alt'),
    shift: mods.has('shift'),
    meta: mods.has('meta') || (mods.has('mod') && isMac),
    key: KEY_ALIASES[key] ?? key,
  };
}

export function matchesHotkey(event: KeyboardEvent, hotkey: ParsedHotkey): boolean {
  if (event.isComposing) return false;
  // Autofill and synthetic keydown events can arrive without a key string.
  if (typeof event.key !== 'string') return false;
  if (
    event.ctrlKey !== hotkey.ctrl ||
    event.altKey !== hotkey.alt ||
    event.shiftKey !== hotkey.shift ||
    event.metaKey !== hotkey.meta
  ) {
    return false;
  }
  const key = event.key.toLowerCase();
  if (hotkey.key === ' ') return key === ' ' || event.code === 'Space';
  if (key === hotkey.key) return true;
  // On macOS, Alt changes event.key (Alt+P gives 'π'); compare the physical key instead.
  if (/^[a-z]$/.test(hotkey.key)) return event.code === `Key${hotkey.key.toUpperCase()}`;
  if (/^[0-9]$/.test(hotkey.key)) return event.code === `Digit${hotkey.key}`;
  return false;
}

export function detectMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}
