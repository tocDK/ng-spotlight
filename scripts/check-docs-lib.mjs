/** Extractor and matcher for scripts/check-docs.mjs (kept separate so a spec can exercise them). */

/** Names exported by a public-api.ts source. Throws on `export *` forms, which hide names from the check. */
export function extractExports(source) {
  const names = new Set();
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (/export\s+(?:type\s+)?\*/.test(stripped)) {
    throw new Error("`export * from` / `export * as` hides names from the docs check; list the exports explicitly");
  }
  const braceRe = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  let match;
  while ((match = braceRe.exec(stripped)) !== null) {
    for (const raw of match[1].split(',')) {
      let name = raw.trim();
      if (!name) continue;
      if (name.startsWith('type ')) name = name.slice(5).trim();
      const asIndex = name.indexOf(' as ');
      if (asIndex > 0) name = name.slice(asIndex + 4).trim();
      if (name) names.add(name);
    }
  }
  const declRe = /export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  while ((match = declRe.exec(stripped)) !== null) names.add(match[1]);
  return [...names];
}


function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when `name` appears in `text` as a whole identifier (not as a prefix/suffix of another one). */
export function mentions(text, name) {
  return new RegExp('(?<![\\w$])' + escapeRegExp(name) + '(?![\\w$])').test(text);
}
