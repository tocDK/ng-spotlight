const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * true for http(s), mailto, tel and path-relative URLs (`/x`, `./x`, `x`, `?q`, `#h`).
 *
 * - Browsers drop ASCII tab/newline and leading control characters before reading the scheme
 *   ("java\nscript:" runs script), so those are removed before the check.
 * - Protocol-relative URLs (`//host`, and `\\host` or `/\host`, since browsers read `\` as `/`
 *   in http(s) URLs) point at another site, so they do not count as relative.
 */
export function isSafeUrl(url: string): boolean {
  // What the browser parses: leading C0 controls and spaces stripped, tab/LF/CR removed anywhere.
  const parsed = url.replace(/^[\u0000- \u007f]+/, '').replace(/[\t\n\r]/g, '');
  if (/^[/\\]{2}/.test(parsed)) return false;
  const compact = url.replace(/[\u0000- \u007f]/g, '');
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  return match === null || ALLOWED_SCHEMES.has(match[1].toLowerCase());
}
