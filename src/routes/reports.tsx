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
import { BarChart3, Download, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, PageHeader, SecondaryButton, fieldClass } from "@/components/expense-ui";
import { useExpenses } from "@/lib/sample-store";
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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ReportsPage() {
  const expenses = useExpenses();
  const years = useMemo(
    () =>
      Array.from(new Set(expenses.map((e) => e.expense_date.slice(0, 4))))
        .sort()
        .reverse(),
    [expenses],
  );
  const [year, setYear] = useState(years[0] ?? String(new Date().getFullYear()));

  const scoped = expenses.filter((e) => e.expense_date.startsWith(year));
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

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Spending trends and category analysis."
        icon={<BarChart3 className="h-4 w-4" />}
        actions={
          <>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={`${fieldClass} h-11 w-[140px]`}
            >
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <SecondaryButton>
              <Download className="h-4 w-4" /> Export
            </SecondaryButton>
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-[15px] text-muted-foreground">Total Spending</p>
          <p className="mt-1 text-[26px] leading-8 font-bold tracking-tight text-foreground">
            {formatMoneyShort(total)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{year} to date</p>
        </Card>
        <Card className="p-5">
          <p className="text-[15px] text-muted-foreground">Monthly Average</p>
          <p className="mt-1 text-[26px] leading-8 font-bold tracking-tight text-foreground">
            {formatMoneyShort(average)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Across {activeMonths.length} active months
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[15px] text-muted-foreground">Highest Month</p>
          <p className="mt-1 text-[26px] leading-8 font-bold tracking-tight text-foreground">
            {formatMoneyShort(peak.value)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            {peak.label} {year}
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="p-6">
          <h2 className="text-[17px] font-semibold text-foreground">Monthly Spending Trend</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Total spend per month for {year}.
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
            Ranked by total spend for {year}.
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
