import { z } from "zod";
import type { Expense } from "./expenses";

export const searchCriteriaSchema = z.object({
  terms: z.array(z.string()),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  minimumAmount: z.number().nullable(),
  maximumAmount: z.number().nullable(),
  currency: z.string().nullable(),
  onlyMine: z.boolean(),
}).strict();

export type SearchCriteria = z.infer<typeof searchCriteriaSchema>;
export type ExpenseSearchResult = { expenses: Expense[]; count: number; criteria: SearchCriteria } | { error: string };

export function matchExpenseCriteria(expenses: Expense[], criteria: SearchCriteria, userId: string) {
  const terms = criteria.terms.map((term) => term.trim().toLowerCase()).filter(Boolean);
  return expenses.filter((expense) => {
    if (expense.is_deleted) return false;
    if (criteria.onlyMine && expense.created_by_user_id !== userId) return false;
    if (criteria.startDate && expense.expense_date < criteria.startDate) return false;
    if (criteria.endDate && expense.expense_date > criteria.endDate) return false;
    if (criteria.minimumAmount !== null && expense.amount < criteria.minimumAmount) return false;
    if (criteria.maximumAmount !== null && expense.amount > criteria.maximumAmount) return false;
    if (criteria.currency && expense.currency.toUpperCase() !== criteria.currency.toUpperCase()) return false;
    const text = [expense.description, expense.vendor, expense.category, expense.subcategory, expense.notes, expense.created_by_name, expense.payment_method, expense.account].join(" ").toLowerCase();
    return terms.length === 0 || terms.some((term) => text.includes(term));
  }).sort((a, b) => b.expense_date.localeCompare(a.expense_date));
}