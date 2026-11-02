import { Injectable } from '@angular/core';
import { matchesHotkey, type ParsedHotkey } from './hotkeys';

/** One <spotlight-host> as the arbiter sees it. */
export interface SpotlightHotkeyClient {
  hotkeys: () => readonly ParsedHotkey[];
  isOpen: () => boolean;
  /** Set by the arbiter: when this palette was last opened (0 = never). */
  openedAt: number;
}

/**
 * Decides which palette reacts when several `<spotlight-host>`s listen for the same hotkey
 * (for example the app shell's palette next to an `isolated` one), so one key press never opens
 * two palettes or toggles a shared one twice. Exactly one palette reacts:
 *
 * 1. an open palette, so the hotkey closes it (the one opened last if several are open);
 * 2. otherwise the palette opened most recently (by hotkey, trigger or `open()`);
 * 3. before any palette has been opened, the `<spotlight-host>` created first, normally the
 *    app shell's.
 *
 * Only palettes whose own hotkeys match the event take part. Internal; not exported.
 */
@Injectable({ providedIn: 'root' })
export class SpotlightHotkeyArbiter {
  private readonly clients: SpotlightHotkeyClient[] = [];
  private clock = 0;
  /** The decision for each event, so every host's listener for one key press agrees. */
  private readonly decisions = new WeakMap<Event, SpotlightHotkeyClient | null>();

  register(client: SpotlightHotkeyClient): () => void {
    this.clients.push(client);
    return () => {
      const index = this.clients.indexOf(client);
      if (index !== -1) this.clients.splice(index, 1);
    };
  }

  opened(client: SpotlightHotkeyClient): void {
    client.openedAt = ++this.clock;
  }

  /** The one palette that handles this hotkey event, or null when none listens for it. */
  handler(event: KeyboardEvent): SpotlightHotkeyClient | null {
    const known = this.decisions.get(event);
    if (known !== undefined) return known;
    const candidates = this.clients.filter((c) => c.hotkeys().some((hotkey) => matchesHotkey(event, hotkey)));
    // Stable sort: equal openedAt (never opened) keeps creation order.
    const latestFirst = (list: SpotlightHotkeyClient[]) => [...list].sort((a, b) => b.openedAt - a.openedAt);
    const choice = latestFirst(candidates.filter((c) => c.isOpen()))[0] ?? latestFirst(candidates)[0] ?? null;
    this.decisions.set(event, choice);
    return choice;
  }
}
