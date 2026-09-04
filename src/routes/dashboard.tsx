import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CategoryPill,
  KpiCarousel,
  PageHeader,
  StatCard,
  TeamAvatarStack,
  UserCell,
} from "@/components/expense-ui";
import { useCurrentUser, useExpenses, useTeamMembers } from "@/lib/app-data";
import {
  buildMonthlyTrend,
  categoryColor,
  formatDate,
  formatMoney,
  formatMoneyShort,
  greeting,
} from "@/lib/expenses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ExpenseTracker" },
      {
        name: "description",
        content: "Live spending overview, category breakdown and recent organizational expenses.",
      },
      { property: "og:title", content: "Dashboard — ExpenseTracker" },
      {
        property: "og:description",
        content: "Live spending overview, category breakdown and recent organizational expenses.",
      },
    ],
  }),
  component: DashboardPage,
});

const CHART_RANGES = [3, 6, 12] as const;

function DashboardPage() {
  const navigate = useNavigate();
  const expenses = useExpenses();
  const currentUser = useCurrentUser();
  const teamMembers = useTeamMembers();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const [chartRange, setChartRange] = useState<(typeof CHART_RANGES)[number]>(12);
  const [greetingText, setGreetingText] = useState<string | null>(null);
  useEffect(() => {
    setGreetingText(greeting());
  }, []);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses
    .filter((e) => {
      const d = new Date(`${e.expense_date}T00:00:00`);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((s, e) => s + e.amount, 0);
  const prevMonth = expenses
    .filter((e) => {
      const d = new Date(`${e.expense_date}T00:00:00`);
      return d.getFullYear() === year && d.getMonth() === month - 1;
    })
    .reduce((s, e) => s + e.amount, 0);
  const monthDelta = prevMonth ? ((thisMonth - prevMonth) / prevMonth) * 100 : 0;
  const spendingTrend = buildMonthlyTrend(expenses, 12, (m) => m.reduce((s, e) => s + e.amount, 0));
  const countTrend = buildMonthlyTrend(expenses, 12, (m) => m.length);

  const chartData = spendingTrend.slice(-chartRange);
  const chartTotal = chartData.reduce((s, m) => s + m.value, 0);

  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const recent = [...expenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 5);

  return (
    <AppShell>
      <PageHeader
        title={`${greetingText ?? "Welcome"}${currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}`}
        icon={<Calendar className="h-4 w-4" />}
        subtitle={`${now.toLocaleDateString("en-US", { month: "long" })} ${year}`}
        overlapNext
      />

      <KpiCarousel gridClassName="sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Expenses"
          value={formatMoneyShort(total)}
          tone="primary"
          trend={spendingTrend}
          trendValueFormatter={(v) => formatMoneyShort(v)}
        />
        <StatCard
          label="This Month"
          value={formatMoneyShort(thisMonth)}
          tone="success"
          trend={spendingTrend}
          trendValueFormatter={(v) => formatMoneyShort(v)}
          changePercent={monthDelta}
          deltaNote={`vs ${new Date(year, month - 1).toLocaleDateString("en-US", { month: "short" })}`}
        />
        <StatCard
          label="Transactions"
          value={String(expenses.length)}
          tone="violet"
          trend={countTrend}
        />
      </KpiCarousel>

      {teamMembers.length > 0 ? (
        <div className="mt-5 flex justify-center">
          <TeamAvatarStack members={teamMembers} />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-foreground">Spending Overview</h2>
            <div className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/40 p-1 text-[13px]">
              {CHART_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setChartRange(range)}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-medium transition-colors",
                    chartRange === range
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {range}M
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Total spending (past {chartRange} months):{" "}
            <span className="font-semibold text-foreground">{formatMoneyShort(chartTotal)}</span>
          </p>
          <div className="mt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={chartData.length > 6 ? 1 : 0}
                  tick={{ fontSize: 13, fill: "var(--muted-foreground)" }}
                  dy={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : v.toLocaleString()
                  }
                />
                <Tooltip
                  cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    boxShadow: "var(--shadow-elevated)",
                  }}
                  formatter={(v: number) => [formatMoneyShort(v), "Spending"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#spendFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[17px] font-semibold text-foreground">Spending by Category</h2>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {byCategory.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={categoryColor(entry.name)}
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
            <div className="w-full min-w-0 flex-1 space-y-3">
              {byCategory.map((c) => (
                <div key={c.name} className="flex items-center gap-3 text-[14px]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor(c.name) }}
                  />
                  <span className="flex-1 truncate text-foreground">{c.name}</span>
                  <span className="text-foreground">{formatMoneyShort(c.value)}</span>
                  <span className="w-12 text-right text-muted-foreground">
                    {((c.value / total) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[15px]">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-semibold text-foreground">{formatMoneyShort(total)}</span>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-foreground">Recent Expenses</h2>
            <Link to="/expenses" className="text-[14px] font-medium text-primary hover:underline">
              View all expenses
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[15px] font-medium text-foreground">No expenses recorded yet.</p>
              <Link
                to="/expenses/new"
                className="mt-2 inline-block text-[14px] font-medium text-primary hover:underline"
              >
                Add your first expense
              </Link>
            </div>
          ) : null}

          <div className="mt-2 divide-y divide-border/70 sm:hidden">
            {recent.map((e) => (
              <div
                key={e.expense_id}
                onClick={() => navigate({ to: "/expenses/$expenseId", params: { expenseId: e.expense_id } })}
                className="flex cursor-pointer items-start gap-3 py-4 transition-colors hover:bg-muted/60"
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
          </div>

          <div className="mt-4 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-border text-[13px] text-muted-foreground">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                  <th className="pb-3 pl-6 font-medium">Added By</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.expense_id} className="border-b border-border/70 last:border-0">
                    <td className="py-3.5 text-[15px] whitespace-nowrap text-foreground">
                      {formatDate(e.expense_date)}
                    </td>
                    <td className="py-3.5 text-[15px] text-foreground">{e.description}</td>
                    <td className="py-3.5">
                      <CategoryPill category={e.category} />
                    </td>
                    <td className="py-3.5 text-right text-[15px] whitespace-nowrap text-foreground">
                      {formatMoney(e.amount, e.currency)}
                    </td>
                    <td className="py-3.5 pl-6">
                      <UserCell name={e.created_by_name.split(" ")[0] ?? e.created_by_name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recent.length > 0 ? (
            <div className="mt-4 text-center">
              <Link to="/expenses" className="text-[14px] font-medium text-primary hover:underline">
                View all expenses
              </Link>
            </div>
          ) : null}
        </Card>

        <Card className="flex flex-col gap-3 border-primary/10 bg-primary-soft/20 p-3.5 sm:min-h-[86px] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft">
              <FileText className="h-6 w-6 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-semibold text-foreground">Monthly Expense Report</h3>
              <p className="mt-1 text-[12px] leading-4 text-muted-foreground sm:max-w-[210px]">
                View a detailed breakdown of your expenses for{" "}
                {now.toLocaleDateString("en-US", { month: "long" })} {year}.
              </p>
            </div>
          </div>
          <Link
            to="/reports"
            className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-primary hover:bg-muted sm:w-auto sm:justify-start"
          >
            View Report <span aria-hidden>›</span>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
