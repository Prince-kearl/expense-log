import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabaseClient, table, type FakeTables } from "./fakeDb";

const tables = vi.hoisted<FakeTables>(() => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => createFakeSupabaseClient(tables),
}));

process.env["SUPABASE_URL"] = "https://example.test";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";

const { getBudgetsForMonth, upsertBudget, deleteBudget } = await import("../supabase.server");

const TEAM_A = "team-a";
const TEAM_B = "team-b";
const USER = "user-1";
const MONTH = "2026-09";

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables["budgets"] = [];
});

describe("getBudgetsForMonth", () => {
  it("never returns another team's budgets", async () => {
    table(tables, "budgets").push(
      { id: "b1", team_id: TEAM_A, category: "Opex", month: MONTH, amount: 500, currency: "GHS" },
      { id: "b2", team_id: TEAM_B, category: "Opex", month: MONTH, amount: 9999, currency: "GHS" },
    );
    const result = await getBudgetsForMonth(TEAM_A, MONTH);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "b1", category: "Opex", amount: 500 });
  });

  it("scopes by month too", async () => {
    table(tables, "budgets").push({
      id: "b1",
      team_id: TEAM_A,
      category: "Opex",
      month: "2026-08",
      amount: 500,
      currency: "GHS",
    });
    expect(await getBudgetsForMonth(TEAM_A, MONTH)).toEqual([]);
  });
});

describe("upsertBudget", () => {
  it("creates a new budget row when none exists for that category/month", async () => {
    await upsertBudget(TEAM_A, USER, {
      category: "Opex",
      month: MONTH,
      amount: 500,
      currency: "GHS",
    });
    const result = await getBudgetsForMonth(TEAM_A, MONTH);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ category: "Opex", amount: 500, currency: "GHS" });
  });

  it("updates the existing row in place instead of creating a duplicate", async () => {
    await upsertBudget(TEAM_A, USER, {
      category: "Opex",
      month: MONTH,
      amount: 500,
      currency: "GHS",
    });
    await upsertBudget(TEAM_A, USER, {
      category: "Opex",
      month: MONTH,
      amount: 750,
      currency: "GHS",
    });
    const result = await getBudgetsForMonth(TEAM_A, MONTH);
    expect(result).toHaveLength(1);
    expect(result[0]?.amount).toBe(750);
  });

  it("treats the overall budget (category null) as distinct from any specific category", async () => {
    await upsertBudget(TEAM_A, USER, {
      category: null,
      month: MONTH,
      amount: 5000,
      currency: "GHS",
    });
    await upsertBudget(TEAM_A, USER, {
      category: "Opex",
      month: MONTH,
      amount: 500,
      currency: "GHS",
    });
    const result = await getBudgetsForMonth(TEAM_A, MONTH);
    expect(result).toHaveLength(2);
    expect(result.find((b) => b.category === null)?.amount).toBe(5000);
    expect(result.find((b) => b.category === "Opex")?.amount).toBe(500);
  });

  it("updates the overall budget in place rather than creating a second one", async () => {
    await upsertBudget(TEAM_A, USER, {
      category: null,
      month: MONTH,
      amount: 5000,
      currency: "GHS",
    });
    await upsertBudget(TEAM_A, USER, {
      category: null,
      month: MONTH,
      amount: 6000,
      currency: "GHS",
    });
    const result = await getBudgetsForMonth(TEAM_A, MONTH);
    expect(result.filter((b) => b.category === null)).toHaveLength(1);
    expect(result.find((b) => b.category === null)?.amount).toBe(6000);
  });

  it("never lets one team's budget update leak into another team's row", async () => {
    await upsertBudget(TEAM_A, USER, {
      category: "Opex",
      month: MONTH,
      amount: 500,
      currency: "GHS",
    });
    await upsertBudget(TEAM_B, USER, {
      category: "Opex",
      month: MONTH,
      amount: 999,
      currency: "GHS",
    });
    expect((await getBudgetsForMonth(TEAM_A, MONTH))[0]?.amount).toBe(500);
    expect((await getBudgetsForMonth(TEAM_B, MONTH))[0]?.amount).toBe(999);
  });
});

describe("deleteBudget", () => {
  it("does not delete a budget belonging to another team", async () => {
    await upsertBudget(TEAM_A, USER, {
      category: "Opex",
      month: MONTH,
      amount: 500,
      currency: "GHS",
    });
    const [budget] = await getBudgetsForMonth(TEAM_A, MONTH);
    await deleteBudget(TEAM_B, budget!.id);
    expect(await getBudgetsForMonth(TEAM_A, MONTH)).toHaveLength(1);
  });

  it("deletes the budget when scoped to the team that owns it", async () => {
    await upsertBudget(TEAM_A, USER, {
      category: "Opex",
      month: MONTH,
      amount: 500,
      currency: "GHS",
    });
    const [budget] = await getBudgetsForMonth(TEAM_A, MONTH);
    await deleteBudget(TEAM_A, budget!.id);
    expect(await getBudgetsForMonth(TEAM_A, MONTH)).toEqual([]);
  });
});
