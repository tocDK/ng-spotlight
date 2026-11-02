import { SpotlightEmptyTemplate, SpotlightItemTemplate } from './templates';

describe('template context guards', () => {
  it('accept any context (they only narrow types in templates)', () => {
    expect(SpotlightItemTemplate.ngTemplateContextGuard({} as SpotlightItemTemplate, {})).toBe(true);
    expect(SpotlightEmptyTemplate.ngTemplateContextGuard({} as SpotlightEmptyTemplate, {})).toBe(true);
  });
});
