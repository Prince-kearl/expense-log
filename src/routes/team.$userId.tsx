import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CategoryPill, KpiCarousel, PageHeader, StatCard } from "@/components/expense-ui";
import { downloadCsv } from "@/lib/csv";
import { buildMonthlyTrend, formatDate, formatHours, formatMoney, formatMoneyShort, initials } from "@/lib/expenses";
import { getMemberOverview } from "@/lib/team-api.functions";

function buildMonthlyHoursTrend(timeEntries: Overview["timeEntries"], monthsBack: number) {
  const now = new Date();
  const points: { label: string; value: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthHours = timeEntries
      .filter((entry) => {
        const entryDate = new Date(`${entry.entry_date}T00:00:00`);
        return entryDate.getFullYear() === cursor.getFullYear() && entryDate.getMonth() === cursor.getMonth();
      })
      .reduce((sum, entry) => sum + entry.hours, 0);
    points.push({ label: cursor.toLocaleDateString("en-US", { month: "short" }), value: monthHours });
  }
  return points;
}

export const Route = createFileRoute("/team/$userId")({
  head: () => ({
    meta: [{ title: "Team Member — CoinTrail" }],
  }),
  component: MemberOverviewPage,
});

type Overview = Awaited<ReturnType<typeof getMemberOverview>>;

function MemberOverviewPage() {
  const { userId } = Route.useParams();
  const fetchOverview = useServerFn(getMemberOverview);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOverview({ data: { userId } })
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load this team member."));
  }, [fetchOverview, userId]);

  const totalExpenses = overview?.expenses.reduce((s, e) => s + e.amount, 0) ?? 0;
  const totalHours = overview?.timeEntries.reduce((s, e) => s + e.hours, 0) ?? 0;

  function exportExpenses() {
    if (!overview) return;
    downloadCsv(
      `${overview.member.name.toLowerCase().replace(/\s+/g, "-")}-expenses.csv`,
      ["Expense ID", "Date", "Description", "Category", "Amount", "Currency", "Vendor", "Payment Method", "Source of Fund"],
      overview.expenses.map((e) => [
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

  function exportTimeEntries() {
    if (!overview) return;
    downloadCsv(
      `${overview.member.name.toLowerCase().replace(/\s+/g, "-")}-time-entries.csv`,
      ["Date", "Hours", "Note"],
      overview.timeEntries.map((entry) => [entry.entry_date, entry.hours, entry.note]),
    );
  }

  return (
    <AppShell>
      {error ? (
        <>
          <div className="mb-4">
            <Link to="/team" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to Team
            </Link>
          </div>
          <Card className="p-5">
            <p className="text-[14px] text-destructive">{error}</p>
          </Card>
        </>
      ) : !overview ? (
        <>
          <div className="mb-4">
            <Link to="/team" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to Team
            </Link>
          </div>
          <Card className="p-5">
            <p className="text-[14px] text-muted-foreground">Loading...</p>
          </Card>
        </>
      ) : (
        <>
          <Link
            to="/team"
            className="-mx-4 flex items-center gap-1.5 bg-primary px-4 pt-4 text-[14px] font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground sm:-mx-6 sm:px-6 lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:text-muted-foreground lg:hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Team
          </Link>
          <PageHeader
            title={overview.member.name}
            subtitle={`${overview.member.email} · Team ${overview.member.role === "owner" ? "Owner" : "Member"} since ${formatDate(overview.member.joined_at.slice(0, 10))}`}
            icon={
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">
                {initials(overview.member.name)}
              </span>
            }
            overlapNext
          />

          <KpiCarousel gridClassName="sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Expenses"
              value={formatMoneyShort(totalExpenses)}
              tone="primary"
              trend={buildMonthlyTrend(overview.expenses, 12, (m) => m.reduce((s, e) => s + e.amount, 0))}
              trendValueFormatter={(v) => formatMoneyShort(v)}
            />
            <StatCard
              label="Transactions"
              value={String(overview.expenses.length)}
              tone="violet"
              trend={buildMonthlyTrend(overview.expenses, 12, (m) => m.length)}
            />
            <StatCard
              label="Hours Logged"
              value={formatHours(totalHours)}
              tone="success"
              trend={buildMonthlyHoursTrend(overview.timeEntries, 12)}
              trendValueFormatter={(v) => formatHours(v)}
            />
          </KpiCarousel>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card className="min-w-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5">
                <h2 className="text-[17px] font-semibold text-foreground">Expenses</h2>
                {overview.expenses.length > 0 ? (
                  <button
                    type="button"
                    onClick={exportExpenses}
                    aria-label="Export expenses"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {overview.expenses.length === 0 ? (
                <p className="px-6 pb-6 text-[14px] text-muted-foreground">No expenses logged yet.</p>
              ) : (
                <div className="divide-y divide-border/70">
                  {[...overview.expenses]
                    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
                    .map((expense) => (
                      <Link
                        key={expense.expense_id}
                        to="/expenses/$expenseId"
                        params={{ expenseId: expense.expense_id }}
                        className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-foreground">{expense.description}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[12px] text-muted-foreground">{formatDate(expense.expense_date)}</span>
                            <CategoryPill category={expense.category} />
                          </div>
                        </div>
                        <p className="shrink-0 text-[14px] font-semibold whitespace-nowrap text-foreground">
                          {formatMoney(expense.amount, expense.currency)}
                        </p>
                      </Link>
                    ))}
                </div>
              )}
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5">
                <h2 className="text-[17px] font-semibold text-foreground">Time Logged</h2>
                {overview.timeEntries.length > 0 ? (
                  <button
                    type="button"
                    onClick={exportTimeEntries}
                    aria-label="Export time entries"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {overview.timeEntries.length === 0 ? (
                <p className="px-6 pb-6 text-[14px] text-muted-foreground">No time logged yet.</p>
              ) : (
                <div className="divide-y divide-border/70">
                  {[...overview.timeEntries]
                    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
                    .map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-6 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-foreground">{entry.note}</p>
                          <p className="mt-1 text-[12px] text-muted-foreground">{formatDate(entry.entry_date)}</p>
                        </div>
                        <p className="shrink-0 text-[14px] font-semibold whitespace-nowrap text-foreground">
                          {formatHours(entry.hours)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
