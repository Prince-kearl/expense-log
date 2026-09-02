export type Expense = {
  expense_id: string;
  expense_date: string; // ISO yyyy-mm-dd
  description: string;
  category: string;
  subcategory: string;
  amount: number;
  currency: string;
  department: string;
  vendor: string;
  payment_method: string;
  account: string;
  notes: string;
  receipt_file_id: string | null;
  receipt_url: string | null;
  receipt_filename: string | null;
  receipt_mime_type: string | null;
  created_by_user_id: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_by_user_id: string | null;
  updated_at: string;
  is_deleted: boolean;
};

export type AppUser = {
  user_id: string;
  name: string;
  email: string;
  profile_photo_url: string | null;
};

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "var(--primary)",
  Transport: "var(--success)",
  Marketing: "var(--violet)",
  Operations: "var(--warning)",
  "Office Supplies": "var(--teal)",
};

export const CATEGORY_BADGE: Record<string, string> = {
  Food: "bg-primary-soft text-primary",
  Transport: "bg-success-soft text-success",
  Marketing: "bg-violet-soft text-violet",
  Operations: "bg-warning-soft text-warning",
  "Office Supplies": "bg-sky-soft text-sky",
};

export const DEFAULT_CATEGORIES: { category: string; subcategories: string[] }[] = [
  {
    category: "Capex",
    subcategories: [
      "Product/Software Development",
      "Tech Infrastructure",
      "Office & Equipment",
      "Other Capex",
    ],
  },
  {
    category: "Opex",
    subcategories: [
      "Rent & Office Supplies",
      "Cloud Infrastructure",
      "Regulatory & Legal",
      "People Cost",
      "Marketing & Customer Acquisition",
      "General Operations",
      "Misc & Contingency",
    ],
  },
];

export function formatMoney(amount: number, currency = "GHS") {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMoneyShort(amount: number, currency = "GHS") {
  return `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}
