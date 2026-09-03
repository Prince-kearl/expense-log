import { useEffect, useState } from "react";

export type TimeEntry = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  hours: number;
  note: string;
  createdAt: string;
};

const STORAGE_KEY = "cointrail-time-entries";

function readStoredEntries(): TimeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>(readStoredEntries);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — entries stay in-memory for this session
    }
  }, [entries]);

  function addEntry(entry: { date: string; hours: number; note: string }) {
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    };
    setEntries((current) => [newEntry, ...current]);
  }

  function deleteEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return { entries, addEntry, deleteEntry };
}

export function buildMonthlyHoursTrend(entries: TimeEntry[], monthsBack: number) {
  const now = new Date();
  const points: { label: string; value: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthHours = entries
      .filter((entry) => {
        const entryDate = new Date(`${entry.date}T00:00:00`);
        return entryDate.getFullYear() === cursor.getFullYear() && entryDate.getMonth() === cursor.getMonth();
      })
      .reduce((sum, entry) => sum + entry.hours, 0);
    points.push({ label: cursor.toLocaleDateString("en-US", { month: "short" }), value: monthHours });
  }
  return points;
}
