import { getCurrency } from '../../constants/currencies';

/**
 * Pure expense math. Amounts are stored as integer minor units (cents for USD; whole yen for JPY, etc.).
 *
 * EXPENSE: someone paid for the group; splits say how much each member owes the payer.
 * SETTLEMENT: marking is_settled on a split means that share was repaid to the payer — not a new expense.
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
  /** When true, that share no longer counts as owed; payer is treated as repaid this amount. */
  is_settled?: boolean | null;
};

export type SimplifiedDebt = { from: string; to: string; cents: number; currency?: string };

export type ExpenseForSettlementPick = {
  id: string;
  paid_by_user_id: string;
  expense_splits?: Array<{
    user_id: string;
    amount_owed_cents: number;
    is_settled?: boolean | null;
  }> | null;
};

/** Stored minor units → display amount (major units for 2-decimal currencies). */
export function fromCents(cents: number, currencyCode?: string): number {
  const c = getCurrency(currencyCode ?? 'USD');
  return c.decimalDigits === 0 ? cents : cents / 100;
}

/** User-entered amount → stored minor units. */
export function toCents(amount: number, currencyCode?: string): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  const c = getCurrency(currencyCode ?? 'USD');
  if (c.decimalDigits === 0) {
    return Math.round(amount);
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

/** Sum of all net balances (must be 0 when data is consistent). */
export function sumBalances(balances: Record<string, number>): number {
  return Object.values(balances).reduce((a, v) => a + v, 0);
}

/**
 * Net balance per user (cents). Positive = others owe you net; negative = you owe others net.
 *
 * For each expense: add amount_cents to the payer (they laid out cash).
 * For each split row:
 *   - Unsettled: that user still owes their share → subtract amount from that user.
 *   - Settled: that share was repaid to the payer → subtract amount from the payer (reduces how much they're still owed).
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
    balances[e.paid_by_user_id] = (balances[e.paid_by_user_id] ?? 0) + e.amount_cents;
    const rows = byExpense.get(e.id) ?? [];
    for (const row of rows) {
      if (row.is_settled) {
        balances[e.paid_by_user_id] = (balances[e.paid_by_user_id] ?? 0) - row.amount_owed_cents;
      } else {
        balances[row.user_id] = (balances[row.user_id] ?? 0) - row.amount_owed_cents;
      }
    }
  }

  return balances;
}

/**
 * Greedy simplification: repeatedly match the largest debtor to the largest creditor.
 * Input balances should come from calculateBalances() (unsettled splits only affect owed side).
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

type SettlementItem = { expenseId: string; cents: number };

/** Try exact subset sum; prefer fewer expenses on ties. */
function exactSubsetExpenseIds(items: SettlementItem[], targetCents: number): string[] | null {
  const n = items.length;
  if (n === 0 || targetCents <= 0) {
    return null;
  }
  if (n > 22) {
    return null;
  }
  let best: string[] | null = null;
  let bestSize = Infinity;
  for (let mask = 0; mask < 1 << n; mask++) {
    let s = 0;
    const ids: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        s += items[i].cents;
        ids.push(items[i].expenseId);
      }
    }
    if (s === targetCents && ids.length < bestSize) {
      best = ids;
      bestSize = ids.length;
    }
  }
  return best;
}

/** Greedy: largest shares first until sum >= target. */
function greedyCoverExpenseIds(items: SettlementItem[], targetCents: number): string[] {
  if (targetCents <= 0) {
    return [];
  }
  const sorted = [...items].sort((a, b) => b.cents - a.cents);
  let acc = 0;
  const ids: string[] = [];
  for (const it of sorted) {
    if (acc >= targetCents) {
      break;
    }
    ids.push(it.expenseId);
    acc += it.cents;
  }
  if (acc >= targetCents) {
    return ids;
  }
  // Not enough total to reach target — settle everything owed between this pair
  return items.map((x) => x.expenseId);
}

/**
 * Expense IDs whose debtor split should be marked settled for a direct payment debtor → creditor.
 * Only expenses paid by `creditorUserId` with an unsettled split for `debtorUserId` are candidates.
 * Prefers a subset whose split amounts sum exactly to `targetCents` (e.g. simplified edge amount).
 */
export function expenseIdsForSettlingDebt(
  expenses: ExpenseForSettlementPick[],
  debtorUserId: string,
  creditorUserId: string,
  targetCents: number,
): string[] {
  const items: SettlementItem[] = [];
  for (const e of expenses) {
    if (e.paid_by_user_id !== creditorUserId) {
      continue;
    }
    const sp = (e.expense_splits ?? []).find(
      (s) =>
        s.user_id === debtorUserId &&
        !(s.is_settled ?? false) &&
        Number.isFinite(s.amount_owed_cents) &&
        s.amount_owed_cents > 0,
    );
    if (sp) {
      items.push({ expenseId: e.id, cents: sp.amount_owed_cents });
    }
  }
  if (items.length === 0 || targetCents <= 0) {
    return [];
  }

  const exact = exactSubsetExpenseIds(items, targetCents);
  if (exact) {
    return exact;
  }
  return greedyCoverExpenseIds(items, targetCents);
}
