import { isSafeUrl } from './url';

describe('isSafeUrl', () => {
  it.each([
    'https://example.com',
    'http://example.com/x',
    'mailto:a@b.dk',
    'tel:+4512345678',
    '/admin',
    './admin',
    '../admin',
    '?q=1',
    '#top',
    'docs/page',
    '/admin//nested',
    './/still-a-path',
    '/ /a-path-with-a-space',
  ])(
    'allows %s',
    (url) => {
      expect(isSafeUrl(url)).toBe(true);
    },
  );

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\nscript:alert(1)',
    'java\tscript:alert(1)',
    '\u0001javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'java\rscript:alert(1)',
    'java\u007fscript:alert(1)',
    'foo:bar',
  ])('blocks %j', (url) => {
    expect(isSafeUrl(url)).toBe(false);
  });

  // Protocol-relative URLs leave the site: the browser reads "//host" (and "\\host", "/\\host" for
  // http(s) pages) as a new host. Only path-relative URLs count as relative.
  it.each([
    '//evil.com',
    '//evil.com/path?q=1',
    '\\\\evil.com',
    '/\\evil.com',
    '\\/evil.com',
    ' //evil.com',
    '\t//evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r\n/evil.com',
    '\u0000//evil.com',
    '\u001f/\\evil.com',
    '\u007f//evil.com',
  ])('blocks the protocol-relative %j', (url) => {
    expect(isSafeUrl(url)).toBe(false);
  });
});
