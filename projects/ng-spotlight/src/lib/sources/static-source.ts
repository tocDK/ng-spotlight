import type { SpotlightItem, SpotlightItemInput, SpotlightSource } from '../types';

export interface StaticSourceOptions {
  /** Default `static:<group>`. */
  id?: string;
  group: string;
  items: SpotlightItemInput[];
  prefix?: string;
  priority?: number;
}

/** Fixed commands. Results are local: the library ranks and filters them. */
export function staticSource(options: StaticSourceOptions): SpotlightSource {
  const seen = new Set<string>();
  const items: SpotlightItem[] = [];
  for (const input of options.items) {
    const item: SpotlightItem = { ...input, group: input.group ?? options.group };
    // Ids must be unique per group; a later duplicate is dropped (as normalizeResult does).
    const key = `${item.group}::${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return {
    id: options.id ?? `static:${options.group}`,
    group: options.group,
    prefix: options.prefix,
    priority: options.priority,
    local: true,
    search: () => items,
  };
}
