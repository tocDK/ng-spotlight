import { rankItems, RECENT_BOOST, scoreItem, scoreText } from './rank';
import type { SpotlightItem } from './types';

const item = (id: string, title: string, keywords?: string[]): SpotlightItem => ({
  id,
  title,
  group: 'g',
  keywords,
  action: { route: `/${id}` },
});

describe('scoreText', () => {
  it('orders exact > title start > word start > subsequence, case-insensitively', () => {
    const exact = scoreText('Users', 'users');
    const start = scoreText('Users list', 'users');
    const word = scoreText('Super users', 'users');
    const subsequence = scoreText('Unused rows', 'users');
    expect(exact).toBeGreaterThan(start);
    expect(start).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(subsequence);
    expect(subsequence).toBeGreaterThan(0);
  });

  it('prefers tighter subsequences', () => {
    expect(scoreText('customers', 'cstm')).toBeGreaterThan(scoreText('c-s-t-m', 'cstm'));
  });

  it('returns -1 when the query is not a subsequence', () => {
    expect(scoreText('Orders', 'xyz')).toBe(-1);
  });

  it('treats word boundaries like space, dash, slash and dot', () => {
    expect(scoreText('admin/users', 'users')).toBe(scoreText('admin users', 'users'));
    expect(scoreText('admin-users', 'users')).toBe(scoreText('admin.users', 'users'));
  });
});

describe('rankItems', () => {
  it('ranks keyword matches below title matches of the same kind', () => {
    const ranked = rankItems([item('team', 'Team', ['users']), item('super', 'Super users'), item('users', 'Users')], 'users');
    expect(ranked.map((i) => i.id)).toEqual(['users', 'super', 'team']);
  });

  it('drops items that do not match', () => {
    expect(rankItems([item('a', 'Alpha'), item('b', 'Beta')], 'alp').map((i) => i.id)).toEqual(['a']);
  });

  it('keeps the original order for equal scores and for the empty query', () => {
    const items = [item('1', 'Order list'), item('2', 'Order lines')];
    expect(rankItems(items, 'order').map((i) => i.id)).toEqual(['1', '2']);
    expect(rankItems(items, '').map((i) => i.id)).toEqual(['1', '2']);
  });

  it('gives Recent items a small boost that breaks ties but not tiers', () => {
    const items = [item('1', 'Order list'), item('2', 'Order lines'), item('3', 'Orders')];
    // 'order': all three start with it (800 each), so source order holds until the boost.
    expect(rankItems(items, 'order').map((i) => i.id)).toEqual(['1', '2', '3']);
    expect(rankItems(items, 'order', new Set(['2'])).map((i) => i.id)).toEqual(['2', '1', '3']);
    // 'orders': exact (1000) stays first; the boost lifts '2' (subsequence 295) over '1' (297).
    expect(rankItems(items, 'orders').map((i) => i.id)).toEqual(['3', '1', '2']);
    expect(rankItems(items, 'orders', new Set(['2'])).map((i) => i.id)).toEqual(['3', '2', '1']);
    expect(scoreItem(items[1], 'order', new Set(['2']))).toBe((scoreItem(items[1], 'order', new Set()) ?? 0) + RECENT_BOOST);
  });
});
