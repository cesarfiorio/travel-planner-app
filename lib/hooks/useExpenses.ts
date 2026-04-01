import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';
import { expenseIdsForSettlingDebt } from '../utils/splitCalculator';

import { useAuth } from './useAuth';
import { tripDetailQueryKey } from './useTrips';

export type ExpenseWithSplits = Tables<'expenses'> & {
  expense_splits: Tables<'expense_splits'>[] | null;
};

export const expensesQueryKey = (tripId: string) => ['expenses', tripId] as const;

async function fetchTripExpenses(tripId: string): Promise<ExpenseWithSplits[]> {
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_splits(*)')
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => {
    const raw = row as ExpenseWithSplits & { expense_splits?: Tables<'expense_splits'> | Tables<'expense_splits'>[] };
    const splits = raw.expense_splits;
    const list = Array.isArray(splits) ? splits : splits ? [splits] : [];
    return {
      ...row,
      expense_splits: list.map((s) => ({
        ...s,
        is_settled: s.is_settled ?? false,
        settled_at: s.settled_at ?? null,
      })),
    };
  }) as ExpenseWithSplits[];
}

export function useTripExpenses(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? '';

  const query = useQuery({
    queryKey: expensesQueryKey(tripId ?? ''),
    enabled: Boolean(tripId && uid && hasSupabaseEnv && supabase),
    queryFn: () => fetchTripExpenses(tripId!),
  });

  useEffect(() => {
    if (!tripId || !supabase || !uid) {
      return;
    }

    const channel = supabase
      .channel(`trip-expenses-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_splits' },
        async (payload) => {
          const client = supabase;
          if (!client) {
            return;
          }
          const row = (payload.new ?? payload.old) as { expense_id?: string } | null;
          const eid = row?.expense_id;
          if (!eid) {
            void queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
            return;
          }
          const { data } = await client.from('expenses').select('trip_id').eq('id', eid).maybeSingle();
          if (data?.trip_id === tripId) {
            void queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
          }
        },
      )
      .subscribe();

    return () => {
      if (supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [tripId, uid, queryClient]);

  return query;
}

export type AddExpenseInput = {
  tripId: string;
  title: string;
  amountCents: number;
  currency: string;
  category: string;
  expenseDate: string;
  paidByUserId: string;
  splits: { user_id: string; amount_owed_cents: number }[];
};

/** Settle a simplified debt edge: debtor repays creditor for `amountCents` (only matching splits are updated). */
export type SettleDebtInput = {
  debtorUserId: string;
  creditorUserId: string;
  amountCents: number;
};

export function useSettleDebt(tripId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SettleDebtInput): Promise<void> => {
      if (!supabase || !tripId) {
        throw new Error('Not configured');
      }
      let list = queryClient.getQueryData<ExpenseWithSplits[]>(expensesQueryKey(tripId));
      if (!list?.length) {
        list = await fetchTripExpenses(tripId);
      }
      const expenseIds = expenseIdsForSettlingDebt(
        list,
        input.debtorUserId,
        input.creditorUserId,
        input.amountCents,
      );
      if (expenseIds.length === 0) {
        return;
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('expense_splits')
        .update({ is_settled: true, settled_at: now })
        .in('expense_id', expenseIds)
        .eq('user_id', input.debtorUserId);
      if (error) {
        throw error;
      }
    },
    onMutate: async (input) => {
      if (!tripId) {
        return { previous: undefined as ExpenseWithSplits[] | undefined };
      }
      await queryClient.cancelQueries({ queryKey: expensesQueryKey(tripId) });
      const previous = queryClient.getQueryData<ExpenseWithSplits[]>(expensesQueryKey(tripId));
      const now = new Date().toISOString();
      if (previous) {
        const ids = new Set(
          expenseIdsForSettlingDebt(previous, input.debtorUserId, input.creditorUserId, input.amountCents),
        );
        queryClient.setQueryData(
          expensesQueryKey(tripId),
          previous.map((e) =>
            ids.has(e.id)
              ? {
                  ...e,
                  expense_splits: (e.expense_splits ?? []).map((s) =>
                    s.user_id === input.debtorUserId ? { ...s, is_settled: true, settled_at: now } : s,
                  ),
                }
              : e,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (tripId && ctx?.previous) {
        queryClient.setQueryData(expensesQueryKey(tripId), ctx.previous);
      }
    },
    onSuccess: () => {
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
      }
    },
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (input: AddExpenseInput): Promise<void> => {
      if (!supabase || !userId) {
        throw new Error('Not signed in');
      }
      const { data: exp, error: e1 } = await supabase
        .from('expenses')
        .insert({
          trip_id: input.tripId,
          title: input.title.trim(),
          amount_cents: input.amountCents,
          currency: input.currency,
          category: input.category,
          expense_date: input.expenseDate,
          paid_by_user_id: input.paidByUserId,
        })
        .select('id')
        .single();

      if (e1 || !exp) {
        throw e1 ?? new Error('insert expense');
      }

      const rows = input.splits.map((s) => ({
        expense_id: exp.id,
        user_id: s.user_id,
        amount_owed_cents: s.amount_owed_cents,
      }));

      const { error: e2 } = await supabase.from('expense_splits').insert(rows);
      if (e2) {
        throw e2;
      }
    },
    onSuccess: (_void, vars) => {
      void queryClient.invalidateQueries({ queryKey: expensesQueryKey(vars.tripId) });
      void queryClient.invalidateQueries({ queryKey: tripDetailQueryKey(vars.tripId) });
    },
  });
}
