import "@tanstack/react-start/server-only";
import { db, fail } from "./supabase.server";
import type { Expense, ExpenseReceipt } from "./expenses";

const RECEIPTS_BUCKET = "receipts";
const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

type ExpenseRow = {
  id: string;
  expense_id: string;
  expense_date: string;
  description: string;
  category: string;
  subcategory: string;
  amount: number;
  currency: string;
  vendor: string;
  payment_method: string;
  account: string;
  notes: string;
  receipts: ExpenseReceipt[];
  created_by_user_id: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_by_user_id: string | null;
  updated_at: string;
  is_deleted: boolean;
};

const EXPENSE_COLUMNS =
  "expense_id, expense_date, description, category, subcategory, amount, currency, vendor, payment_method, account, notes, receipts, created_by_user_id, created_by_name, created_by_email, created_at, updated_by_user_id, updated_at, is_deleted";

function toExpense(row: ExpenseRow): Expense {
  return {
    expense_id: row.expense_id,
    expense_date: row.expense_date,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    amount: Number(row.amount),
    currency: row.currency,
    vendor: row.vendor,
    payment_method: row.payment_method,
    account: row.account,
    notes: row.notes,
    receipts: row.receipts ?? [],
    created_by_user_id: row.created_by_user_id,
    created_by_name: row.created_by_name,
    created_by_email: row.created_by_email,
    created_at: row.created_at,
    updated_by_user_id: row.updated_by_user_id,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted,
  };
}

export async function getExpensesForTeam(teamId: string): Promise<Expense[]> {
  const { data, error } = await db()
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .eq("team_id", teamId)
    .eq("is_deleted", false)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) fail("Loading expenses", error);
  return (data ?? []).map((row) => toExpense(row as ExpenseRow));
}

export async function getExpenseForTeam(teamId: string, expenseId: string): Promise<Expense | null> {
  const { data, error } = await db()
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .eq("team_id", teamId)
    .eq("expense_id", expenseId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (error) fail("Loading expense", error);
  return data ? toExpense(data as ExpenseRow) : null;
}

export type ExpenseCategoryGroup = { category: string; subcategories: string[] };

export async function getExpenseCategories(teamId: string): Promise<ExpenseCategoryGroup[]> {
  const { data, error } = await db()
    .from("expense_categories")
    .select("category, subcategory")
    .eq("team_id", teamId)
    .order("category", { ascending: true });
  if (error) fail("Loading categories", error);
  const grouped = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = grouped.get(row.category) ?? [];
    list.push(row.subcategory);
    grouped.set(row.category, list);
  }
  return Array.from(grouped.entries()).map(([category, subcategories]) => ({ category, subcategories }));
}

export async function createExpenseCategory(teamId: string, category: string, subcategory: string) {
  const { error } = await db()
    .from("expense_categories")
    .insert({ team_id: teamId, category, subcategory });
  if (error) {
    if (error.message?.toLowerCase().includes("duplicate")) {
      throw new Error("That category and subcategory already exist.");
    }
    fail("Creating category", error);
  }
  return { category, subcategory };
}

async function nextExpenseId(teamId: string, expenseDate: string) {
  const { count, error } = await db()
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("expense_date", expenseDate);
  if (error) fail("Generating expense id", error);
  return `EXP-${expenseDate.replace(/-/g, "")}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function uploadReceipt(
  teamId: string,
  expenseId: string,
  file: File,
  sequence = 1,
): Promise<ExpenseReceipt> {
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type) || file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Receipts must be a JPG, PNG, or PDF no larger than 10 MB.");
  }
  const extension = file.name.split(".").pop() ?? "file";
  const filename = `${sequence}_${file.name}`;
  const path = `${teamId}/${expenseId}/${filename}`;
  const { error } = await db()
    .storage.from(RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true });
  if (error) fail("Uploading receipt", error);
  return { path, filename: file.name || `receipt.${extension}`, mime_type: file.type || "application/octet-stream" };
}

export async function getReceiptObject(path: string) {
  const { data, error } = await db().storage.from(RECEIPTS_BUCKET).download(path);
  if (error || !data) fail("Downloading receipt", error);
  return data as Blob;
}

export type NewExpenseInput = {
  expenseDate: string;
  description: string;
  category: string;
  subcategory: string;
  amount: number;
  currency: string;
  vendor: string;
  paymentMethod: string;
  account: string;
  notes: string;
};

export async function createExpense(
  teamId: string,
  user: { user_id: string; name: string; email: string },
  input: NewExpenseInput,
  receiptFiles: File[],
): Promise<Expense> {
  const expenseId = await nextExpenseId(teamId, input.expenseDate);
  const receipts = await Promise.all(
    receiptFiles.map((file, index) => uploadReceipt(teamId, expenseId, file, index + 1)),
  );
  const now = new Date().toISOString();
  const row = {
    team_id: teamId,
    expense_id: expenseId,
    expense_date: input.expenseDate,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    amount: input.amount,
    currency: input.currency,
    vendor: input.vendor,
    payment_method: input.paymentMethod,
    account: input.account,
    notes: input.notes,
    receipts,
    created_by_user_id: user.user_id,
    created_by_name: user.name,
    created_by_email: user.email,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await db().from("expenses").insert(row).select(EXPENSE_COLUMNS).single();
  if (error || !data) fail("Creating expense", error);
  return toExpense(data as ExpenseRow);
}

export async function updateExpenseFields(
  teamId: string,
  expenseId: string,
  userId: string,
  input: NewExpenseInput,
): Promise<Expense> {
  const { data, error } = await db()
    .from("expenses")
    .update({
      expense_date: input.expenseDate,
      description: input.description,
      category: input.category,
      subcategory: input.subcategory,
      amount: input.amount,
      currency: input.currency,
      vendor: input.vendor,
      payment_method: input.paymentMethod,
      account: input.account,
      notes: input.notes,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("team_id", teamId)
    .eq("expense_id", expenseId)
    .eq("created_by_user_id", userId)
    .eq("is_deleted", false)
    .select(EXPENSE_COLUMNS);
  if (error) fail("Updating expense", error);
  if (!data || data.length === 0) throw new Error("You can only edit expenses you created.");
  return toExpense(data[0] as ExpenseRow);
}

export async function deleteExpenseById(teamId: string, expenseId: string, userId: string) {
  const { data, error } = await db()
    .from("expenses")
    .update({ is_deleted: true, updated_by_user_id: userId, updated_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("expense_id", expenseId)
    .eq("created_by_user_id", userId)
    .select("id");
  if (error) fail("Deleting expense", error);
  if (!data || data.length === 0) throw new Error("You can only delete expenses you created.");
}
