import { isSafeUrl } from './url';

describe('isSafeUrl', () => {
  it.each(['https://example.com', 'http://example.com/x', 'mailto:a@b.dk', 'tel:+4512345678', '/admin', '?q=1', '#top', 'docs/page'])(
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
});
