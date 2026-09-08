import { describe, expect, it } from "vitest";
import { findDominantCurrency, groupByCurrency } from "../expenses";

describe("findDominantCurrency", () => {
  it("returns the single currency present with isMixed false when all items match", () => {
    const result = findDominantCurrency([
      { amount: 100, currency: "GHS" },
      { amount: 50, currency: "GHS" },
    ]);
    expect(result).toEqual({ currency: "GHS", isMixed: false, excludedCount: 0, otherTotals: [] });
  });

  it("defaults to GHS with no items", () => {
    expect(findDominantCurrency([])).toEqual({
      currency: "GHS",
      isMixed: false,
      excludedCount: 0,
      otherTotals: [],
    });
  });

  it("picks the currency with the larger total, not the larger count, when mixed", () => {
    // Three small USD entries outnumber one big GHS entry, but GHS is worth more.
    const result = findDominantCurrency([
      { amount: 10, currency: "USD" },
      { amount: 10, currency: "USD" },
      { amount: 10, currency: "USD" },
      { amount: 1000, currency: "GHS" },
    ]);
    expect(result.currency).toBe("GHS");
    expect(result.isMixed).toBe(true);
    expect(result.excludedCount).toBe(3);
    expect(result.otherTotals).toEqual([{ currency: "USD", total: 30, count: 3 }]);
  });

  it("never sums mismatched currencies into the dominant total's basis", () => {
    // This just documents the contract: callers filter to `currency` themselves
    // before summing. findDominantCurrency never blends amounts across currencies.
    const items = [
      { amount: 100, currency: "GHS" },
      { amount: 50, currency: "USD" },
    ];
    const { currency, excludedCount } = findDominantCurrency(items);
    expect(currency).toBe("GHS");
    expect(excludedCount).toBe(1);
    const homogenous = items.filter((i) => i.currency === currency);
    expect(homogenous.reduce((s, i) => s + i.amount, 0)).toBe(100);
  });

  it("reports every non-dominant currency as its own total, not just a count", () => {
    const result = findDominantCurrency([
      { amount: 1000, currency: "GHS" },
      { amount: 200, currency: "USD" },
      { amount: 40, currency: "USD" },
      { amount: 30, currency: "EUR" },
    ]);
    expect(result.currency).toBe("GHS");
    expect(result.otherTotals).toEqual([
      { currency: "USD", total: 240, count: 2 },
      { currency: "EUR", total: 30, count: 1 },
    ]);
  });
});

describe("groupByCurrency", () => {
  it("sums each currency independently, sorted by total descending", () => {
    const result = groupByCurrency([
      { amount: 10, currency: "USD" },
      { amount: 1000, currency: "GHS" },
      { amount: 20, currency: "USD" },
    ]);
    expect(result).toEqual([
      { currency: "GHS", total: 1000, count: 1 },
      { currency: "USD", total: 30, count: 2 },
    ]);
  });

  it("returns an empty array for no items", () => {
    expect(groupByCurrency([])).toEqual([]);
  });
});
