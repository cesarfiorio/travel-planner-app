import {
  calculateBalances,
  calculateEqualSplits,
  simplifyDebts,
  toCents,
  validateCustomSplitsSum,
} from '../splitCalculator';

describe('toCents', () => {
  it('rounds dollars to cents', () => {
    expect(toCents(42.5)).toBe(4250);
    expect(toCents(100)).toBe(10000);
    expect(toCents(0.01)).toBe(1);
  });

  it('handles typical float noise', () => {
    expect(toCents(33.33 * 3)).toBe(9999);
    expect(toCents(10.2)).toBe(1020);
  });
});

describe('calculateEqualSplits', () => {
  it('splits $100 / 3 with remainder on first members', () => {
    const ids = ['a', 'b', 'c'];
    const total = toCents(100);
    const splits = calculateEqualSplits(total, ids);
    const sortedIds = [...ids].sort();
    expect(splits[sortedIds[0]]).toBe(3334);
    expect(splits[sortedIds[1]]).toBe(3333);
    expect(splits[sortedIds[2]]).toBe(3333);
    expect(splits[sortedIds[0]]! + splits[sortedIds[1]]! + splits[sortedIds[2]]!).toBe(10000);
  });

  it('divides evenly when possible', () => {
    const splits = calculateEqualSplits(900, ['x', 'y', 'z']);
    expect(splits['x'] + splits['y'] + splits['z']).toBe(900);
    expect(splits['x']).toBe(300);
    expect(splits['y']).toBe(300);
    expect(splits['z']).toBe(300);
  });
});

describe('calculateBalances', () => {
  it('balances sum to zero', () => {
    const expenses = [
      { id: 'e1', paid_by_user_id: 'alice', amount_cents: 10000 },
      { id: 'e2', paid_by_user_id: 'bob', amount_cents: 3000 },
    ];
    const splits = [
      { expense_id: 'e1', user_id: 'alice', amount_owed_cents: 5000 },
      { expense_id: 'e1', user_id: 'bob', amount_owed_cents: 5000 },
      { expense_id: 'e2', user_id: 'alice', amount_owed_cents: 1000 },
      { expense_id: 'e2', user_id: 'bob', amount_owed_cents: 2000 },
    ];
    const b = calculateBalances(expenses, splits);
    const sum = Object.values(b).reduce((a, v) => a + v, 0);
    expect(sum).toBe(0);
  });

  it('one payer two-way equal split', () => {
    const expenses = [{ id: 'e1', paid_by_user_id: 'a', amount_cents: 100 }];
    const splits = [
      { expense_id: 'e1', user_id: 'a', amount_owed_cents: 50 },
      { expense_id: 'e1', user_id: 'b', amount_owed_cents: 50 },
    ];
    const b = calculateBalances(expenses, splits);
    expect(b['a']).toBe(50);
    expect(b['b']).toBe(-50);
  });
});

describe('simplifyDebts', () => {
  it('reduces to at most n-1 edges for n people with zero sum', () => {
    const balances = { a: 30, b: -10, c: -20 };
    const edges = simplifyDebts(balances);
    expect(edges.length).toBeLessThanOrEqual(2);
    const check: Record<string, number> = { ...balances };
    for (const e of edges) {
      check[e.from] = (check[e.from] ?? 0) + e.cents;
      check[e.to] = (check[e.to] ?? 0) - e.cents;
    }
    expect(check['a']).toBe(0);
    expect(check['b']).toBe(0);
    expect(check['c']).toBe(0);
  });
});

describe('validateCustomSplitsSum', () => {
  it('validates exact sum', () => {
    expect(validateCustomSplitsSum(100, { a: 40, b: 60 })).toBe(true);
    expect(validateCustomSplitsSum(100, { a: 40, b: 59 })).toBe(false);
  });
});
