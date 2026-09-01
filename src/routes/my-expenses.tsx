import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, FileText, Plus, Receipt, RotateCcw, Search, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CategoryPill,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatCard,
  StatusPill,
  fieldClass,
} from "@/components/expense-ui";
import { CATEGORIES, CURRENT_USER, useExpenses } from "@/lib/sample-store";
import { formatDate, formatMoney, formatMoneyShort } from "@/lib/expenses";
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
  const all = useExpenses();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const mine = useMemo(
    () => all.filter((e) => e.created_by_user_id === CURRENT_USER.user_id),
    [all],
  );

  const total = mine.reduce((s, e) => s + e.amount, 0);
  const latest = mine.map((e) => e.expense_date).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const monthKey = latest.slice(0, 7);
  const thisMonth = mine
    .filter((e) => e.expense_date.startsWith(monthKey))
    .reduce((s, e) => s + e.amount, 0);
  const pending = mine.filter((e) => e.status === "Pending").length;

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

  return (
    <AppShell>
      <PageHeader
        title="My Expenses"
        subtitle="Expenses you have submitted."
        icon={<Receipt className="h-4 w-4" />}
        actions={
          <Link to="/expenses/new">
            <PrimaryButton>
              <Plus className="h-4 w-4" /> Add Expense
            </PrimaryButton>
          </Link>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-6 w-6 text-primary" />}
          iconClass="bg-primary-soft"
          label="My Total"
          value={formatMoneyShort(total)}
          deltaNote="All time"
        />
        <StatCard
          icon={<CalendarDays className="h-6 w-6 text-success" />}
          iconClass="bg-success-soft"
          label="This Month"
          value={formatMoneyShort(thisMonth)}
          deltaNote={new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        />
        <StatCard
          icon={<FileText className="h-6 w-6 text-violet" />}
          iconClass="bg-violet-soft"
          label="My Transactions"
          value={String(mine.length)}
          deltaNote="Records submitted"
        />
        <StatCard
          icon={<Receipt className="h-6 w-6 text-warning" />}
          iconClass="bg-warning-soft"
          label="Pending"
          value={String(pending)}
          deltaNote="Awaiting approval"
        />
      </div>

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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={fieldClass}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.category}>{c.category}</option>
            ))}
          </select>
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-border text-[13px] text-muted-foreground">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
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
                  <td className="px-6 py-4">
                    <StatusPill status={e.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
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
