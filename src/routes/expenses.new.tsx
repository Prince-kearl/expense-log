import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, UploadCloud, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  fieldClass,
  labelClass,
} from "@/components/expense-ui";
import { CATEGORIES, CONFIGURATION, CURRENT_USER, expenseStore, nextExpenseId } from "@/lib/sample-store";
import type { Expense } from "@/lib/expenses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expenses/new")({
  head: () => ({
    meta: [
      { title: "Add Expense — ExpenseTracker" },
      {
        name: "description",
        content: "Record a new company expense with category, vendor, payment details and receipt.",
      },
      { property: "og:title", content: "Add Expense — ExpenseTracker" },
      {
        property: "og:description",
        content: "Record a new company expense with category, vendor, payment details and receipt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewExpensePage,
});

const today = () => new Date().toISOString().slice(0, 10);

function NewExpensePage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [department, setDepartment] = useState("");
  const [vendor, setVendor] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [account, setAccount] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subcategories = CATEGORIES.find((c) => c.category === category)?.subcategories ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!amount || Number(amount) <= 0) next.amount = "Enter an amount greater than zero.";
    if (!date) next.date = "Select the expense date.";
    if (!description.trim()) next.description = "Add a short description.";
    if (!category) next.category = "Choose a category.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const now = new Date().toISOString();
    const expense: Expense = {
      expense_id: nextExpenseId(date),
      expense_date: date,
      description: description.trim(),
      category,
      subcategory,
      amount: Number(amount),
      currency,
      department,
      vendor,
      payment_method: paymentMethod,
      account,
      notes,
      receipt_file_id: receipt ? `local-${Date.now()}` : null,
      receipt_url: null,
      receipt_filename: receipt?.name ?? null,
      receipt_mime_type: receipt?.type ?? null,
      status: "Pending",
      created_by_user_id: CURRENT_USER.user_id,
      created_by_name: CURRENT_USER.name,
      created_by_email: CURRENT_USER.email,
      created_at: now,
      updated_by_user_id: null,
      updated_at: now,
      is_deleted: false,
    };
    expenseStore.add(expense);
    navigate({ to: "/expenses" });
  }

  return (
    <AppShell>
      <Link
        to="/expenses"
        className="mb-4 inline-flex items-center gap-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Expenses
      </Link>

      <PageHeader title="Add Expense" subtitle="Record a new expense for the organization." />

      <form onSubmit={submit} className="max-w-[900px]">
        <Card className="p-6 lg:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Amount <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-3">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={cn(fieldClass, "w-[110px]")}
                >
                  {CONFIGURATION.currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={fieldClass}
                />
              </div>
              {errors.amount ? (
                <p className="mt-1.5 text-[13px] text-destructive">{errors.amount}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>
                Date <span className="text-destructive">*</span>
              </label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className={fieldClass}
              />
              {errors.date ? (
                <p className="mt-1.5 text-[13px] text-destructive">{errors.date}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                Description <span className="text-destructive">*</span>
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Team lunch with clients"
                className={fieldClass}
              />
              {errors.description ? (
                <p className="mt-1.5 text-[13px] text-destructive">{errors.description}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>
                Category <span className="text-destructive">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory("");
                }}
                className={fieldClass}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.category}>{c.category}</option>
                ))}
              </select>
              {errors.category ? (
                <p className="mt-1.5 text-[13px] text-destructive">{errors.category}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>Subcategory</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={!category}
                className={cn(fieldClass, !category && "opacity-60")}
              >
                <option value="">
                  {category ? "Select subcategory" : "Select a category first"}
                </option>
                {subcategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select department</option>
                {CONFIGURATION.departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Vendor</label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                list="vendor-options"
                placeholder="e.g. Papaye Fast Food"
                className={fieldClass}
              />
              <datalist id="vendor-options">
                {CONFIGURATION.vendors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select payment method</option>
                {CONFIGURATION.paymentMethods.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Account</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select account</option>
                {CONFIGURATION.accounts.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Receipt</label>
              {receipt ? (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3">
                  <span className="truncate text-[15px] text-foreground">{receipt.name}</span>
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    aria-label="Remove receipt"
                    className="rounded-lg p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setReceipt(f);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragging ? "border-primary bg-primary-soft/60" : "border-border bg-muted/30",
                  )}
                >
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-[15px] font-medium text-foreground">
                    Drag &amp; drop a receipt here, or{" "}
                    <span className="text-primary">browse</span>
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    PNG, JPG or PDF up to 10MB
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    className="hidden"
                    onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Additional details about this expense..."
                className={cn(fieldClass, "h-auto py-3 leading-6")}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-6">
            <Link to="/expenses">
              <SecondaryButton type="button">Cancel</SecondaryButton>
            </Link>
            <PrimaryButton type="submit">
              <Save className="h-4 w-4" /> Save Expense
            </PrimaryButton>
          </div>
        </Card>
      </form>
    </AppShell>
  );
}
