import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  Hash,
  Landmark,
  Layers,
  NotebookPen,
  Pencil,
  Receipt,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CategoryPill,
  PrimaryButton,
  SecondaryButton,
  UserCell,
} from "@/components/expense-ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser, useExpenses } from "@/lib/app-data";
import { deleteExpense } from "@/lib/expense-api.functions";
import { formatDate, formatDateTime, formatMoney } from "@/lib/expenses";

export const Route = createFileRoute("/expenses/$expenseId")({
  head: () => ({
    meta: [
      { title: "Expense Details — ExpenseTracker" },
      {
        name: "description",
        content: "Full details, audit history and receipt preview for a recorded expense.",
      },
      { property: "og:title", content: "Expense Details — ExpenseTracker" },
      {
        property: "og:description",
        content: "Full details, audit history and receipt preview for a recorded expense.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpenseDetailsPage,
});

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border/70 py-4 last:border-0">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-[15px] font-medium break-words text-foreground">{value}</div>
      </div>
    </div>
  );
}

function ExpenseDetailsPage() {
  const { expenseId } = Route.useParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const expense = useExpenses().find((e) => e.expense_id === expenseId);
  const isOwnExpense = Boolean(currentUser && expense && currentUser.user_id === expense.created_by_user_id);
  const doDeleteExpense = useServerFn(deleteExpense);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await doDeleteExpense({ data: { expenseId } });
      navigate({ to: "/expenses" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete this expense.");
      setIsDeleting(false);
    }
  }

  if (!expense) {
    return (
      <AppShell>
        <Card className="p-12 text-center">
          <h1 className="text-[22px] font-bold text-foreground">Expense not found</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            This expense may have been deleted or the link is incorrect.
          </p>
          <Link to="/expenses" className="mt-4 inline-block text-[15px] font-medium text-primary">
            Back to Expenses
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="-mx-4 bg-primary px-4 pt-4 pb-20 sm:-mx-6 sm:px-6 lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0">
        <Link
          to="/expenses"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground lg:text-muted-foreground lg:hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Expenses
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-10 font-bold tracking-tight text-primary-foreground lg:text-foreground">
              {expense.description}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CategoryPill category={expense.category} />
              <span className="text-[15px] text-primary-foreground/80 lg:text-muted-foreground">
                {formatDate(expense.expense_date)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOwnExpense ? (
              <>
                <Link to="/expenses/new" search={{ edit: expense.expense_id }}>
                  <SecondaryButton type="button">
                    <Pencil className="h-4 w-4" /> Edit
                  </SecondaryButton>
                </Link>
                <SecondaryButton
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </SecondaryButton>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="-mt-14 grid gap-5 lg:mt-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card className="p-6">
            <p className="text-[15px] text-muted-foreground">Amount</p>
            <p className="mt-1 text-[38px] leading-11 font-bold tracking-tight text-foreground">
              {formatMoney(expense.amount, expense.currency)}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-[17px] font-semibold text-foreground">Expense Details</h2>
            <div className="mt-2">
              <Row
                icon={<Hash className="h-4.5 w-4.5" />}
                label="Expense ID"
                value={expense.expense_id}
              />
              <Row
                icon={<CalendarDays className="h-4.5 w-4.5" />}
                label="Date"
                value={formatDate(expense.expense_date)}
              />
              <Row
                icon={<Layers className="h-4.5 w-4.5" />}
                label="Category"
                value={`${expense.category}${expense.subcategory ? ` · ${expense.subcategory}` : ""}`}
              />
              <Row
                icon={<Store className="h-4.5 w-4.5" />}
                label="Vendor"
                value={expense.vendor || "—"}
              />
              <Row
                icon={<CreditCard className="h-4.5 w-4.5" />}
                label="Payment Method"
                value={expense.payment_method || "—"}
              />
              <Row
                icon={<Landmark className="h-4.5 w-4.5" />}
                label="Account"
                value={expense.account || "—"}
              />
              <Row
                icon={<NotebookPen className="h-4.5 w-4.5" />}
                label="Notes"
                value={expense.notes || "—"}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-[17px] font-semibold text-foreground">Audit Trail</h2>
            <div className="mt-2">
              <Row
                icon={<UserRound className="h-4.5 w-4.5" />}
                label="Added by"
                value={<UserCell name={expense.created_by_name} size="sm" />}
              />
              <Row
                icon={<FileText className="h-4.5 w-4.5" />}
                label="Created at"
                value={formatDateTime(expense.created_at)}
              />
              <Row
                icon={<FileText className="h-4.5 w-4.5" />}
                label="Last updated"
                value={formatDateTime(expense.updated_at)}
              />
            </div>
          </Card>
        </div>

        <Card className="flex h-fit flex-col p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-foreground">
              Receipt{expense.receipts.length > 1 ? "s" : ""}
            </h2>
            {expense.receipts.length === 1 ? (
              <a
                href={`/api/receipts/${encodeURIComponent(expense.expense_id)}?path=${encodeURIComponent(expense.receipts[0]!.path)}`}
                target="_blank"
                rel="noreferrer"
              >
                <PrimaryButton className="h-9 px-4 text-[14px]">
                  <Download className="h-4 w-4" /> View Receipt
                </PrimaryButton>
              </a>
            ) : null}
          </div>

          {expense.receipts.length === 0 ? (
            <div className="mt-4 flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-card">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </span>
              <p className="mt-4 text-[15px] font-medium text-foreground">No receipt attached</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                This expense was recorded without a receipt.
              </p>
            </div>
          ) : expense.receipts.length > 1 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {expense.receipts.map((receipt) => (
                <a
                  key={receipt.path}
                  href={`/api/receipts/${encodeURIComponent(expense.expense_id)}?path=${encodeURIComponent(receipt.path)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-border bg-muted/30 transition-colors hover:bg-muted/60"
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-card">
                    {receipt.mime_type.startsWith("image/") ? (
                      <img
                        src={`/api/receipts/${encodeURIComponent(expense.expense_id)}?path=${encodeURIComponent(receipt.path)}`}
                        alt={receipt.filename}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                      {receipt.filename}
                    </span>
                    <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </div>
                </a>
              ))}
            </div>
          ) : expense.receipts[0]!.mime_type.startsWith("image/") ? (
            <a
              href={`/api/receipts/${encodeURIComponent(expense.expense_id)}?path=${encodeURIComponent(expense.receipts[0]!.path)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block overflow-hidden rounded-xl border border-border bg-muted/30"
            >
              <img
                src={`/api/receipts/${encodeURIComponent(expense.expense_id)}?path=${encodeURIComponent(expense.receipts[0]!.path)}`}
                alt={expense.receipts[0]!.filename}
                className="max-h-[420px] w-full object-contain"
              />
            </a>
          ) : (
            <div className="mt-4 flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-card">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </span>
              <p className="mt-4 text-[15px] font-medium text-foreground">{expense.receipts[0]!.filename}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Stored securely.</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete this expense?</DialogTitle>
            <DialogDescription>
              This will remove &quot;{expense.description}&quot; from your team&apos;s records. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-[14px] text-destructive">{deleteError}</p> : null}
          <DialogFooter>
            <SecondaryButton type="button" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </SecondaryButton>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-destructive px-5 text-[15px] font-semibold text-destructive-foreground disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
