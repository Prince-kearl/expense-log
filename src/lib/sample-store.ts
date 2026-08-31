import { useSyncExternalStore } from "react";
import type { AppUser, Expense } from "./expenses";

export const CURRENT_USER: AppUser = {
  user_id: "USR-001",
  name: "Prince Keteni",
  email: "prince.keteni@company.com",
  profile_photo_url: null,
};

export const CATEGORIES: { category: string; subcategories: string[] }[] = [
  { category: "Food", subcategories: ["Meals & Dining", "Team Lunch", "Refreshments"] },
  { category: "Transport", subcategories: ["Fuel", "Taxi & Ride Hailing", "Vehicle Maintenance"] },
  { category: "Marketing", subcategories: ["Digital Ads", "Print & Branding", "Events"] },
  { category: "Operations", subcategories: ["Facilities", "Utilities", "Maintenance"] },
  { category: "Office Supplies", subcategories: ["Stationery", "Printing", "Subscriptions"] },
];

export const CONFIGURATION = {
  departments: ["Sales & Marketing", "Operations", "Finance", "Technology", "Human Resources"],
  paymentMethods: ["Mobile Money", "Bank Transfer", "Cash", "Company Card"],
  accounts: [
    "MTN Mobile Money (•••• 1234)",
    "Operations Account",
    "Stanbic Current (•••• 8890)",
    "Petty Cash",
  ],
  currencies: ["GHS", "USD", "EUR", "GBP"],
  vendors: [
    "Papaye Fast Food",
    "Office Mart",
    "Shell Ghana",
    "Meta Platforms",
    "Vodafone Ghana",
    "Uber Ghana",
  ],
};

const PEOPLE = [
  { id: "USR-001", name: "Prince Keteni", email: "prince.keteni@company.com" },
  { id: "USR-002", name: "John Mensah", email: "john.mensah@company.com" },
  { id: "USR-003", name: "Mary Owusu", email: "mary.owusu@company.com" },
];

type Seed = [string, string, string, string, number, number, string];

const SEEDS: Seed[] = [
  ["2026-08-19", "Team lunch with clients", "Food", "Meals & Dining", 350, 0, "Approved"],
  ["2026-08-19", "Fuel for delivery van", "Transport", "Fuel", 280, 1, "Paid"],
  ["2026-08-18", "Facebook ad campaign", "Marketing", "Digital Ads", 650, 2, "Pending"],
  ["2026-08-18", "Office stationery", "Office Supplies", "Stationery", 120, 0, "Paid"],
  ["2026-08-17", "Warehouse maintenance", "Operations", "Maintenance", 1250, 1, "Approved"],
  ["2026-08-16", "Internet subscription", "Office Supplies", "Subscriptions", 180, 2, "Paid"],
  ["2026-08-16", "Taxi to client meeting", "Transport", "Taxi & Ride Hailing", 60, 0, "Paid"],
  ["2026-08-15", "Client site visit", "Transport", "Fuel", 150, 0, "Approved"],
  ["2026-08-15", "Printer ink refill", "Office Supplies", "Printing", 90, 0, "Pending"],
  ["2026-08-14", "Printing and documents", "Office Supplies", "Printing", 90, 1, "Paid"],
  ["2026-08-14", "Client onboarding materials", "Marketing", "Print & Branding", 200, 0, "Approved"],
  ["2026-08-13", "Team building event", "Operations", "Facilities", 950, 2, "Approved"],
  ["2026-08-12", "Software subscription", "Marketing", "Digital Ads", 220, 0, "Paid"],
  ["2026-08-10", "Office water supply", "Operations", "Utilities", 340, 1, "Approved"],
  ["2026-08-08", "Marketing materials", "Marketing", "Print & Branding", 1250, 2, "Approved"],
  ["2026-08-05", "Uber to client meeting", "Transport", "Taxi & Ride Hailing", 85, 0, "Paid"],
  ["2026-08-03", "Internet subscription", "Office Supplies", "Subscriptions", 600, 1, "Paid"],
  ["2026-07-28", "Staff refreshments", "Food", "Refreshments", 420, 2, "Approved"],
  ["2026-07-21", "Generator servicing", "Operations", "Maintenance", 1800, 1, "Approved"],
  ["2026-07-15", "Radio advert", "Marketing", "Events", 2500, 0, "Approved"],
  ["2026-06-19", "Team lunch", "Food", "Team Lunch", 720, 0, "Paid"],
  ["2026-06-11", "Fuel top-up", "Transport", "Fuel", 460, 1, "Paid"],
  ["2026-05-22", "Office chairs", "Office Supplies", "Stationery", 1450, 2, "Approved"],
  ["2026-04-14", "Client dinner", "Food", "Meals & Dining", 890, 0, "Approved"],
];

function makeExpense(seed: Seed, index: number): Expense {
  const [date, description, category, subcategory, amount, personIdx, status] = seed;
  const person = PEOPLE[personIdx]!;
  const stamp = date.replace(/-/g, "");
  return {
    expense_id: `EXP-${stamp}-${String(index + 1).padStart(4, "0")}`,
    expense_date: date,
    description,
    category,
    subcategory,
    amount,
    currency: "GHS",
    department: CONFIGURATION.departments[index % CONFIGURATION.departments.length]!,
    vendor: CONFIGURATION.vendors[index % CONFIGURATION.vendors.length]!,
    payment_method: CONFIGURATION.paymentMethods[index % CONFIGURATION.paymentMethods.length]!,
    account: CONFIGURATION.accounts[index % CONFIGURATION.accounts.length]!,
    notes: "Recorded through the ExpenseTracker web app.",
    receipt_file_id: index % 3 === 0 ? `drive-file-${index}` : null,
    receipt_url: null,
    receipt_filename: index % 3 === 0 ? `receipt-${index}.jpg` : null,
    receipt_mime_type: index % 3 === 0 ? "image/jpeg" : null,
    status: status as Expense["status"],
    created_by_user_id: person.id,
    created_by_name: person.name,
    created_by_email: person.email,
    created_at: `${date}T10:24:00.000Z`,
    updated_by_user_id: null,
    updated_at: `${date}T10:24:00.000Z`,
    is_deleted: false,
  };
}

let expenses: Expense[] = SEEDS.map(makeExpense);
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const expenseStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get() {
    return expenses;
  },
  add(expense: Expense) {
    expenses = [expense, ...expenses];
    emit();
  },
};

export function useExpenses() {
  return useSyncExternalStore(
    expenseStore.subscribe,
    expenseStore.get,
    expenseStore.get,
  ).filter((e) => !e.is_deleted);
}

export function nextExpenseId(date: string) {
  const stamp = date.replace(/-/g, "");
  return `EXP-${stamp}-${String(expenseStore.get().length + 1).padStart(4, "0")}`;
}
