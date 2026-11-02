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
import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CurrencyChip,
  ExportMenu,
  InfoPopover,
  KpiCarousel,
  PageHeader,
  SelectField,
  StatCard,
} from "@/components/expense-ui";
import { useCurrentUser, useExpenseConfiguration, useExpenses } from "@/lib/app-data";
import { downloadCsv } from "@/lib/csv";
import {
  buildMonthlyTrend,
  categoryColor,
  findDominantCurrency,
  formatDate,
  formatMoney,
  formatMoneyShort,
  groupByCurrency,
} from "@/lib/expenses";
import { downloadExpenseReportPdf } from "@/lib/pdf-report";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      {"title": "Reports — CoinTrail"},
      {"name": "description", "content": "Monthly spending trends, category breakdown and top spending categories."},
      {"property": "og:title", "content": "Reports — CoinTrail"},
      {"property": "og:description", "content": "Monthly spending trends, category breakdown and top spending categories."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary_large_image"},
    ],
  }),
  component: ReportsPage,
});

const CHART_RANGES = [3, 6, 12] as const;

function ReportsPage() {
  const currentUser = useCurrentUser();
  const expenses = useExpenses();
  const configuration = useExpenseConfiguration();
  const reportingMonths = useMemo(
    () =>
      Array.from(new Set(expenses.map((expense) => expense.expense_date.slice(0, 7))))
        .sort()
        .reverse(),
    [expenses],
  );
  const [reportingMonth, setReportingMonth] = useState("");
  const [category, setCategory] = useState("all");
  const [chartRange, setChartRange] = useState<(typeof CHART_RANGES)[number]>(12);
  const categories = configuration.categories.map((c) => c.category);
  const selectedMonth =
    reportingMonth || reportingMonths[0] || new Date().toISOString().slice(0, 7);

  // Money in different currencies can't be summed into one meaningful number
  // without a conversion rate, and this app doesn't fabricate exchange rates.
  // Every total below is computed from whichever currency actually accounts
  // for most of the team's spend — never blended with other currencies.
  const { currency, isMixed: hasMixedCurrencies } = findDominantCurrency(expenses);
  const moneyExpenses = hasMixedCurrencies
    ? expenses.filter((e) => e.currency === currency)
    : expenses;

  const scoped = expenses
    .filter((expense) => expense.expense_date.startsWith(selectedMonth))
    .filter((expense) => category === "all" || expense.category === category);
  const scopedMoney = moneyExpenses
    .filter((expense) => expense.expense_date.startsWith(selectedMonth))
    .filter((expense) => category === "all" || expense.category === category);
  const total = scopedMoney.reduce((s, e) => s + e.amount, 0);
  // Scoped to the currently selected month/category (not the whole team's
  // history) so this matches exactly what "Total Spending" above represents.
  const scopedOtherTotals = groupByCurrency(scoped).filter((group) => group.currency !== currency);
  const scopedExcludedCount = scopedOtherTotals.reduce((sum, group) => sum + group.count, 0);
  const categoryFiltered = moneyExpenses.filter(
    (e) => category === "all" || e.category === category,
  );
  const spendingTrend = buildMonthlyTrend(categoryFiltered, 12, (m) =>
    m.reduce((s, e) => s + e.amount, 0),
  );
  const countTrend = buildMonthlyTrend(
    expenses.filter((e) => category === "all" || e.category === category),
    12,
    (m) => m.length,
  );
  const peak = spendingTrend.reduce((a, b) => (b.value > a.value ? b : a), spendingTrend[0]!);

  const chartData = spendingTrend.slice(-chartRange);
  const chartTotal = chartData.reduce((s, m) => s + m.value, 0);

  const byCategory = Object.entries(
    scopedMoney.reduce<Record<string, { amount: number; count: number }>>((acc, e) => {
      const cur = acc[e.category] ?? { amount: 0, count: 0 };
      cur.amount += e.amount;
      cur.count += 1;
      acc[e.category] = cur;
      return acc;
    }, {}),
  )
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);

  const filenameSuffix =
    category === "all" ? "" : `-${category.toLowerCase().replace(/\s+/g, "-")}`;
  const periodLabel = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function exportReport() {
    downloadCsv(
      `expense-report-${selectedMonth}${filenameSuffix}.csv`,
      [
        "Expense ID",
        "Date",
        "Description",
        "Category",
        "Amount",
        "Currency",
        "Vendor",
        "Payment Method",
        "Source of Fund",
        "Submitted By",
      ],
      scoped.map((expense) => [
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
      ]),
    );
  }

  function exportReportPdf() {
    downloadExpenseReportPdf({
      teamName: currentUser?.team_name ?? "CoinTrail",
      periodLabel,
      categoryLabel: category === "all" ? undefined : category,
      currency,
      totalSpending: total,
      topCategory: byCategory[0]
        ? { name: byCategory[0].name, amount: byCategory[0].amount }
        : undefined,
      rows: scoped.map((expense) => ({
        date: formatDate(expense.expense_date),
        description: expense.description,
        category: expense.category,
        submittedBy: expense.created_by_name,
        amount: expense.amount,
        currency: expense.currency,
      })),
      filename: `expense-report-${selectedMonth}${filenameSuffix}.pdf`,
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Spending trends and category analysis."
        icon={<BarChart3 className="h-4 w-4" />}
        overlapNext
        actions={
          <>
            <SelectField
              value={selectedMonth}
              onChange={(event) => setReportingMonth(event.target.value)}
              className="h-11 w-full sm:w-[154px]"
            >
              {reportingMonths.length === 0 ? (
                <option value={selectedMonth}>{selectedMonth}</option>
              ) : null}
              {reportingMonths.map((month) => (
                <option key={month} value={month}>
                  {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 w-full sm:w-[154px]"
            >
              <option value="all">All Categories</option>
              {categories.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </SelectField>
            <ExportMenu onExportPdf={exportReportPdf} onExportCsv={exportReport} />
          </>
        }
      />

      <KpiCarousel gridClassName="sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Spending"
          labelExtra={
            scopedOtherTotals.length > 0 ? (
              <InfoPopover>
                Shown in <span className="font-semibold text-foreground">{currency}</span>, the
                currency most of this is recorded in — amounts can&apos;t be added across currencies
                without a conversion rate. {scopedExcludedCount}{" "}
                {scopedExcludedCount === 1 ? "expense" : "expenses"} in another currency{" "}
                {scopedExcludedCount === 1 ? "is" : "are"} totaled separately, below.
              </InfoPopover>
            ) : undefined
          }
          value={formatMoneyShort(total, currency)}
          tone="primary"
          trend={spendingTrend}
          trendValueFormatter={(v) => formatMoneyShort(v, currency)}
          deltaNote={new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
          secondaryValue={
            scopedOtherTotals.length > 0 ? (
              <>
                {scopedOtherTotals.map((t) => (
                  <Link key={t.currency} to="/expenses" search={{ currency: t.currency }}>
                    <CurrencyChip label={formatMoneyShort(t.total, t.currency)} />
                  </Link>
                ))}
              </>
            ) : undefined
          }
        />
        <StatCard
          label="Transactions"
          value={String(scoped.length)}
          tone="success"
          trend={countTrend}
          deltaNote={category === "all" ? "All categories" : category}
        />
        <StatCard
          label="Highest Month"
          value={formatMoneyShort(peak.value, currency)}
          tone="violet"
          trend={spendingTrend}
          trendValueFormatter={(v) => formatMoneyShort(v, currency)}
          deltaNote={`${peak.label} · past 12 months`}
        />
      </KpiCarousel>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-foreground">Spending Trend</h2>
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
            Total spend (past {chartRange} months){category === "all" ? "" : ` in ${category}`}:{" "}
            <span className="font-semibold text-foreground">
              {formatMoneyShort(chartTotal, currency)}
            </span>
          </p>
          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportsSpendFill" x1="0" y1="0" x2="0" y2="1">
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
                    v >= 1000
                      ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`
                      : v.toLocaleString()
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
                  formatter={(v: number) => [formatMoneyShort(v, currency), "Spending"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#reportsSpendFill)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "var(--primary)",
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="text-[17px] font-semibold text-foreground">Category Breakdown</h2>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
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
                      <Cell key={c.name} fill={categoryColor(c.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                    formatter={(v: number) => formatMoneyShort(v, currency)}
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
                  <span className="text-foreground">{formatMoneyShort(c.amount, currency)}</span>
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
            Ranked by total spend for{" "}
            {new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        </div>
        <div className="divide-y divide-border/70 sm:hidden">
          {byCategory.map((c, i) => {
            const share = total ? (c.amount / total) * 100 : 0;
            return (
              <div key={c.name} className="flex items-center gap-3 px-6 py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[15px] font-medium text-foreground">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor(c.name) }}
                    />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: categoryColor(c.name),
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-[12px] text-muted-foreground">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-semibold whitespace-nowrap text-foreground">
                    {formatMoney(c.amount, currency)}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{c.count} txns</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto sm:block">
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
                            backgroundColor: categoryColor(c.name),
                          }}
                        />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[15px] text-foreground">{c.count}</td>
                    <td className="px-6 py-4 text-[15px] whitespace-nowrap text-foreground">
                      {formatMoney(c.amount, currency)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-[140px] overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: categoryColor(c.name),
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
