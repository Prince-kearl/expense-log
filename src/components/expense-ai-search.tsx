import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle, Search, Sparkles, X } from "lucide-react";
import { Button } from "./ui/button";
import { PrimaryButton, fieldClass, CategoryPill } from "./expense-ui";
import { findExpenses } from "@/lib/expense-search.functions";
import type { ExpenseSearchResult } from "@/lib/expense-search";
import { formatDate, formatMoney } from "@/lib/expenses";

export function ExpenseAiSearch() {
  const search = useServerFn(findExpenses);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExpenseSearchResult | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !query.trim()) return;
    setBusy(true);
    setResult(null);
    try { setResult(await search({ data: { query } })); }
    catch (error) { setResult({ error: error instanceof Error ? error.message : "Search failed. Please try again." }); }
    finally { setBusy(false); }
  }

  return <section className="mb-5 border-y border-border py-5" aria-labelledby="ai-search-title">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id="ai-search-title" className="flex items-center gap-2 text-[16px] font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" />Find an expense</h2>
      <span className="text-xs text-muted-foreground">AI-powered</span>
    </div>
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="ai-expense-query">Describe the expense</label>
      <input id="ai-expense-query" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={1000} disabled={busy} placeholder="Taxi rides last month under GHS 200" className={fieldClass} />
      <PrimaryButton type="submit" disabled={busy || !query.trim()} className="shrink-0 justify-center">{busy ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Search className="h-4 w-4" />}{busy ? "Finding expenses…" : "Find matches"}</PrimaryButton>
    </form>
    <div aria-live="polite" aria-busy={busy}>
      {result && "error" in result ? <p role="alert" className="mt-3 text-sm text-destructive">{result.error}</p> : null}
      {result && "expenses" in result ? <div className="mt-4">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-foreground">{result.count === 0 ? "No matching expenses" : `${result.count} matching expense${result.count === 1 ? "" : "s"}`}{result.count > 20 ? " · showing latest 20" : ""}</p><Button variant="ghost" size="icon" title="Clear matches" aria-label="Clear matches" onClick={() => setResult(null)}><X className="h-4 w-4" /></Button></div>
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {result.criteria.onlyMine ? <span>My expenses</span> : null}
          {result.criteria.startDate || result.criteria.endDate ? <span>{result.criteria.startDate ?? "Any date"} – {result.criteria.endDate ?? "Today"}</span> : null}
          {result.criteria.minimumAmount !== null || result.criteria.maximumAmount !== null ? <span>{result.criteria.currency ?? "Amount"}: {result.criteria.minimumAmount ?? "0"} – {result.criteria.maximumAmount ?? "Any"}</span> : result.criteria.currency ? <span>{result.criteria.currency}</span> : null}
          {result.criteria.terms.length ? <span>Matching: {result.criteria.terms.join(", ")}</span> : null}
        </div>
        <ul className="divide-y divide-border">{result.expenses.map((expense) => <li key={expense.expense_id}><Link to="/expenses/$expenseId" params={{ expenseId: expense.expense_id }} className="flex items-start gap-3 py-3 text-foreground hover:bg-muted/50">
          <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{expense.description}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(expense.expense_date)} · {expense.vendor || expense.created_by_name}</p><div className="mt-2"><CategoryPill category={expense.category} /></div></div>
          <div className="flex shrink-0 items-center gap-2"><span className="text-sm font-semibold">{formatMoney(expense.amount, expense.currency)}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div>
        </Link></li>)}</ul>
      </div> : null}
    </div>
  </section>;
}