import { DEFAULT_HOTKEYS, matchesHotkey, parseHotkey } from './hotkeys';

const down = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('parseHotkey', () => {
  it('parses ctrl.space', () => {
    expect(parseHotkey('ctrl.space', false)).toEqual({ ctrl: true, alt: false, shift: false, meta: false, key: ' ' });
  });

  it('maps mod to meta on macOS and ctrl elsewhere', () => {
    expect(parseHotkey('mod.k', true)).toMatchObject({ meta: true, ctrl: false, key: 'k' });
    expect(parseHotkey('mod.k', false)).toMatchObject({ meta: false, ctrl: true, key: 'k' });
  });

  it('is case-insensitive and supports key aliases', () => {
    expect(parseHotkey('Alt.Shift.Slash', false)).toEqual({ ctrl: false, alt: true, shift: true, meta: false, key: '/' });
  });

  it('rejects unknown modifiers and empty specs', () => {
    expect(() => parseHotkey('hyper.k', false)).toThrow('[ng-spotlight] unknown modifier "hyper" in hotkey "hyper.k"');
    expect(() => parseHotkey('', false)).toThrow('[ng-spotlight] invalid hotkey ""');
  });

  it('defaults to ctrl.space and mod.k', () => {
    expect(DEFAULT_HOTKEYS).toEqual(['ctrl.space', 'mod.k']);
  });
});

describe('matchesHotkey', () => {
  const ctrlSpace = parseHotkey('ctrl.space', false);

  it('matches the exact modifier set', () => {
    expect(matchesHotkey(down({ key: ' ', code: 'Space', ctrlKey: true }), ctrlSpace)).toBe(true);
    expect(matchesHotkey(down({ key: ' ', code: 'Space', ctrlKey: true, shiftKey: true }), ctrlSpace)).toBe(false);
    expect(matchesHotkey(down({ key: ' ', code: 'Space' }), ctrlSpace)).toBe(false);
  });

  it('ignores IME composition', () => {
    expect(matchesHotkey(down({ key: ' ', code: 'Space', ctrlKey: true, isComposing: true }), ctrlSpace)).toBe(false);
  });

  it('falls back to event.code when Alt changes event.key (macOS)', () => {
    const altP = parseHotkey('alt.p', true);
    expect(matchesHotkey(down({ key: 'π', code: 'KeyP', altKey: true }), altP)).toBe(true);
    const alt1 = parseHotkey('alt.1', true);
    expect(matchesHotkey(down({ key: '¡', code: 'Digit1', altKey: true }), alt1)).toBe(true);
  });

  it('matches letters case-insensitively', () => {
    expect(matchesHotkey(down({ key: 'K', code: 'KeyK', ctrlKey: true }), parseHotkey('mod.k', false))).toBe(true);
  });
});
