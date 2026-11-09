import { describe, expect, it, vi } from "vitest";
import { matchExpenseCriteria, type SearchCriteria } from "../expense-search";
import type { Expense } from "../expenses";

const criteria: SearchCriteria = { terms: ["taxi", "uber"], startDate: "2026-10-01", endDate: "2026-10-31", minimumAmount: null, maximumAmount: 200, currency: "GHS", onlyMine: false };
const base: Expense = { expense_id: "taxi-1", expense_date: "2026-10-31", description: "Uber to client office", amount: 200, currency: "GHS", category: "Opex", subcategory: "Travel", vendor: "Uber", notes: "", account: "", payment_method: "", receipts: [], created_by_user_id: "employee-1", created_by_name: "Employee", created_by_email: "private@example.test", created_at: "", updated_at: "", updated_by_user_id: null, is_deleted: false };

describe("plain-language expense matching", () => {
  it("matches everyday synonyms with inclusive dates and amount bounds", () => {
    const rows = [base, { ...base, expense_id: "over", amount: 201 }, { ...base, expense_id: "old", expense_date: "2026-09-30" }, { ...base, expense_id: "other", currency: "USD" }];
    expect(matchExpenseCriteria(rows, criteria, "employee-1").map(e => e.expense_id)).toEqual(["taxi-1"]);
  });
  it("never includes soft-deleted expenses", () => {
    expect(matchExpenseCriteria([{ ...base, is_deleted: true }], criteria, "employee-1")).toEqual([]);
  });
  it("limits explicit my searches to the authenticated employee", () => {
    expect(matchExpenseCriteria([base, { ...base, expense_id: "someone-else", created_by_user_id: "employee-2" }], { ...criteria, onlyMine: true }, "employee-1").map(e => e.expense_id)).toEqual(["taxi-1"]);
  });
  it("returns no invented records for an unmatched description", () => {
    expect(matchExpenseCriteria([base], { ...criteria, terms: ["laptop"] }, "employee-1")).toEqual([]);
  });
});

const mocks = vi.hoisted(() => ({ user: vi.fn(), rows: vi.fn(), call: vi.fn() }));
vi.mock("../session.server", () => ({ requireCurrentUser: mocks.user }));
vi.mock("../supabase-expenses.server", () => ({ getExpensesForTeam: mocks.rows }));
vi.mock("../ai/responses.server", () => ({ createResponsesCall: mocks.call }));
vi.mock("../supabase.server", () => ({ db: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }));

describe("AI expense search authorization", () => {
  it("rejects signed-out callers before reading expenses or calling the model", async () => {
    mocks.user.mockRejectedValueOnce(new Error("You must sign in to continue."));
    const { searchExpenses } = await import("../expense-search.server");
    await expect(searchExpenses(new Request("http://localhost"), "taxi" )).rejects.toThrow("sign in");
    expect(mocks.rows).not.toHaveBeenCalled();
    expect(mocks.call).not.toHaveBeenCalled();
  });
  it("derives team scope from the session and sends no records or receipts to AI", async () => {
    process.env["LOVABLE_API_KEY"] = "test-ai-key";
    mocks.user.mockResolvedValue({ team_id: "team-a", user_id: "employee-1" });
    mocks.rows.mockResolvedValue([base]);
    mocks.call.mockReturnValue({ result: { output: Promise.resolve(criteria) } });
    const { searchExpenses } = await import("../expense-search.server");
    const result = await searchExpenses(new Request("http://localhost"), "taxi under GHS 200 last month");
    expect(mocks.rows).toHaveBeenCalledWith("team-a");
    expect(mocks.call.mock.calls[0]?.[2]).toEqual([{ role: "user", content: "taxi under GHS 200 last month" }]);
    expect("expenses" in result && result.expenses[0]?.expense_id).toBe("taxi-1");
  });
});