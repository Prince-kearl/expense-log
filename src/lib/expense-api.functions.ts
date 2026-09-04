import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  createExpense as createExpenseInDb,
  createExpenseCategory as createExpenseCategoryInDb,
  deleteExpenseById,
  getExpenseCategories,
  getExpensesForTeam,
  updateExpenseFields,
} from "./supabase-expenses.server";
import { requireCurrentUser } from "./session.server";

function requiredText(form: FormData, name: string, maximum = 240) {
  const value = form.get(name)?.toString().trim() ?? "";
  if (!value || value.length > maximum) throw new Error(`Enter a valid ${name}.`);
  return value;
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  return requireCurrentUser(getRequest());
});

export const getExpenses = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser(getRequest());
  return getExpensesForTeam(user.team_id);
});

export const getMyExpenses = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser(getRequest());
  return (await getExpensesForTeam(user.team_id)).filter((expense) => expense.created_by_user_id === user.user_id);
});

export const getExpenseConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser(getRequest());
  return { categories: await getExpenseCategories(user.team_id) };
});

export const createExpenseCategory = createServerFn({ method: "POST" })
  .validator((data: { category: string; subcategory: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    const category = data.category.trim().slice(0, 80);
    const subcategory = data.subcategory.trim().slice(0, 80);
    if (!category || !subcategory) throw new Error("Enter both a category and subcategory.");
    return createExpenseCategoryInDb(user.team_id, category, subcategory);
  });

export const createExpense = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected expense form data.");
    return data;
  })
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    const amount = Number(data.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
    const expenseDate = requiredText(data, "expense_date", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) throw new Error("Enter a valid expense date.");
    const receipts = data
      .getAll("receipts")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (receipts.length > 10) throw new Error("Upload a maximum of 10 receipt files.");

    return createExpenseInDb(
      user.team_id,
      { user_id: user.user_id, name: user.name, email: user.email },
      {
        expenseDate,
        description: requiredText(data, "description", 500),
        category: requiredText(data, "category"),
        subcategory: data.get("subcategory")?.toString().trim() ?? "",
        amount,
        currency: requiredText(data, "currency", 3),
        vendor: data.get("vendor")?.toString().trim() ?? "",
        paymentMethod: data.get("payment_method")?.toString().trim() ?? "",
        account: data.get("account")?.toString().trim() ?? "",
        notes: data.get("notes")?.toString().trim().slice(0, 500) ?? "",
      },
      receipts,
    );
  });

export const updateExpense = createServerFn({ method: "POST" })
  .validator(
    (data: {
      expenseId: string;
      amount: number;
      expenseDate: string;
      description: string;
      category: string;
      subcategory: string;
      currency: string;
      vendor: string;
      paymentMethod: string;
      account: string;
      notes: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error("Enter an amount greater than zero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.expenseDate)) throw new Error("Enter a valid expense date.");
    const description = data.description.trim().slice(0, 500);
    if (!description) throw new Error("Enter a valid description.");
    const category = data.category.trim();
    if (!category) throw new Error("Enter a valid category.");

    return updateExpenseFields(user.team_id, data.expenseId, user.user_id, {
      expenseDate: data.expenseDate,
      description,
      category,
      subcategory: data.subcategory.trim(),
      amount: data.amount,
      currency: data.currency.trim().slice(0, 3) || "GHC",
      vendor: data.vendor.trim(),
      paymentMethod: data.paymentMethod.trim(),
      account: data.account.trim(),
      notes: data.notes.trim().slice(0, 500),
    });
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .validator((data: { expenseId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireCurrentUser(getRequest());
    await deleteExpenseById(user.team_id, data.expenseId, user.user_id);
  });
