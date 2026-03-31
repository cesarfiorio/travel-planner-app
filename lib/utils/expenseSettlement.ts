import type { ExpenseWithSplits } from '../hooks/useExpenses';

/** Expense with no positive owed amounts counts as settled for filtering. */
export function expenseHistoryBucket(expense: Pick<ExpenseWithSplits, 'expense_splits'>): 'active' | 'settled' {
  const splits = expense.expense_splits ?? [];
  const owed = splits.filter((s) => s.amount_owed_cents > 0);
  if (owed.length === 0) {
    return 'settled';
  }
  return owed.every((s) => s.is_settled) ? 'settled' : 'active';
}
