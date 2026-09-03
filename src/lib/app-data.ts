import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getCurrentUser, getExpenseConfiguration, getExpenses, getMyExpenses } from "./expense-api.functions";
import { DEFAULT_CATEGORIES, type AppUser, type Expense } from "./expenses";

export type ExpenseConfiguration = {
  categories: { category: string; subcategories: string[] }[];
  paymentMethods: string[];
  accounts: string[];
  currencies: string[];
};

const EMPTY_CONFIGURATION: ExpenseConfiguration = {
  categories: DEFAULT_CATEGORIES,
  paymentMethods: [],
  accounts: [],
  currencies: [],
};
const EMPTY_EXPENSES: Expense[] = [];

export function useExpenses() {
  const fetchExpenses = useServerFn(getExpenses);
  const [expenses, setExpenses] = useState<Expense[]>(EMPTY_EXPENSES);
  useEffect(() => {
    fetchExpenses({ data: undefined }).then(setExpenses).catch(() => setExpenses(EMPTY_EXPENSES));
  }, [fetchExpenses]);
  return expenses;
}

export function useMyExpenses() {
  const fetchExpenses = useServerFn(getMyExpenses);
  const [expenses, setExpenses] = useState<Expense[]>(EMPTY_EXPENSES);
  useEffect(() => {
    fetchExpenses({ data: undefined }).then(setExpenses).catch(() => setExpenses(EMPTY_EXPENSES));
  }, [fetchExpenses]);
  return expenses;
}

export function useCurrentUser() {
  const fetchUser = useServerFn(getCurrentUser);
  const [user, setUser] = useState<AppUser | null>(null);
  useEffect(() => {
    fetchUser({ data: undefined }).then(setUser).catch(() => setUser(null));
  }, [fetchUser]);
  return user;
}

export function useRequireAuth() {
  const fetchUser = useServerFn(getCurrentUser);
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser | null>(null);
  useEffect(() => {
    fetchUser({ data: undefined })
      .then((result) => {
        setUser(result);
        if (!result) navigate({ to: "/login", replace: true });
      })
      .catch(() => navigate({ to: "/login", replace: true }));
  }, [fetchUser, navigate]);
  return user;
}


function withDefaultCategories(configuration: ExpenseConfiguration): ExpenseConfiguration {
  const existing = new Set(configuration.categories.map((c) => c.category));
  const extras = DEFAULT_CATEGORIES.filter((c) => !existing.has(c.category));
  return { ...configuration, categories: [...configuration.categories, ...extras] };
}

export function useExpenseConfiguration() {
  const fetchConfiguration = useServerFn(getExpenseConfiguration);
  const [configuration, setConfiguration] = useState<ExpenseConfiguration>(EMPTY_CONFIGURATION);
  useEffect(() => {
    fetchConfiguration({ data: undefined })
      .then((result) => setConfiguration(withDefaultCategories(result)))
      .catch(() => setConfiguration(EMPTY_CONFIGURATION));
  }, [fetchConfiguration]);
  return configuration;
}