import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Download, MoreVertical, Plus, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CategoryPill,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  UserCell,
  fieldClass,
} from "@/components/expense-ui";
import { useExpenseConfiguration, useExpenses } from "@/lib/app-data";
import { formatDate, formatMoney } from "@/lib/expenses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expenses/")({
  head: () => ({
    meta: [
      { title: "Expenses — ExpenseTracker" },
      { name: "description", content: "View, search and filter all recorded organizational expenses." },
      { property: "og:title", content: "Expenses — ExpenseTracker" },
      {
        property: "og:description",
        content: "View, search and filter all recorded organizational expenses.",
      },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const expenses = useExpenses();
  const configuration = useExpenseConfiguration();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const months = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.expense_date.slice(0, 7)))).sort().reverse(),
    [expenses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses
      .filter((e) => (category === "all" ? true : e.category === category))
      .filter((e) => (month === "all" ? true : e.expense_date.startsWith(month)))
      .filter((e) =>
        q
          ? [e.description, e.vendor, e.category, e.created_by_name, e.expense_id]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }, [expenses, query, category, month]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <AppShell>
      <PageHeader
        title="Expenses"
        subtitle="View and manage all recorded expenses."
        actions={
          <>
            <SecondaryButton>
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

      <Card className="mb-5 flex flex-wrap items-end gap-4 p-4 sm:p-5">
        <div className="relative min-w-0 flex-1 basis-full sm:min-w-[260px]">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search expenses..."
            className={cn(fieldClass, "pl-11")}
          />
        </div>
        <div className="w-full sm:w-[220px]">
          <label className="mb-2 block text-[13px] text-muted-foreground">Category</label>
          <SelectField
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Categories</option>
            {configuration.categories.map((c) => (
              <option key={c.category}>{c.category}</option>
            ))}
          </SelectField>
        </div>
        <div className="w-full sm:w-[220px]">
          <label className="mb-2 block text-[13px] text-muted-foreground">Month</label>
          <SelectField
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00`).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </SelectField>
        </div>
        <SecondaryButton
          className="w-full justify-center sm:w-auto"
          onClick={() => {
            setQuery("");
            setCategory("all");
            setMonth("all");
            setPage(1);
          }}
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </SecondaryButton>
      </Card>

      <Card className="overflow-hidden">
        <div className="divide-y divide-border/70 sm:hidden">
          {rows.map((e) => (
            <div
              key={e.expense_id}
              onClick={() =>
                navigate({ to: "/expenses/$expenseId", params: { expenseId: e.expense_id } })
              }
              className="flex cursor-pointer items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-foreground">{e.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-muted-foreground">{formatDate(e.expense_date)}</span>
                  <CategoryPill category={e.category} />
                </div>
                <div className="mt-2.5">
                  <UserCell name={e.created_by_name} size="sm" />
                </div>
              </div>
              <p className="shrink-0 text-[15px] font-semibold whitespace-nowrap text-foreground">
                {formatMoney(e.amount, e.currency)}
              </p>
            </div>
          ))}
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[15px] font-medium text-foreground">No expenses recorded yet.</p>
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
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-border text-[13px] text-muted-foreground">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Added By</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
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
                    <UserCell name={e.created_by_name} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-[15px] font-medium text-foreground">
                      No expenses recorded yet.
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

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
          <p className="text-[14px] text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (current - 1) * pageSize + 1} to{" "}
            {Math.min(current * pageSize, filtered.length)} of {filtered.length} expenses
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, current - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "h-9 w-9 rounded-full text-[14px] font-medium",
                  p === current
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground hover:bg-muted",
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(pages, current + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
            Rows per page
            <SelectField
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-9 pl-3 text-foreground"
            >
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </SelectField>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
