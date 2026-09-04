import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, getExpenseConfiguration, getExpenses, getMyExpenses } from "./expense-api.functions";
import { DEFAULT_CATEGORIES, type AppUser, type Expense } from "./expenses";
import { getCurrentTeam, getNotifications, markNotificationsAsRead, type NotificationItem } from "./team-api.functions";

type TeamMember = Awaited<ReturnType<typeof getCurrentTeam>>["members"][number];
const EMPTY_TEAM_MEMBERS: TeamMember[] = [];
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];
const NOTIFICATIONS_POLL_MS = 60_000;

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

export function useNotifications() {
  const fetchNotifications = useServerFn(getNotifications);
  const doMarkRead = useServerFn(markNotificationsAsRead);
  const [items, setItems] = useState<NotificationItem[]>(EMPTY_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(0);

  const refetch = useCallback(() => {
    fetchNotifications({ data: undefined })
      .then((result) => {
        setItems(result.items);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => {
        setItems(EMPTY_NOTIFICATIONS);
        setUnreadCount(0);
      });
  }, [fetchNotifications]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, NOTIFICATIONS_POLL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    doMarkRead({ data: undefined }).catch(() => {
      // next poll will resync if this silently failed
    });
  }, [doMarkRead]);

  return { items, unreadCount, markAsRead, refetch };
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

  const refetch = useCallback(() => {
    fetchConfiguration({ data: undefined })
      .then((result) => setConfiguration(withDefaultCategories(result)))
      .catch(() => setConfiguration(EMPTY_CONFIGURATION));
  }, [fetchConfiguration]);

  useEffect(refetch, [refetch]);

  return { ...configuration, refetch };
}