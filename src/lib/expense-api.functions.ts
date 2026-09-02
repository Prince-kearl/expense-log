import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Expense } from "./expenses";
import {
  appendExpenseToSheet,
  createCategoryInSheet,
  getApplicationConfiguration,
  getExpensesFromSheet,
  uploadReceipt,
} from "./google.server";
import { readCookie, readSession } from "./session.server";

async function requireCurrentUser(request: Request) {
  const user = await readSession(readCookie(request, "expense_tracker_session"));
  if (!user) throw new Error("You must sign in before accessing expenses.");
  return user;
}

function requiredText(form: FormData, name: string, maximum = 240) {
  const value = form.get(name)?.toString().trim() ?? "";
  if (!value || value.length > maximum) throw new Error(`Enter a valid ${name}.`);
  return value;
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  return readSession(readCookie(getRequest(), "expense_tracker_session"));
});

export const getExpenses = createServerFn({ method: "GET" }).handler(async () => {
  await requireCurrentUser(getRequest());
  return getExpensesFromSheet();
});

export const getMyExpenses = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireCurrentUser(getRequest());
  return (await getExpensesFromSheet()).filter((expense) => expense.created_by_user_id === user.user_id);
});

export const getExpenseConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  await requireCurrentUser(getRequest());
  return getApplicationConfiguration();
});

export const createExpenseCategory = createServerFn({ method: "POST" })
  .validator((data: { category: string; subcategory: string }) => data)
  .handler(async ({ data }) => {
    await requireCurrentUser(getRequest());
    const category = data.category.trim().slice(0, 80);
    const subcategory = data.subcategory.trim().slice(0, 80);
    if (!category || !subcategory) throw new Error("Enter both a category and subcategory.");
    return createCategoryInSheet(category, subcategory);
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
    const allExpenses = await getExpensesFromSheet();
    const expenseId = `EXP-${expenseDate.replace(/-/g, "")}-${String(allExpenses.filter((expense) => expense.expense_date === expenseDate).length + 1).padStart(4, "0")}`;
    const receipts = data
      .getAll("receipts")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (receipts.length > 10) throw new Error("Upload a maximum of 10 receipt files.");
    const uploadedReceipts = await Promise.all(
      receipts.map((receipt, index) => uploadReceipt(expenseId, user.name, receipt, index + 1)),
    );
    const now = new Date().toISOString();
    const expense: Expense = {
      expense_id: expenseId,
      expense_date: expenseDate,
      description: requiredText(data, "description", 500),
      category: requiredText(data, "category"),
      subcategory: data.get("subcategory")?.toString().trim() ?? "",
      amount,
      currency: requiredText(data, "currency", 3),
      department: "",
      vendor: data.get("vendor")?.toString().trim() ?? "",
      payment_method: data.get("payment_method")?.toString().trim() ?? "",
      account: data.get("account")?.toString().trim() ?? "",
      notes: data.get("notes")?.toString().trim().slice(0, 500) ?? "",
      receipt_file_id: uploadedReceipts.map((receipt) => receipt.id).join(",") || null,
      receipt_url: uploadedReceipts.map((receipt) => receipt.webViewLink ?? "").filter(Boolean).join(",") || null,
      receipt_filename: uploadedReceipts.map((receipt) => receipt.name).join(",") || null,
      receipt_mime_type: uploadedReceipts.map((receipt) => receipt.mimeType).join(",") || null,
      created_by_user_id: user.user_id,
      created_by_name: user.name,
      created_by_email: user.email,
      created_at: now,
      updated_by_user_id: null,
      updated_at: now,
      is_deleted: false,
    };
    await appendExpenseToSheet(expense);
    return expense;
  });