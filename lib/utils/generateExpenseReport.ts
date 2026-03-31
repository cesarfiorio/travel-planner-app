import type { ExpenseWithSplits } from '../hooks/useExpenses';
import type { MemberProfileBrief, TripWithDetails } from '../hooks/useTrips';

import { calculateBalances, simplifyDebts, type SplitForBalance } from './splitCalculator';
import { formatCurrency } from './formatCurrency';

const PDF_LOCALE = 'en-US';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayName(p: MemberProfileBrief | undefined, fallback: string): string {
  return p?.display_name?.trim() || p?.full_name?.trim() || fallback;
}

export type ExpenseReportInput = {
  trip: TripWithDetails;
  expenses: ExpenseWithSplits[];
  profileById: Map<string, MemberProfileBrief>;
  memberIds: string[];
  /** Fallback label when i18n not available in PDF context */
  memberFallbackLabel: string;
};

/**
 * Builds print-ready HTML. Amounts use the same balance rules as the app (including settled splits).
 */
export function generateExpenseReport(input: ExpenseReportInput): string {
  const { trip, expenses, profileById, memberIds, memberFallbackLabel } = input;
  const currency = expenses[0]?.currency ?? 'EUR';

  const expPart = expenses.map((e) => ({
    id: e.id,
    paid_by_user_id: e.paid_by_user_id,
    amount_cents: e.amount_cents,
  }));
  const splitPart: SplitForBalance[] = expenses.flatMap((e) =>
    (e.expense_splits ?? []).map((s) => ({
      expense_id: e.id,
      user_id: s.user_id,
      amount_owed_cents: s.amount_owed_cents,
      is_settled: s.is_settled ?? false,
    })),
  );
  const balances = calculateBalances(expPart, splitPart);
  const simplified = simplifyDebts(balances);

  const totalSpentCents = expenses.reduce((a, e) => a + e.amount_cents, 0);
  const nMembers = Math.max(memberIds.length, 1);
  const avgCents = Math.round(totalSpentCents / nMembers);

  const tripName = escapeHtml(trip.name);
  const dest = trip.destination_label ? escapeHtml(trip.destination_label) : '—';
  const start = trip.start_date ?? '—';
  const end = trip.end_date ?? '—';

  const membersRows = memberIds
    .map((id) => {
      const name = escapeHtml(displayName(profileById.get(id), memberFallbackLabel));
      return `<tr><td>${name}</td></tr>`;
    })
    .join('');

  const expenseRows = expenses
    .map((e) => {
      const payer = escapeHtml(displayName(profileById.get(e.paid_by_user_id), memberFallbackLabel));
      const title = escapeHtml(e.title);
      const cat = e.category ? escapeHtml(e.category) : '—';
      const amount = formatCurrency(e.amount_cents, e.currency || currency, PDF_LOCALE);
      const splits = (e.expense_splits ?? [])
        .map((s) => {
          const nm = escapeHtml(displayName(profileById.get(s.user_id), memberFallbackLabel));
          const st = s.is_settled ? ' (settled)' : '';
          return `${nm}: ${formatCurrency(s.amount_owed_cents, e.currency || currency, PDF_LOCALE)}${st}`;
        })
        .join('<br/>');
      return `<tr>
        <td>${e.expense_date}</td>
        <td>${title}</td>
        <td>${cat}</td>
        <td>${payer}</td>
        <td style="text-align:right">${amount}</td>
      </tr>
      <tr class="sub"><td colspan="5">${splits || '—'}</td></tr>`;
    })
    .join('');

  const debtRows = simplified
    .map((d) => {
      const from = escapeHtml(displayName(profileById.get(d.from), memberFallbackLabel));
      const to = escapeHtml(displayName(profileById.get(d.to), memberFallbackLabel));
      const amt = formatCurrency(d.cents, currency, PDF_LOCALE);
      return `<tr><td>${from}</td><td>${to}</td><td style="text-align:right">${amt}</td></tr>`;
    })
    .join('');

  const balanceRows = memberIds
    .map((id) => {
      const b = balances[id] ?? 0;
      if (b === 0) {
        return '';
      }
      const name = escapeHtml(displayName(profileById.get(id), memberFallbackLabel));
      const label = formatCurrency(Math.abs(b), currency, PDF_LOCALE);
      const line = b > 0 ? `is owed ${label}` : `owes ${label}`;
      return `<tr><td>${name}</td><td>${line}</td></tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; padding: 24px; font-size: 12px; }
    h1 { font-size: 22px; margin: 0 0 4px 0; }
    h2 { font-size: 15px; margin: 20px 0 8px 0; color: #374151; }
    .brand { font-weight: 800; color: #ea580c; font-size: 14px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; font-weight: 700; }
    tr.sub td { font-size: 11px; color: #6b7280; background: #fafafa; }
    .summary { margin-top: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="brand">RouteFlow</div>
  <h1>Trip Expense Report</h1>
  <p><strong>Trip</strong> ${tripName}<br/>
  <strong>Destination</strong> ${dest}<br/>
  <strong>Dates</strong> ${start} → ${end}</p>

  <h2>Members</h2>
  <table><thead><tr><th>Name</th></tr></thead><tbody>${membersRows || '<tr><td>—</td></tr>'}</tbody></table>

  <h2>Expenses</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Title</th><th>Category</th><th>Paid by</th><th>Amount</th></tr>
    </thead>
    <tbody>${expenseRows || '<tr><td colspan="5">No expenses</td></tr>'}</tbody>
  </table>

  <h2>Final balances</h2>
  <table><thead><tr><th>Member</th><th>Status</th></tr></thead><tbody>${balanceRows || '<tr><td colspan="2">All settled</td></tr>'}</tbody></table>

  <h2>Simplified debts</h2>
  <table><thead><tr><th>From</th><th>To</th><th>Amount</th></tr></thead><tbody>${debtRows || '<tr><td colspan="3">None</td></tr>'}</tbody></table>

  <div class="summary">
    <strong>Total spent</strong> ${formatCurrency(totalSpentCents, currency, PDF_LOCALE)}<br/>
    <strong>Per-person average</strong> ${formatCurrency(avgCents, currency, PDF_LOCALE)} (${nMembers} members)
  </div>
</body>
</html>`;
}
