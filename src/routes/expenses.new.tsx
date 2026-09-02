import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, FileText, Plus, Save, UploadCloud, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  fieldClass,
  labelClass,
} from "@/components/expense-ui";
import { useExpenseConfiguration } from "@/lib/app-data";
import { createExpense, createExpenseCategory } from "@/lib/expense-api.functions";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
const PAYMENT_METHODS = ["Cash", "MoMo", "Credit Purchase", "Bank Transfer"];
const EXPENSE_DRAFT_KEY = "cointrail:expense-draft";
const CREATED_CATEGORIES_KEY = "cointrail:created-categories";
type FormErrors = {
  amount?: string;
  date?: string;
  description?: string;
  category?: string;
};
type ExpenseDraft = {
  amount: string;
  date: string;
  description: string;
  category: string;
  subcategory: string;
  vendor: string;
  paymentMethod: string;
  account: string;
  notes: string;
};
type CreatedCategory = { category: string; subcategories: string[] };

function readStoredValue<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    return (JSON.parse(window.localStorage.getItem(key) ?? "") as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function NewExpensePage() {
  const navigate = useNavigate();
  const saveExpense = useServerFn(createExpense);
  const saveCategory = useServerFn(createExpenseCategory);
  const configuration = useExpenseConfiguration();
  const [draft, setDraft] = useState<ExpenseDraft>(() => readStoredValue(EXPENSE_DRAFT_KEY, {
    amount: "", date: today(), description: "", category: "", subcategory: "", vendor: "", paymentMethod: "", account: "", notes: "",
  }));
  const [createdCategories, setCreatedCategories] = useState<CreatedCategory[]>(() => readStoredValue(CREATED_CATEGORIES_KEY, []));
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategories, setNewSubcategories] = useState([""]);
  const [categoryError, setCategoryError] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [receipts, setReceipts] = useState<File[]>([]);
  const [receiptPreviews, setReceiptPreviews] = useState<Map<File, string>>(new Map());
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const categories = [...configuration.categories, ...createdCategories];
  const subcategories = categories.find((item) => item.category === draft.category)?.subcategories ?? [];

  useEffect(() => {
    window.localStorage.setItem(EXPENSE_DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    window.localStorage.setItem(CREATED_CATEGORIES_KEY, JSON.stringify(createdCategories));
  }, [createdCategories]);

  useEffect(() => {
    const previews = new Map<File, string>();
    receipts.filter((receipt) => receipt.type.startsWith("image/")).forEach((receipt) => {
      previews.set(receipt, URL.createObjectURL(receipt));
    });
    setReceiptPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [receipts]);

  useEffect(() => {
    if (!cameraOpen) return;
    let active = true;
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by this browser.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          void cameraVideoRef.current.play();
        }
      })
      .catch(() => setCameraError("Unable to access the camera. Allow camera permission and try again."));
    return () => {
      active = false;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraOpen]);

  function selectReceipts(files: Iterable<File>) {
    const selected = Array.from(files);
    if (!selected.length) return;
    if (selected.some((file) => !["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setSubmitError("Receipts must be a JPG, PNG, or PDF no larger than 10 MB.");
      return;
    }
    if (receipts.length + selected.length > 10) {
      setSubmitError("Upload a maximum of 10 receipt files.");
      return;
    }
    setSubmitError("");
    setReceipts((current) => [...current, ...selected]);
  }

  function capturePhoto() {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still starting. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture the photo.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Unable to capture the photo.");
        return;
      }
      selectReceipts([new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" })]);
      setCameraOpen(false);
    }, "image/jpeg", 0.9);
  }

  async function addCategory() {
    const subcategoriesToCreate = [...new Set(newSubcategories.map((value) => value.trim()).filter(Boolean))];
    if (!newCategory.trim() || !subcategoriesToCreate.length) {
      setCategoryError("Enter a category and at least one subcategory.");
      return;
    }
    if (subcategoriesToCreate.length !== newSubcategories.map((value) => value.trim()).filter(Boolean).length) {
      setCategoryError("Each subcategory must be unique.");
      return;
    }
    setIsSavingCategory(true);
    setCategoryError("");
    try {
      await Promise.all(
        subcategoriesToCreate.map((subcategoryName) =>
          saveCategory({ data: { category: newCategory, subcategory: subcategoryName } }),
        ),
      );
      setCreatedCategories((current) => {
        const existing = current.find((item) => item.category === newCategory.trim());
        return existing
          ? current.map((item) => item.category === newCategory.trim() ? { ...item, subcategories: [...item.subcategories, ...subcategoriesToCreate] } : item)
          : [...current, { category: newCategory.trim(), subcategories: subcategoriesToCreate }];
      });
      setDraft((current) => ({
        ...current,
        category: newCategory.trim(),
        subcategory: subcategoriesToCreate[0] ?? "",
      }));
      setCategoryOpen(false);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Unable to add the category.");
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: FormErrors = {};
    if (!draft.amount || Number(draft.amount) <= 0) next.amount = "Enter an amount greater than zero.";
    if (!draft.date) next.date = "Select the expense date.";
    if (!draft.description.trim()) next.description = "Add a short description.";
    if (!draft.category) next.category = "Choose a category.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSaving(true);
    setSubmitError("");
    const formData = new FormData();
    formData.set("amount", draft.amount);
    formData.set("currency", "GHC");
    formData.set("expense_date", draft.date);
    formData.set("description", draft.description);
    formData.set("category", draft.category);
    formData.set("subcategory", draft.subcategory);
    formData.set("vendor", draft.vendor);
    formData.set("payment_method", draft.paymentMethod);
    formData.set("account", draft.account);
    formData.set("notes", draft.notes);
    receipts.forEach((receipt) => formData.append("receipts", receipt));
    try {
      const expense = await saveExpense({ data: formData });
      window.localStorage.removeItem(EXPENSE_DRAFT_KEY);
      navigate({ to: "/expenses/$expenseId", params: { expenseId: expense.expense_id } });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save the expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Add Expense"
        subtitle="Record a new expense for the organization."
        actions={
          <SecondaryButton
            type="button"
            onClick={() => {
              setNewCategory("");
              setNewSubcategories([""]);
              setCategoryError("");
              setCategoryOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add category
          </SecondaryButton>
        }
      />

      <form onSubmit={submit} className="max-w-none">
        <Card className="p-6 lg:p-8">
          <div className="grid gap-5 lg:grid-cols-3">
            <div>
              <label className={labelClass}>
                Amount (GHC) <span className="text-destructive">*</span>
              </label>
              <input
                value={draft.amount}
                onChange={(e) => setDraft((current) => ({ ...current, amount: e.target.value }))}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={fieldClass}
              />
              {errors.amount ? (
                <p className="mt-1.5 text-[13px] text-destructive">{errors.amount}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>
                Date <span className="text-destructive">*</span>
              </label>
              <input
                value={draft.date}
                onChange={(e) => setDraft((current) => ({ ...current, date: e.target.value }))}
                type="date"
                className={fieldClass}
              />
              {errors.date ? (
                <p className="mt-1.5 text-[13px] text-destructive">{errors.date}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>
                Description <span className="text-destructive">*</span>
              </label>
              <input
                value={draft.description}
                onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
                placeholder="Enter an expense description"
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
                value={draft.category}
                onChange={(e) => {
                  setDraft((current) => ({ ...current, category: e.target.value, subcategory: "" }));
                }}
                className={fieldClass}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
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
                value={draft.subcategory}
                onChange={(e) => setDraft((current) => ({ ...current, subcategory: e.target.value }))}
                disabled={!draft.category}
                className={cn(fieldClass, !draft.category && "opacity-60")}
              >
                <option value="">
                  {draft.category ? "Select subcategory" : "Select a category first"}
                </option>
                {subcategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Source of fund</label>
              <input
                value={draft.account}
                onChange={(e) => setDraft((current) => ({ ...current, account: e.target.value }))}
                placeholder="e.g. Petty cash or Operations account"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Vendor</label>
              <input
                value={draft.vendor}
                onChange={(e) => setDraft((current) => ({ ...current, vendor: e.target.value }))}
                list="vendor-options"
                placeholder="e.g. Papaye Fast Food"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                value={draft.paymentMethod}
                onChange={(e) => setDraft((current) => ({ ...current, paymentMethod: e.target.value }))}
                className={fieldClass}
              >
                <option value="">Select payment method</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className={labelClass}>Receipt</label>
              <div className="space-y-3">
                {receipts.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {receipts.map((receipt, index) => {
                      const preview = receiptPreviews.get(receipt);
                      return (
                        <div key={`${receipt.name}-${receipt.lastModified}-${index}`} className="border border-border bg-muted/50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2 text-[14px] text-foreground">
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              <span className="truncate">{receipt.name}</span>
                            </span>
                            <button type="button" onClick={() => setReceipts((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${receipt.name}`} className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {preview ? <img src={preview} alt={`Preview of ${receipt.name}`} className="mt-3 h-36 w-full border border-border object-contain bg-card" /> : <p className="mt-3 border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">PDF receipt</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    selectReceipts(e.dataTransfer.files);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragging ? "border-primary bg-primary-soft/60" : "border-border bg-muted/30",
                  )}
                >
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-[15px] font-medium text-foreground">Drag &amp; drop receipt files here</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    PNG, JPG or PDF up to 10MB
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <PrimaryButton type="button" onClick={() => fileInputRef.current?.click()}>
                      <UploadCloud className="h-4 w-4" /> Browse files
                    </PrimaryButton>
                    <SecondaryButton type="button" onClick={() => setCameraOpen(true)}>
                      <Camera className="h-4 w-4" /> Take photo
                    </SecondaryButton>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      selectReceipts(e.target.files ?? []);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))}
                rows={4}
                placeholder="Additional details about this expense..."
                className={cn(fieldClass, "h-auto py-3 leading-6")}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-6">
            {submitError ? <p className="mr-auto text-[14px] text-destructive">{submitError}</p> : null}
            <Link to="/expenses">
              <SecondaryButton type="button">Cancel</SecondaryButton>
            </Link>
            <PrimaryButton type="submit" disabled={isSaving}>
              <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Expense"}
            </PrimaryButton>
          </div>
        </Card>
      </form>
      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Take receipt photo</DialogTitle>
            <DialogDescription>Position the receipt in frame, then capture the image.</DialogDescription>
          </DialogHeader>
          <div className="aspect-[4/3] overflow-hidden bg-foreground">
            {cameraError ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-[14px] text-primary-foreground">
                {cameraError}
              </div>
            ) : (
              <video ref={cameraVideoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
            )}
          </div>
          <DialogFooter>
            <SecondaryButton type="button" onClick={() => setCameraOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton type="button" disabled={Boolean(cameraError)} onClick={capturePhoto}>
              <Camera className="h-4 w-4" /> Capture photo
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>Create an active category for future expenses.</DialogDescription>
          </DialogHeader>
          <label className={labelClass} htmlFor="new-category">Category name</label>
          <input id="new-category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className={fieldClass} />
          <div className="flex items-center justify-between gap-3">
            <label className="text-[14px] font-medium text-foreground">Subcategories</label>
            <button type="button" onClick={() => setNewSubcategories((current) => [...current, ""])} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add another
            </button>
          </div>
          <div className="space-y-2">
            {newSubcategories.map((subcategoryName, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={subcategoryName}
                  onChange={(event) => setNewSubcategories((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))}
                  placeholder={`Subcategory ${index + 1}`}
                  className={fieldClass}
                />
                {newSubcategories.length > 1 ? (
                  <button type="button" onClick={() => setNewSubcategories((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove subcategory ${index + 1}`} className="rounded-full px-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {categoryError ? <p className="text-[14px] text-destructive">{categoryError}</p> : null}
          <DialogFooter>
            <SecondaryButton type="button" onClick={() => setCategoryOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton type="button" disabled={isSavingCategory} onClick={addCategory}>
              {isSavingCategory ? "Saving..." : "Add category"}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
