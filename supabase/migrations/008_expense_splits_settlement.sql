-- Settlement: mark debtor split lines as paid for balance / history
ALTER TABLE public.expense_splits
  ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_expense_splits_settled ON public.expense_splits (expense_id, user_id)
  WHERE is_settled = true;
