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
  const items: SpotlightItem[] = options.items.map((item) => ({ ...item, group: item.group ?? options.group }));
  return {
    id: options.id ?? `static:${options.group}`,
    group: options.group,
    prefix: options.prefix,
    priority: options.priority,
    local: true,
    search: () => items,
  };
}
