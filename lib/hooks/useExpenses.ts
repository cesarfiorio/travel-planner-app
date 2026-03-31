import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { hasSupabaseEnv, supabase } from '../supabase';
import type { Tables } from '../supabase/types';

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
    return { ...row, expense_splits: list };
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
