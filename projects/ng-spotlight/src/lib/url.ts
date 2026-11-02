const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/**
 * true for http(s), mailto, tel and relative URLs. Browsers drop ASCII tab/newline and
 * leading control characters before reading the scheme ("java\nscript:" runs script), so
 * those are removed before the check.
 */
export function isSafeUrl(url: string): boolean {
  const compact = url.replace(/[\u0000- \u007f]/g, '');
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  return match === null || ALLOWED_SCHEMES.has(match[1].toLowerCase());
}
