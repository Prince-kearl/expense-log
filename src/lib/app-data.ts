import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, getExpenseConfiguration, getExpenses, getMyExpenses } from "./expense-api.functions";
import { DEFAULT_CATEGORIES, type AppUser, type Expense } from "./expenses";
import { getCurrentTeam } from "./team-api.functions";

type TeamMember = Awaited<ReturnType<typeof getCurrentTeam>>["members"][number];
const EMPTY_TEAM_MEMBERS: TeamMember[] = [];

export type ExpenseConfiguration = {
  categories: { category: string; subcategories: string[] }[];
};

const EMPTY_CONFIGURATION: ExpenseConfiguration = {
  categories: DEFAULT_CATEGORIES,
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

export function useTeamMembers() {
  const fetchTeam = useServerFn(getCurrentTeam);
  const [members, setMembers] = useState<TeamMember[]>(EMPTY_TEAM_MEMBERS);
  useEffect(() => {
    fetchTeam({ data: undefined })
      .then((result) => setMembers(result.members.filter((member) => member.status === "active")))
      .catch(() => setMembers(EMPTY_TEAM_MEMBERS));
  }, [fetchTeam]);
  return members;
}

export function useCurrentUser() {
  const fetchUser = useServerFn(getCurrentUser);
  const [user, setUser] = useState<AppUser | null>(null);
  useEffect(() => {
    fetchUser({ data: undefined }).then(setUser).catch(() => setUser(null));
  }, [fetchUser]);
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

  const refetch = useCallback(() => {
    fetchConfiguration({ data: undefined })
      .then((result) => setConfiguration(withDefaultCategories(result)))
      .catch(() => setConfiguration(EMPTY_CONFIGURATION));
  }, [fetchConfiguration]);

  useEffect(refetch, [refetch]);

  return { ...configuration, refetch };
}