import { createFileRoute, Link } from "@tanstack/react-router";
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
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CategoryPill,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
  UserCell,
} from "@/components/expense-ui";
import { useExpenses } from "@/lib/app-data";
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
  const expense = useExpenses().find((e) => e.expense_id === expenseId);

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
      <Link
        to="/expenses"
        className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-10 font-bold tracking-tight text-foreground">
            {expense.description}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CategoryPill category={expense.category} />
            <StatusPill status={expense.status} />
            <span className="text-[15px] text-muted-foreground">
              {formatDate(expense.expense_date)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SecondaryButton>
            <Pencil className="h-4 w-4" /> Edit
          </SecondaryButton>
          <SecondaryButton className="text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Delete
          </SecondaryButton>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
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
            <h2 className="text-[17px] font-semibold text-foreground">Receipt</h2>
            {expense.receipt_file_id ? (
              <a href={`/api/receipts/${encodeURIComponent(expense.receipt_file_id)}`} target="_blank" rel="noreferrer">
                <PrimaryButton className="h-9 px-4 text-[14px]">
                  <Download className="h-4 w-4" /> View Receipt
                </PrimaryButton>
              </a>
            ) : null}
          </div>

          <div className="mt-4 flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-card">
              <Receipt className="h-7 w-7 text-muted-foreground" />
            </span>
            <p className="mt-4 text-[15px] font-medium text-foreground">
              {expense.receipt_filename ?? "No receipt attached"}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {expense.receipt_file_id
                ? "Stored securely in the company Drive folder."
                : "This expense was recorded without a receipt."}
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
