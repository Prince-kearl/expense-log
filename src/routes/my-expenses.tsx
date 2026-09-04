import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, Plus, Receipt, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CategoryPill,
  KpiCarousel,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  StatCard,
  fieldClass,
} from "@/components/expense-ui";
import { useExpenseConfiguration, useMyExpenses } from "@/lib/app-data";
import { downloadCsv } from "@/lib/csv";
import { buildMonthlyTrend, formatDate, formatMoney, formatMoneyShort } from "@/lib/expenses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-expenses")({
  head: () => ({
    meta: [
      { title: "My Expenses — ExpenseTracker" },
      {
        name: "description",
        content: "Track the expenses you submitted, their totals and approval status.",
      },
      { property: "og:title", content: "My Expenses — ExpenseTracker" },
      {
        property: "og:description",
        content: "Track the expenses you submitted, their totals and approval status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyExpensesPage,
});

function MyExpensesPage() {
  const mine = useMyExpenses();
  const configuration = useExpenseConfiguration();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const total = mine.reduce((s, e) => s + e.amount, 0);
  const latest = mine.map((e) => e.expense_date).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const monthKey = latest.slice(0, 7);
  const thisMonth = mine
    .filter((e) => e.expense_date.startsWith(monthKey))
    .reduce((s, e) => s + e.amount, 0);
  const spendingTrend = buildMonthlyTrend(mine, 12, (m) => m.reduce((s, e) => s + e.amount, 0));
  const countTrend = buildMonthlyTrend(mine, 12, (m) => m.length);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine
      .filter((e) => (category === "all" ? true : e.category === category))
      .filter((e) =>
        q
          ? [e.description, e.vendor, e.category, e.expense_id].join(" ").toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }, [mine, query, category]);

  function exportMyExpenses() {
    downloadCsv(
      `my-expenses${category === "all" ? "" : `-${category.toLowerCase().replace(/\s+/g, "-")}`}.csv`,
      ["Expense ID", "Date", "Description", "Category", "Amount", "Currency", "Vendor", "Payment Method", "Source of Fund"],
      filtered.map((e) => [
        e.expense_id,
        e.expense_date,
        e.description,
        e.category,
        e.amount,
        e.currency,
        e.vendor,
        e.payment_method,
        e.account,
      ]),
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="My Expenses"
        subtitle="Expenses you have submitted."
        icon={<Receipt className="h-4 w-4" />}
        overlapNext
        actions={
          <>
            <SecondaryButton type="button" onClick={exportMyExpenses}>
              <Download className="h-4 w-4" /> Export
            </SecondaryButton>
            <Link to="/expenses/new">
              <PrimaryButton>
                <Plus className="h-4 w-4" /> Add Expense
              </PrimaryButton>
            </Link>
          </>
        }
      />

      <KpiCarousel gridClassName="sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="My Total"
          value={formatMoneyShort(total)}
          tone="primary"
          trend={spendingTrend}
          trendValueFormatter={(v) => formatMoneyShort(v)}
          deltaNote="All time"
        />
        <StatCard
          label="This Month"
          value={formatMoneyShort(thisMonth)}
          tone="success"
          trend={spendingTrend}
          trendValueFormatter={(v) => formatMoneyShort(v)}
          deltaNote={new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        />
        <StatCard
          label="My Transactions"
          value={String(mine.length)}
          tone="violet"
          trend={countTrend}
          deltaNote="Records submitted"
        />
      </KpiCarousel>

      <Card className="my-5 flex flex-wrap items-end gap-4 p-5">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search my expenses..."
            className={cn(fieldClass, "pl-11")}
          />
        </div>
        <div className="w-[220px]">
          <label className="mb-2 block text-[13px] text-muted-foreground">Category</label>
          <SelectField value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {configuration.categories.map((c) => (
              <option key={c.category}>{c.category}</option>
            ))}
          </SelectField>
        </div>
        <SecondaryButton
          onClick={() => {
            setQuery("");
            setCategory("all");
          }}
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </SecondaryButton>
      </Card>

      <Card className="overflow-hidden">
        <div className="divide-y divide-border/70 sm:hidden">
          {filtered.map((e) => (
            <div
              key={e.expense_id}
              onClick={() =>
                navigate({ to: "/expenses/$expenseId", params: { expenseId: e.expense_id } })
              }
              className="flex cursor-pointer items-center gap-3 px-6 py-4 transition-colors hover:bg-muted/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-foreground">{e.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-muted-foreground">{formatDate(e.expense_date)}</span>
                  <CategoryPill category={e.category} />
                </div>
              </div>
              <p className="shrink-0 text-[15px] font-semibold whitespace-nowrap text-foreground">
                {formatMoney(e.amount, e.currency)}
              </p>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[15px] font-medium text-foreground">
                You have not recorded any expenses yet.
              </p>
              <Link
                to="/expenses/new"
                className="mt-2 inline-block text-[14px] font-medium text-primary hover:underline"
              >
                Add your first expense
              </Link>
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-border text-[13px] text-muted-foreground">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.expense_id}
                  onClick={() =>
                    navigate({ to: "/expenses/$expenseId", params: { expenseId: e.expense_id } })
                  }
                  className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-muted/60"
                >
                  <td className="px-6 py-4 text-[15px] whitespace-nowrap text-foreground">
                    {formatDate(e.expense_date)}
                  </td>
                  <td className="px-6 py-4 text-[15px] text-foreground">{e.description}</td>
                  <td className="px-6 py-4">
                    <CategoryPill category={e.category} />
                  </td>
                  <td className="px-6 py-4 text-[15px] whitespace-nowrap text-foreground">
                    {formatMoney(e.amount, e.currency)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <p className="text-[15px] font-medium text-foreground">
                      You have not recorded any expenses yet.
                    </p>
                    <Link
                      to="/expenses/new"
                      className="mt-2 inline-block text-[14px] font-medium text-primary hover:underline"
                    >
                      Add your first expense
                    </Link>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-6 py-4 text-[14px] text-muted-foreground">
          Showing {filtered.length} of {mine.length} of your expenses
        </div>
      </Card>
    </AppShell>
  );
}
