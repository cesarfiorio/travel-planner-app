import { formatAmount } from '../../../constants/currencies';
import {
  calculateBalances,
  calculateEqualSplits,
  expenseIdsForSettlingDebt,
  fromCents,
  simplifyDebts,
  sumBalances,
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

  it('uses whole minor units for zero-decimal currencies', () => {
    expect(toCents(1000, 'JPY')).toBe(1000);
    expect(toCents(1500, 'CLP')).toBe(1500);
  });
});

describe('fromCents', () => {
  it('inverts toCents for USD and JPY', () => {
    expect(fromCents(4250, 'USD')).toBe(42.5);
    expect(fromCents(1000, 'JPY')).toBe(1000);
  });
});

describe('formatAmount', () => {
  it('formats minor units for zero-decimal and two-decimal currencies', () => {
    expect(toCents(1000, 'JPY')).toBe(1000);
    expect(toCents(42.5, 'USD')).toBe(4250);
    expect(formatAmount(1000, 'JPY')).toBe('¥1000');
    expect(formatAmount(4250, 'USD')).toBe('$42.50');
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
    expect(sumBalances(b)).toBe(0);
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
    expect(sumBalances(b)).toBe(0);
  });

  it('treats settled splits as repaid to payer', () => {
    const expenses = [{ id: 'e1', paid_by_user_id: 'alice', amount_cents: 100 }];
    const splits = [
      { expense_id: 'e1', user_id: 'alice', amount_owed_cents: 50, is_settled: true },
      { expense_id: 'e1', user_id: 'bob', amount_owed_cents: 50, is_settled: false },
    ];
    const b = calculateBalances(expenses, splits);
    expect(b['alice']).toBe(50);
    expect(b['bob']).toBe(-50);
    expect(sumBalances(b)).toBe(0);
  });

  it('zero net when all shares settled', () => {
    const expenses = [{ id: 'e1', paid_by_user_id: 'alice', amount_cents: 100 }];
    const splits = [
      { expense_id: 'e1', user_id: 'alice', amount_owed_cents: 50, is_settled: true },
      { expense_id: 'e1', user_id: 'bob', amount_owed_cents: 50, is_settled: true },
    ];
    const b = calculateBalances(expenses, splits);
    expect(b['alice'] ?? 0).toBe(0);
    expect(b['bob'] ?? 0).toBe(0);
    expect(sumBalances(b)).toBe(0);
  });

  /** Case 1: A paid $90, split 3 ways equally → B and C each owe A $30 */
  it('Case 1: one payer three-way equal split and simplifyDebts', () => {
    const expenses = [{ id: 'e1', paid_by_user_id: 'A', amount_cents: 9000 }];
    const splits = [
      { expense_id: 'e1', user_id: 'A', amount_owed_cents: 3000 },
      { expense_id: 'e1', user_id: 'B', amount_owed_cents: 3000 },
      { expense_id: 'e1', user_id: 'C', amount_owed_cents: 3000 },
    ];
    const b = calculateBalances(expenses, splits);
    expect(sumBalances(b)).toBe(0);
    expect(b['A']).toBe(6000);
    expect(b['B']).toBe(-3000);
    expect(b['C']).toBe(-3000);
    const edges = simplifyDebts(b);
    expect(edges).toEqual(
      expect.arrayContaining([
        { from: 'B', to: 'A', cents: 3000 },
        { from: 'C', to: 'A', cents: 3000 },
      ]),
    );
    expect(edges.length).toBe(2);
  });

  /** Case 2: A paid $90 and B paid $60, each split 3× equal among A,B,C */
  it('Case 2: two payers three-way splits — balances sum to zero', () => {
    const expenses = [
      { id: 'e1', paid_by_user_id: 'A', amount_cents: 9000 },
      { id: 'e2', paid_by_user_id: 'B', amount_cents: 6000 },
    ];
    const splits = [
      { expense_id: 'e1', user_id: 'A', amount_owed_cents: 3000 },
      { expense_id: 'e1', user_id: 'B', amount_owed_cents: 3000 },
      { expense_id: 'e1', user_id: 'C', amount_owed_cents: 3000 },
      { expense_id: 'e2', user_id: 'A', amount_owed_cents: 2000 },
      { expense_id: 'e2', user_id: 'B', amount_owed_cents: 2000 },
      { expense_id: 'e2', user_id: 'C', amount_owed_cents: 2000 },
    ];
    const b = calculateBalances(expenses, splits);
    expect(sumBalances(b)).toBe(0);
    expect(b['A']).toBe(4000);
    expect(b['B']).toBe(1000);
    expect(b['C']).toBe(-5000);
    const edges = simplifyDebts(b);
    let check: Record<string, number> = { ...b };
    for (const e of edges) {
      check[e.from] = (check[e.from] ?? 0) + e.cents;
      check[e.to] = (check[e.to] ?? 0) - e.cents;
    }
    expect(sumBalances(check)).toBe(0);
    expect(check['A'] ?? 0).toBe(0);
    expect(check['B'] ?? 0).toBe(0);
    expect(check['C'] ?? 0).toBe(0);
  });

  /** Case 3: B settles $30 to A — mark B split on A-paid expense settled */
  it('Case 3: after settling B→A $30, creditor balance drops by $30', () => {
    const expenses = [{ id: 'e1', paid_by_user_id: 'A', amount_cents: 9000 }];
    const splitsBefore = [
      { expense_id: 'e1', user_id: 'A', amount_owed_cents: 3000 },
      { expense_id: 'e1', user_id: 'B', amount_owed_cents: 3000 },
      { expense_id: 'e1', user_id: 'C', amount_owed_cents: 3000 },
    ];
    expect(sumBalances(calculateBalances(expenses, splitsBefore))).toBe(0);

    const splitsAfter = splitsBefore.map((s) =>
      s.user_id === 'B' ? { ...s, is_settled: true as const } : s,
    );
    const b2 = calculateBalances(expenses, splitsAfter);
    expect(sumBalances(b2)).toBe(0);
    expect(b2['A']).toBe(3000);
    expect(b2['B'] ?? 0).toBe(0);
    expect(b2['C']).toBe(-3000);
  });
});

describe('expenseIdsForSettlingDebt', () => {
  it('only picks expenses paid by the creditor with unsettled debtor split', () => {
    const expenses = [
      {
        id: 'e-alice',
        paid_by_user_id: 'alice',
        expense_splits: [
          { user_id: 'bob', amount_owed_cents: 4200, is_settled: false },
          { user_id: 'carol', amount_owed_cents: 1000, is_settled: false },
        ],
      },
      {
        id: 'e-bob-paid',
        paid_by_user_id: 'bob',
        expense_splits: [{ user_id: 'alice', amount_owed_cents: 5000, is_settled: false }],
      },
    ];
    const ids = expenseIdsForSettlingDebt(expenses, 'bob', 'alice', 4200);
    expect(ids).toEqual(['e-alice']);
    expect(ids).not.toContain('e-bob-paid');
  });

  it('returns exact subset when possible', () => {
    const expenses = [
      {
        id: 'e1',
        paid_by_user_id: 'pedro',
        expense_splits: [
          { user_id: 'ana', amount_owed_cents: 2000, is_settled: false },
          { user_id: 'pedro', amount_owed_cents: 1000, is_settled: false },
        ],
      },
      {
        id: 'e2',
        paid_by_user_id: 'pedro',
        expense_splits: [{ user_id: 'ana', amount_owed_cents: 2200, is_settled: false }],
      },
    ];
    const ids = expenseIdsForSettlingDebt(expenses, 'ana', 'pedro', 4200);
    expect(ids.sort()).toEqual(['e1', 'e2'].sort());
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
