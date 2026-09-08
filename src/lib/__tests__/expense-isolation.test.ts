import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient, table, type FakeTables } from "./fakeDb";

const tables = vi.hoisted<FakeTables>(() => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabaseClient(tables),
}));

process.env["SUPABASE_URL"] = "https://example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";

const {
  getExpensesForTeam,
  getExpenseForTeam,
  updateExpenseFields,
  deleteExpenseById,
  getExpenseCategories,
} = await import("../supabase-expenses.server");

const TEAM_A = "team-a";
const TEAM_B = "team-b";
const USER_A = "user-a";
const USER_A2 = "user-a2";

function seedExpense(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: crypto.randomUUID(),
    team_id: TEAM_A,
    expense_id: "EXP-20260101-0001",
    expense_date: "2026-01-01",
    description: "Client dinner",
    category: "Meals",
    subcategory: "Client",
    amount: 120,
    currency: "GHS",
    vendor: "",
    payment_method: "",
    account: "",
    notes: "",
    receipts: [],
    created_by_user_id: USER_A,
    created_by_name: "Ama",
    created_by_email: "ama@example.test",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_by_user_id: null,
    updated_at: "2026-01-01T00:00:00.000Z",
    is_deleted: false,
    ...overrides,
  };
}

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables["expenses"] = [];
  tables["expense_categories"] = [];
});

describe("cross-team expense isolation (Test 1 — data isolation, Test 3 — receipt path)", () => {
  it("never returns a Team A expense when querying as Team B, by list or by id", async () => {
    const expenseA = seedExpense();
    table(tables, "expenses").push(expenseA);

    await expect(getExpensesForTeam(TEAM_B)).resolves.toEqual([]);
    await expect(getExpenseForTeam(TEAM_B, expenseA["expense_id"] as string)).resolves.toBeNull();

    // Sanity check: the same lookup succeeds for the team that actually owns it.
    const found = await getExpenseForTeam(TEAM_A, expenseA["expense_id"] as string);
    expect(found?.expense_id).toBe(expenseA["expense_id"]);
  });

  it("keeps each team's categories separate", async () => {
    table(tables, "expense_categories").push(
      { team_id: TEAM_A, category: "Meals", subcategory: "Client" },
      { team_id: TEAM_B, category: "Travel", subcategory: "Flights" },
    );
    const categoriesForA = await getExpenseCategories(TEAM_A);
    expect(categoriesForA.map((c) => c.category)).toEqual(["Meals"]);
  });
});

describe("cross-team mutation protection (Test 2)", () => {
  it("rejects updating a Team A expense while scoped to Team B, and leaves it unchanged", async () => {
    const expenseA = seedExpense();
    table(tables, "expenses").push(expenseA);

    await expect(
      updateExpenseFields(TEAM_B, expenseA["expense_id"] as string, USER_A, {
        expenseDate: "2026-01-02",
        description: "Tampered",
        category: "Meals",
        subcategory: "Client",
        amount: 999,
        currency: "GHS",
        vendor: "",
        paymentMethod: "",
        account: "",
        notes: "",
      }),
    ).rejects.toThrow("You can only edit expenses you created.");

    // The row itself must be untouched.
    expect(expenseA["description"]).toBe("Client dinner");
    expect(expenseA["amount"]).toBe(120);
  });

  it("rejects deleting a Team A expense while scoped to Team B, and leaves it undeleted", async () => {
    const expenseA = seedExpense();
    table(tables, "expenses").push(expenseA);

    await expect(
      deleteExpenseById(TEAM_B, expenseA["expense_id"] as string, USER_A),
    ).rejects.toThrow("You can only delete expenses you created.");
    expect(expenseA["is_deleted"]).toBe(false);
  });

  it("rejects editing a same-team expense you didn't create (not just cross-team)", async () => {
    const expenseA = seedExpense({ created_by_user_id: USER_A });
    table(tables, "expenses").push(expenseA);

    await expect(
      updateExpenseFields(TEAM_A, expenseA["expense_id"] as string, USER_A2, {
        expenseDate: "2026-01-02",
        description: "Tampered",
        category: "Meals",
        subcategory: "Client",
        amount: 999,
        currency: "GHS",
        vendor: "",
        paymentMethod: "",
        account: "",
        notes: "",
      }),
    ).rejects.toThrow("You can only edit expenses you created.");
  });
});
