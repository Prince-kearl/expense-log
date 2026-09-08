import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PrimaryButton, SecondaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BudgetItem } from "@/lib/app-data";
import { formatMoneyShort } from "@/lib/expenses";
import { removeBudget, saveBudget } from "@/lib/team-api.functions";
import { cn } from "@/lib/utils";

function budgetTone(share: number) {
  if (share >= 100) return "text-destructive";
  if (share >= 80) return "text-warning";
  return "text-success";
}

function budgetBarColor(share: number) {
  if (share >= 100) return "var(--destructive)";
  if (share >= 80) return "var(--warning)";
  return "var(--success)";
}

export function BudgetProgressBar({
  spent,
  amount,
  currency,
}: {
  spent: number;
  amount: number;
  currency: string;
}) {
  const share = amount > 0 ? (spent / amount) * 100 : 0;
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className={cn("font-medium", budgetTone(share))}>
          {formatMoneyShort(spent, currency)}
        </span>
        <span className="text-muted-foreground">of {formatMoneyShort(amount, currency)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(share, 100)}%`, backgroundColor: budgetBarColor(share) }}
        />
      </div>
    </div>
  );
}

type BudgetRow = { key: string; label: string; category: string | null };

export function BudgetDialog({
  open,
  onClose,
  month,
  monthLabel,
  categories,
  budgets,
  currency,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  monthLabel: string;
  categories: string[];
  budgets: BudgetItem[];
  currency: string;
  onSaved: () => void;
}) {
  const doSaveBudget = useServerFn(saveBudget);
  const doRemoveBudget = useServerFn(removeBudget);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rows: BudgetRow[] = [
    { key: "__overall__", label: "Overall (all categories)", category: null },
    ...categories.map((c) => ({ key: c, label: c, category: c })),
  ];

  // Snapshot current budgets into editable drafts every time the dialog opens,
  // so re-opening it always reflects the latest saved amounts rather than
  // whatever was left over from a previous open-edit-cancel cycle.
  if (open && Object.keys(amounts).length === 0) {
    const initial: Record<string, string> = {};
    for (const row of rows) {
      const existing = budgets.find((b) => b.category === row.category);
      initial[row.key] = existing ? String(existing.amount) : "";
    }
    setAmounts(initial);
  }

  function handleClose() {
    setAmounts({});
    setError("");
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await Promise.all(
        rows.map(async (row) => {
          const raw = amounts[row.key]?.trim() ?? "";
          const existing = budgets.find((b) => b.category === row.category);
          if (raw === "") {
            if (existing) await doRemoveBudget({ data: { budgetId: existing.id } });
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed) || parsed < 0) return;
          await doSaveBudget({ data: { category: row.category, month, amount: parsed, currency } });
        }),
      );
      onSaved();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save budgets.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Set Budgets — {monthLabel}</DialogTitle>
          <DialogDescription>
            Leave a field blank to remove that budget. Amounts are in {currency}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {rows.map((row) => (
              <div key={row.key}>
                <label className={labelClass}>{row.label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No budget set"
                  value={amounts[row.key] ?? ""}
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [row.key]: e.target.value }))}
                  className={fieldClass}
                />
              </div>
            ))}
          </div>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <DialogFooter>
            <SecondaryButton type="button" onClick={handleClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Budgets"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
