import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Calendar, FileText, PieChart as PieIcon, Plus, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CategoryPill,
  PageHeader,
  PrimaryButton,
  StatCard,
  UserCell,
} from "@/components/expense-ui";
import { CURRENT_USER, useExpenses } from "@/lib/sample-store";
import {
  CATEGORY_COLORS,
  formatDate,
  formatMoney,
  formatMoneyShort,
  greeting,
} from "@/lib/expenses";

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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const BUDGET = 20000;

function DashboardPage() {
  const expenses = useExpenses();
  const now = new Date(expenses[0]?.expense_date ?? new Date().toISOString().slice(0, 10));
  const year = now.getFullYear();
  const month = now.getMonth();

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
  const remaining = Math.max(BUDGET - thisMonth, 0);
  const progress = Math.min((thisMonth / BUDGET) * 100, 100);

  const monthly = MONTHS.map((label, i) => ({
    label,
    value: expenses
      .filter((e) => {
        const d = new Date(`${e.expense_date}T00:00:00`);
        return d.getFullYear() === year && d.getMonth() === i;
      })
      .reduce((s, e) => s + e.amount, 0),
  }));
  const yearTotal = monthly.reduce((s, m) => s + m.value, 0);

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
        title={`${greeting()}, ${CURRENT_USER.name.split(" ")[0]} 👋`}
        icon={<Calendar className="h-4 w-4" />}
        subtitle={`${now.toLocaleDateString("en-US", { month: "long" })} ${year}`}
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
          label="Total Expenses"
          value={formatMoneyShort(total)}
          delta="18.6%"
          deltaNote="vs Jul 2026"
        />
        <StatCard
          icon={<Calendar className="h-6 w-6 text-success" />}
          iconClass="bg-success-soft"
          label="This Month"
          value={formatMoneyShort(thisMonth)}
          delta={`${Math.abs(monthDelta).toFixed(1)}%`}
          deltaDirection={monthDelta >= 0 ? "up" : "down"}
          deltaNote="vs Jul 2026"
        />
        <StatCard
          icon={<FileText className="h-6 w-6 text-violet" />}
          iconClass="bg-violet-soft"
          label="Transactions"
          value={String(expenses.length)}
          delta="8.1%"
          deltaNote="vs Jul 2026"
        />
        <StatCard
          icon={<PieIcon className="h-6 w-6 text-warning" />}
          iconClass="bg-warning-soft"
          label="Budget Remaining"
          value={formatMoneyShort(remaining)}
          delta={`${progress.toFixed(1)}%`}
          deltaDirection="down"
          deltaNote={`of ${formatMoneyShort(BUDGET)}`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-foreground">Spending Overview</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Total spending this year:{" "}
                <span className="font-semibold text-foreground">{formatMoneyShort(yearTotal)}</span>
              </p>
            </div>
            <span className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[13px] text-foreground">
              This Year
            </span>
          </div>
          <div className="mt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  type="linear"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#spendFill)"
                  dot={{ r: 3.5, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "var(--primary)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-[17px] font-semibold text-foreground">Spending by Category</h2>
          <div className="mt-4 flex items-center gap-6">
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
                        fill={CATEGORY_COLORS[entry.name] ?? "var(--muted-foreground)"}
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
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-foreground">Recent Expenses</h2>
            <Link to="/expenses" className="text-[14px] font-medium text-primary hover:underline">
              View all expenses
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
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
          <div className="mt-4 text-center">
            <Link to="/expenses" className="text-[14px] font-medium text-primary hover:underline">
              View all expenses
            </Link>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-foreground">Budget Progress</h2>
              <span className="text-[13px] text-muted-foreground">
                {formatMoneyShort(thisMonth)} spent
              </span>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[13px] text-muted-foreground">
              <span>
                {progress.toFixed(1)}% of {formatMoneyShort(BUDGET)}
              </span>
              <span>{formatMoneyShort(remaining)} remaining</span>
            </div>
            <div className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-[14px] text-success">
              {progress < 100
                ? "You're on track to meet your budget this month."
                : "You have exceeded this month's budget."}
            </div>
          </Card>

          <Card className="flex items-start gap-4 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
              <FileText className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-foreground">Monthly Expense Report</h3>
              <p className="mt-1 text-[14px] text-muted-foreground">
                View a detailed breakdown of your expenses for{" "}
                {now.toLocaleDateString("en-US", { month: "long" })} {year}.
              </p>
            </div>
            <Link
              to="/reports"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border px-4 text-[14px] font-medium text-primary hover:bg-muted"
            >
              View Report ›
            </Link>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
