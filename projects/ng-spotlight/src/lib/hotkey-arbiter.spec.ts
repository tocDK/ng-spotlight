import { SpotlightHotkeyArbiter, type SpotlightHotkeyClient } from './hotkey-arbiter';
import { parseHotkey } from './hotkeys';

const ctrlK = parseHotkey('ctrl.k', false);
const event = () => new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true });

function client(open = false, hotkeys = [ctrlK]): SpotlightHotkeyClient & { open: boolean } {
  const c = { open, openedAt: 0, hotkeys: () => hotkeys, isOpen: () => c.open };
  return c;
}

describe('SpotlightHotkeyArbiter', () => {
  it('returns null when no palette listens for the key', () => {
    const arbiter = new SpotlightHotkeyArbiter();
    arbiter.register(client(false, []));
    expect(arbiter.handler(event())).toBeNull();
  });

  it('prefers an open palette, then the latest opened, then the first registered', () => {
    const arbiter = new SpotlightHotkeyArbiter();
    const first = client();
    const second = client();
    arbiter.register(first);
    arbiter.register(second);
    expect(arbiter.handler(event())).toBe(first);
    arbiter.opened(second);
    expect(arbiter.handler(event())).toBe(second);
    arbiter.opened(first);
    second.open = true;
    expect(arbiter.handler(event())).toBe(second);
  });

  it('keeps one decision per event, even when state changes between listeners', () => {
    const arbiter = new SpotlightHotkeyArbiter();
    const first = client();
    const second = client();
    arbiter.register(first);
    arbiter.register(second);
    const e = event();
    expect(arbiter.handler(e)).toBe(first);
    second.open = true;
    expect(arbiter.handler(e)).toBe(first);
  });

  it('unregisters once, and a second call is harmless', () => {
    const arbiter = new SpotlightHotkeyArbiter();
    const only = client();
    const unregister = arbiter.register(only);
    unregister();
    unregister();
    expect(arbiter.handler(event())).toBeNull();
  });
});
