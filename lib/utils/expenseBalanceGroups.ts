import type { ExpenseWithSplits } from '../hooks/useExpenses';
import { calculateBalances, simplifyDebts, type SimplifiedDebt } from './splitCalculator';

export type CurrencyGroup = {
  currency: string;
  balances: Record<string, number>;
  simplified: SimplifiedDebt[];
};

export function groupExpensesByCurrency(expenses: ExpenseWithSplits[]): CurrencyGroup[] {
  const byCur = new Map<string, { exps: ExpenseWithSplits[] }>();
  for (const e of expenses) {
    const c = e.currency || 'USD';
    const g = byCur.get(c) ?? { exps: [] };
    g.exps.push(e);
    byCur.set(c, g);
  }

  const groups: CurrencyGroup[] = [];
  for (const [currency, { exps }] of byCur) {
    const expPart = exps.map((e) => ({ id: e.id, paid_by_user_id: e.paid_by_user_id, amount_cents: e.amount_cents }));
    const splitPart = exps.flatMap((e) =>
      (e.expense_splits ?? []).map((s) => ({
        expense_id: e.id,
        user_id: s.user_id,
        amount_owed_cents: s.amount_owed_cents,
        is_settled: s.is_settled ?? false,
      })),
    );
    const balances = calculateBalances(expPart, splitPart);
    const simplified = simplifyDebts(balances).map((d) => ({ ...d, currency }));
    groups.push({ currency, balances, simplified });
  }
  return groups;
}
