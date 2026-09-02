import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getCurrentUser, getExpenseConfiguration, getExpenses, getMyExpenses, getMonthlyBudget } from "./expense-api.functions";
import type { AppUser, Expense } from "./expenses";

export type ExpenseConfiguration = {
  categories: { category: string; subcategories: string[] }[];
  paymentMethods: string[];
  accounts: string[];
  currencies: string[];
};

const EMPTY_CONFIGURATION: ExpenseConfiguration = {
  categories: [],
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

export function useExpenseConfiguration() {
  const fetchConfiguration = useServerFn(getExpenseConfiguration);
  const [configuration, setConfiguration] = useState<ExpenseConfiguration>(EMPTY_CONFIGURATION);
  useEffect(() => {
    fetchConfiguration({ data: undefined }).then(setConfiguration).catch(() => setConfiguration(EMPTY_CONFIGURATION));
  }, [fetchConfiguration]);
  return configuration;
}

export function useMonthlyBudget(year: number, month: number) {
  const fetchBudget = useServerFn(getMonthlyBudget);
  const [budget, setBudget] = useState<number | null>(null);
  useEffect(() => {
    fetchBudget({ data: { year, month } }).then(setBudget).catch(() => setBudget(null));
  }, [fetchBudget, month, year]);
  return budget;
}