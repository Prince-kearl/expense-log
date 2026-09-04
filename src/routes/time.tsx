import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, KpiCarousel, PageHeader, PrimaryButton, SecondaryButton, StatCard, fieldClass, labelClass } from "@/components/expense-ui";
import { downloadCsv } from "@/lib/csv";
import { deleteTimeEntry, getMyTimeEntries, logTime } from "@/lib/team-api.functions";
import { formatDate, formatHours } from "@/lib/expenses";

export const Route = createFileRoute("/time")({
  head: () => ({
    meta: [
      { title: "Time Tracking — CoinTrail" },
      {
        name: "description",
        content: "Log the hours you spend working on your role.",
      },
    ],
  }),
  component: TimeTrackingPage,
});

type TimeEntryRow = Awaited<ReturnType<typeof getMyTimeEntries>>[number];

function buildMonthlyHoursTrend(entries: TimeEntryRow[], monthsBack: number) {
  const now = new Date();
  const points: { label: string; value: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthHours = entries
      .filter((entry) => {
        const entryDate = new Date(`${entry.entry_date}T00:00:00`);
        return entryDate.getFullYear() === cursor.getFullYear() && entryDate.getMonth() === cursor.getMonth();
      })
      .reduce((sum, entry) => sum + entry.hours, 0);
    points.push({ label: cursor.toLocaleDateString("en-US", { month: "short" }), value: monthHours });
  }
  return points;
}

function TimeTrackingPage() {
  const fetchEntries = useServerFn(getMyTimeEntries);
  const doLogTime = useServerFn(logTime);
  const doDeleteEntry = useServerFn(deleteTimeEntry);

  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hoursPart, setHoursPart] = useState("");
  const [minutesPart, setMinutesPart] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEntries({ data: undefined }).then(setEntries).catch(() => setEntries([]));
  }, [fetchEntries]);

  const now = new Date();
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const thisMonthHours = entries
    .filter((e) => {
      const d = new Date(`${e.entry_date}T00:00:00`);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, e) => s + e.hours, 0);
  const hoursTrend = buildMonthlyHoursTrend(entries, 12);
  const entriesTrend = (() => {
    const points = buildMonthlyHoursTrend(entries, 12);
    return points.map((p, i) => ({
      label: p.label,
      value: entries.filter((e) => {
        const d = new Date(`${e.entry_date}T00:00:00`);
        const cursor = new Date(now.getFullYear(), now.getMonth() - (points.length - 1 - i), 1);
        return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
      }).length,
    }));
  })();

  const sorted = [...entries].sort(
    (a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const h = hoursPart.trim() === "" ? 0 : Number(hoursPart);
    const m = minutesPart.trim() === "" ? 0 : Number(minutesPart);
    if (!date) {
      setError("Pick a date.");
      return;
    }
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) {
      setError("Enter a valid duration.");
      return;
    }
    const parsedHours = h + m / 60;
    if (parsedHours <= 0) {
      setError("Enter a duration greater than zero.");
      return;
    }
    if (!note.trim()) {
      setError("Describe what you worked on.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const created = await doLogTime({ data: { date, hours: parsedHours, note: note.trim() } });
      setEntries((current) => [created, ...current]);
      setHoursPart("");
      setMinutesPart("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log time.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    try {
      await doDeleteEntry({ data: { id } });
    } catch {
      fetchEntries({ data: undefined }).then(setEntries).catch(() => {});
    }
  }

  function exportEntries() {
    downloadCsv(
      "time-entries.csv",
      ["Date", "Hours", "Note"],
      sorted.map((entry) => [entry.entry_date, entry.hours, entry.note]),
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Time Tracking"
        subtitle="Log the hours you spend working on your role."
        icon={<Clock className="h-4 w-4" />}
        overlapNext
        actions={
          <SecondaryButton type="button" onClick={exportEntries}>
            <Download className="h-4 w-4" /> Export
          </SecondaryButton>
        }
      />

      <KpiCarousel gridClassName="sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Hours" value={formatHours(totalHours)} tone="primary" trend={hoursTrend} trendValueFormatter={(v) => formatHours(v)} />
        <StatCard label="This Month" value={formatHours(thisMonthHours)} tone="success" trend={hoursTrend} trendValueFormatter={(v) => formatHours(v)} />
        <StatCard label="Entries" value={String(entries.length)} tone="violet" trend={entriesTrend} />
      </KpiCarousel>

      <Card className="my-5 p-5">
        <h2 className="text-[17px] font-semibold text-foreground">Log time</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-[160px_90px_90px_1fr_auto] sm:items-end">
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Hours</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={hoursPart}
              onChange={(e) => setHoursPart(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Minutes</label>
            <input
              type="number"
              min="0"
              max="59"
              step="5"
              placeholder="0"
              value={minutesPart}
              onChange={(e) => setMinutesPart(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>What did you work on?</label>
            <input
              type="text"
              placeholder="e.g. Backend development, design review..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={fieldClass}
            />
          </div>
          <PrimaryButton type="submit" disabled={isSubmitting} className="w-full justify-center sm:w-auto">
            {isSubmitting ? "Logging..." : "Log Time"}
          </PrimaryButton>
        </form>
        {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="divide-y divide-border/70 sm:hidden">
          {sorted.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-foreground">{entry.note}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{formatDate(entry.entry_date)}</p>
              </div>
              <p className="shrink-0 text-[15px] font-semibold whitespace-nowrap text-foreground">
                {formatHours(entry.hours)}
              </p>
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                aria-label="Delete entry"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {sorted.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-[15px] font-medium text-foreground">No time logged yet.</p>
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-border text-[13px] text-muted-foreground">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">What you worked on</th>
                <th className="px-6 py-4 font-medium">Hours</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr key={entry.id} className="border-b border-border/70 last:border-0">
                  <td className="px-6 py-4 text-[15px] whitespace-nowrap text-foreground">
                    {formatDate(entry.entry_date)}
                  </td>
                  <td className="px-6 py-4 text-[15px] text-foreground">{entry.note}</td>
                  <td className="px-6 py-4 text-[15px] whitespace-nowrap text-foreground">
                    {formatHours(entry.hours)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      aria-label="Delete entry"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <p className="text-[15px] font-medium text-foreground">No time logged yet.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
