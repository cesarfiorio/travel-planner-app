/**
 * Pure expense math. Amounts are always integer cents.
 */

export type ExpenseForBalance = {
  id: string;
  paid_by_user_id: string;
  amount_cents: number;
};

export type SplitForBalance = {
  expense_id: string;
  user_id: string;
  amount_owed_cents: number;
};

export type SimplifiedDebt = { from: string; to: string; cents: number };

/** Convert a decimal currency amount (e.g. 42.5 dollars) to cents. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

/**
 * Equal split with remainder assigned 1¢ to the first N members (sorted by user id for stability).
 */
export function calculateEqualSplits(totalCents: number, memberIds: string[]): Record<string, number> {
  const n = memberIds.length;
  if (n <= 0 || totalCents < 0) {
    return {};
  }
  const sorted = [...memberIds].sort();
  const base = Math.floor(totalCents / n);
  const remainder = totalCents % n;
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    out[sorted[i]] = base + (i < remainder ? 1 : 0);
  }
  return out;
}

/**
 * Net balance per user (cents). Positive = others owe you; negative = you owe others.
 * Sums to zero when each expense's splits sum to its total.
 */
export function calculateBalances(
  expenses: ExpenseForBalance[],
  splits: SplitForBalance[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  const byExpense = new Map<string, SplitForBalance[]>();
  for (const s of splits) {
    const list = byExpense.get(s.expense_id) ?? [];
    list.push(s);
    byExpense.set(s.expense_id, list);
  }
  for (const e of expenses) {
    const rows = byExpense.get(e.id) ?? [];
    for (const row of rows) {
      balances[row.user_id] = (balances[row.user_id] ?? 0) - row.amount_owed_cents;
    }
    balances[e.paid_by_user_id] = (balances[e.paid_by_user_id] ?? 0) + e.amount_cents;
  }
  return balances;
}

/**
 * Greedy simplification: minimize cash flows (not necessarily globally optimal, but standard practice).
 */
export function simplifyDebts(balances: Record<string, number>): SimplifiedDebt[] {
  const b: Record<string, number> = { ...balances };
  const result: SimplifiedDebt[] = [];

  for (let iter = 0; iter < 10000; iter++) {
    let debtor = '';
    let creditor = '';
    let minVal = 0;
    let maxVal = 0;
    for (const k of Object.keys(b)) {
      const v = b[k];
      if (v < minVal) {
        minVal = v;
        debtor = k;
      }
      if (v > maxVal) {
        maxVal = v;
        creditor = k;
      }
    }
    if (minVal >= 0 && maxVal <= 0) {
      break;
    }
    if (minVal >= 0 || maxVal <= 0 || !debtor || !creditor) {
      break;
    }
    const pay = Math.min(-minVal, maxVal);
    if (pay <= 0) {
      break;
    }
    result.push({ from: debtor, to: creditor, cents: pay });
    b[debtor] += pay;
    b[creditor] -= pay;
  }
  return result;
}

/** Sum of custom split cents must equal total (e.g. after toCents on each input). */
export function validateCustomSplitsSum(
  totalCents: number,
  perMemberCents: Record<string, number>,
): boolean {
  const sum = Object.values(perMemberCents).reduce((a, v) => a + v, 0);
  return sum === totalCents;
}
