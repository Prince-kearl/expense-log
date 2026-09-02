import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, CalendarDays, Download, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, SecondaryButton, StatCard, fieldClass } from "@/components/expense-ui";
import { useExpenses } from "@/lib/app-data";
import { CATEGORY_COLORS, formatMoney, formatMoneyShort } from "@/lib/expenses";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ExpenseTracker" },
      {
        name: "description",
        content: "Monthly spending trends, category breakdown and top spending categories.",
      },
      { property: "og:title", content: "Reports — ExpenseTracker" },
      {
        property: "og:description",
        content: "Monthly spending trends, category breakdown and top spending categories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ReportsPage() {
  const expenses = useExpenses();
  const reportingMonths = useMemo(
    () =>
      Array.from(new Set(expenses.map((expense) => expense.expense_date.slice(0, 7))))
        .sort()
        .reverse(),
    [expenses],
  );
  const [reportingMonth, setReportingMonth] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.category))).sort(),
    [expenses],
  );
  const selectedMonth = reportingMonth || reportingMonths[0] || new Date().toISOString().slice(0, 7);
  const year = selectedMonth.slice(0, 4);
  const scoped = expenses
    .filter((expense) => expense.expense_date.startsWith(selectedMonth))
    .filter((expense) => category === "all" || expense.category === category);
  const total = scoped.reduce((s, e) => s + e.amount, 0);

  const monthly = MONTHS.map((label, i) => ({
    label,
    value: scoped
      .filter((e) => Number(e.expense_date.slice(5, 7)) === i + 1)
      .reduce((s, e) => s + e.amount, 0),
  }));
  const activeMonths = monthly.filter((m) => m.value > 0);
  const average = activeMonths.length ? total / activeMonths.length : 0;
  const peak = monthly.reduce((a, b) => (b.value > a.value ? b : a), monthly[0]!);

  const byCategory = Object.entries(
    scoped.reduce<Record<string, { amount: number; count: number }>>((acc, e) => {
      const cur = acc[e.category] ?? { amount: 0, count: 0 };
      cur.amount += e.amount;
      cur.count += 1;
      acc[e.category] = cur;
      return acc;
    }, {}),
  )
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);

  function exportReport() {
    const columns = ["Expense ID", "Date", "Description", "Category", "Amount", "Currency", "Vendor", "Payment Method", "Source of Fund", "Submitted By"];
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = scoped.map((expense) => [
      expense.expense_id,
      expense.expense_date,
      expense.description,
      expense.category,
      expense.amount,
      expense.currency,
      expense.vendor,
      expense.payment_method,
      expense.account,
      expense.created_by_name,
    ].map(escapeCsv).join(","));
    const file = new Blob([[columns.map(escapeCsv).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-report-${selectedMonth}${category === "all" ? "" : `-${category.toLowerCase().replace(/\s+/g, "-")}`}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Spending trends and category analysis."
        icon={<BarChart3 className="h-4 w-4" />}
        actions={
          <>
            <select
              value={selectedMonth}
              onChange={(event) => setReportingMonth(event.target.value)}
              className={`${fieldClass} h-11 w-[154px]`}
            >
              {reportingMonths.length === 0 ? <option value={selectedMonth}>{selectedMonth}</option> : null}
              {reportingMonths.map((month) => (
                <option key={month} value={month}>
                  {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </option>
              ))}
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={`${fieldClass} h-11 w-[154px]`}>
              <option value="all">All Categories</option>
              {categories.map((categoryName) => <option key={categoryName} value={categoryName}>{categoryName}</option>)}
            </select>
            <SecondaryButton onClick={exportReport}>
              <Download className="h-4 w-4" /> Export
            </SecondaryButton>
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard icon={<Wallet className="h-4 w-4 text-primary" />} iconClass="bg-primary-soft" accentClass="border-t-primary" label="Total Spending" value={formatMoneyShort(total)} deltaNote={new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })} />
        <StatCard icon={<CalendarDays className="h-4 w-4 text-success" />} iconClass="bg-success-soft" accentClass="border-t-success" label="Transactions" value={String(scoped.length)} deltaNote={category === "all" ? "All categories" : category} />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-violet" />} iconClass="bg-violet-soft" accentClass="border-t-violet" label="Highest Month" value={formatMoneyShort(peak.value)} deltaNote={`${peak.label} ${year}`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="p-6">
          <h2 className="text-[17px] font-semibold text-foreground">Monthly Spending Trend</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Monthly spend for {year}{category === "all" ? "" : ` in ${category}`}.
          </p>
          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 13, fill: "var(--muted-foreground)" }}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => (v ? `${v / 1000}K` : "0")}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    boxShadow: "var(--shadow-elevated)",
                  }}
                  formatter={(v: number) => [formatMoneyShort(v), "Spending"]}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[17px] font-semibold text-foreground">Category Breakdown</h2>
          <div className="mt-4 flex items-center gap-6">
            <div className="h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {byCategory.map((c) => (
                      <Cell
                        key={c.name}
                        fill={CATEGORY_COLORS[c.name] ?? "var(--muted-foreground)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                    formatter={(v: number) => formatMoneyShort(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {byCategory.map((c) => (
                <div key={c.name} className="flex items-center gap-3 text-[14px]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[c.name] ?? "var(--muted-foreground)" }}
                  />
                  <span className="flex-1 truncate text-foreground">{c.name}</span>
                  <span className="text-foreground">{formatMoneyShort(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-[17px] font-semibold text-foreground">Top Spending Categories</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Ranked by total spend for {new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-y border-border text-[13px] text-muted-foreground">
                <th className="px-6 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Transactions</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((c, i) => {
                const share = total ? (c.amount / total) * 100 : 0;
                return (
                  <tr key={c.name} className="border-b border-border/70 last:border-0">
                    <td className="px-6 py-4 text-[15px] text-muted-foreground">{i + 1}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-3 text-[15px] font-medium text-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: CATEGORY_COLORS[c.name] ?? "var(--muted-foreground)",
                          }}
                        />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[15px] text-foreground">{c.count}</td>
                    <td className="px-6 py-4 text-[15px] whitespace-nowrap text-foreground">
                      {formatMoney(c.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-[140px] overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor:
                                CATEGORY_COLORS[c.name] ?? "var(--muted-foreground)",
                            }}
                          />
                        </div>
                        <span className="text-[14px] text-muted-foreground">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
