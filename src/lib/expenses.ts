export type ExpenseReceipt = {
  path: string;
  filename: string;
  mime_type: string;
};

export type Expense = {
  expense_id: string;
  expense_date: string; // ISO yyyy-mm-dd
  description: string;
  category: string;
  subcategory: string;
  amount: number;
  currency: string;
  vendor: string;
  payment_method: string;
  account: string;
  notes: string;
  receipts: ExpenseReceipt[];
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
  team_id: string;
  team_name: string;
  role: "owner" | "member";
};

const CATEGORY_TONES: { color: string; badge: string }[] = [
  { color: "var(--primary)", badge: "bg-primary-soft text-primary" },
  { color: "var(--success)", badge: "bg-success-soft text-success" },
  { color: "var(--violet)", badge: "bg-violet-soft text-violet" },
  { color: "var(--warning)", badge: "bg-warning-soft text-warning" },
  { color: "var(--sky)", badge: "bg-sky-soft text-sky" },
];

// Deterministically assigns each category name a color from a fixed palette
// (rather than a hardcoded name lookup) so any category — including ones
// teams create themselves — gets a consistent color everywhere. The default
// categories each get their own reserved slot so they're never the same
// color as each other; custom categories hash into the remaining slots.
function categoryTone(category: string) {
  const defaultIndex = DEFAULT_CATEGORIES.findIndex((c) => c.category === category);
  if (defaultIndex !== -1) {
    return CATEGORY_TONES[defaultIndex % CATEGORY_TONES.length]!;
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) | 0;
  }
  const reserved = Math.min(DEFAULT_CATEGORIES.length, CATEGORY_TONES.length);
  const remaining = CATEGORY_TONES.length - reserved;
  const index = remaining > 0 ? reserved + (Math.abs(hash) % remaining) : Math.abs(hash) % CATEGORY_TONES.length;
  return CATEGORY_TONES[index]!;
}

export function categoryColor(category: string): string {
  return categoryTone(category).color;
}

export function categoryBadgeClass(category: string): string {
  return categoryTone(category).badge;
}

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

export function buildMonthlyTrend(
  expenses: Expense[],
  monthsBack: number,
  select: (monthExpenses: Expense[]) => number,
): { label: string; value: number }[] {
  const now = new Date();
  const points: { label: string; value: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(`${expense.expense_date}T00:00:00`);
      return expenseDate.getFullYear() === cursor.getFullYear() && expenseDate.getMonth() === cursor.getMonth();
    });
    points.push({
      label: cursor.toLocaleDateString("en-US", { month: "short" }),
      value: select(monthExpenses),
    });
  }
  return points;
}
