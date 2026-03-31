-- Store expense amounts as integer cents (no floating point in DB).

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_check;
ALTER TABLE public.expenses
  ALTER COLUMN amount TYPE BIGINT USING (ROUND(COALESCE(amount, 0) * 100)::bigint);
ALTER TABLE public.expenses RENAME COLUMN amount TO amount_cents;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_cents_nonneg CHECK (amount_cents >= 0);

ALTER TABLE public.expense_splits DROP CONSTRAINT IF EXISTS expense_splits_amount_owed_check;
ALTER TABLE public.expense_splits
  ALTER COLUMN amount_owed TYPE BIGINT USING (ROUND(COALESCE(amount_owed, 0) * 100)::bigint);
ALTER TABLE public.expense_splits RENAME COLUMN amount_owed TO amount_owed_cents;
ALTER TABLE public.expense_splits ADD CONSTRAINT expense_splits_amount_owed_nonneg CHECK (amount_owed_cents >= 0);

-- Realtime: Dashboard → Database → Publications → supabase_realtime, add `expenses` and `expense_splits`.
