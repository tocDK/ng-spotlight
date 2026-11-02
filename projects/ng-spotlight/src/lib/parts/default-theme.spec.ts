import { SPOTLIGHT_DEFAULT_CSS } from './default-theme';

describe('SPOTLIGHT_DEFAULT_CSS', () => {
  it('parses in jsdom without errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const write = vi.spyOn(process.stderr, 'write');
    const style = document.createElement('style');
    style.textContent = SPOTLIGHT_DEFAULT_CSS;
    document.head.appendChild(style);
    expect(style.sheet!.cssRules.length).toBeGreaterThan(0);
    expect(error).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    style.remove();
    vi.restoreAllMocks();
  });
});
