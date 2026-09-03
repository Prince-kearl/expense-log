import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, BarChart3, FileText, Home, LogOut, Monitor, Moon, PlusCircle, Sun, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCurrentUser } from "@/lib/app-data";
import { initials } from "@/lib/expenses";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: Home },
  { label: "Expenses", to: "/expenses", icon: FileText },
  { label: "Add Expense", to: "/expenses/new", icon: PlusCircle },
  { label: "My Expenses", to: "/my-expenses", icon: User },
  { label: "Reports", to: "/reports", icon: BarChart3 },
] as const;

type MenuKey = "account" | "notifications";

function useActiveNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (to: (typeof NAV)[number]["to"]) =>
    to === "/expenses" ? pathname === "/expenses" : pathname === to || pathname.startsWith(`${to}/`);
}

const THEME_OPTIONS: { value: Theme; icon: typeof Monitor; label: string }[] = [
  { value: "system", icon: Monitor, label: "Use system theme" },
  { value: "light", icon: Sun, label: "Use light theme" },
  { value: "dark", icon: Moon, label: "Use dark theme" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              "flex h-8 w-10 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

function AccountMenuPanel({ currentUser }: { currentUser: ReturnType<typeof useCurrentUser> }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {currentUser ? initials(currentUser.name) : "..."}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {currentUser?.name ?? "Loading account"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{currentUser?.email ?? ""}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-[13px] font-medium text-muted-foreground">Theme</p>
        <ThemeToggle />
      </div>

      <a
        href="/api/auth/signout"
        className="mt-4 flex h-9 items-center gap-3 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </a>
    </>
  );
}

function NotificationsPanel() {
  return (
    <div className="py-2 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Bell className="h-4 w-4 text-muted-foreground" />
      </span>
      <p className="mt-3 text-[14px] font-medium text-foreground">You're all caught up</p>
      <p className="mt-1 text-[13px] text-muted-foreground">No new notifications yet.</p>
    </div>
  );
}

function DesktopNav() {
  const isActive = useActiveNav();
  const currentUser = useCurrentUser();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);

  function toggle(menu: MenuKey) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  return (
    <header className="sticky top-4 z-30 hidden justify-center px-4 lg:flex">
      {openMenu ? (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} aria-hidden />
      ) : null}
      <div className="relative z-50 flex items-center gap-1 rounded-full bg-primary py-1.5 pr-3 pl-1.5 shadow-card">
        <img
          src="/favico.svg"
          alt="CoinTrail"
          className="h-11 w-auto shrink-0 pl-1 brightness-0 invert"
        />

        <nav className="flex items-center gap-1 px-3" aria-label="Primary">
          {NAV.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[14px] font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border border-primary-foreground/50 bg-primary-foreground/15 text-primary-foreground backdrop-blur-sm"
                    : "border border-transparent text-primary-foreground/70 hover:text-primary-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggle("notifications")}
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Bell className="h-4 w-4" />
          </button>
          {openMenu === "notifications" ? (
            <div className="absolute top-12 right-0 w-72 rounded-2xl border border-border bg-card p-4 text-left shadow-card">
              <NotificationsPanel />
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggle("account")}
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-full bg-primary-foreground py-1.5 pr-1.5 pl-3 text-[13px] font-semibold text-primary"
          >
            <span className="max-w-[130px] truncate">
              {currentUser?.name.split(" ")[0] ?? "Account"}
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
              {currentUser ? initials(currentUser.name) : <User className="h-3.5 w-3.5" />}
            </span>
          </button>
          {openMenu === "account" ? (
            <div className="absolute top-12 right-0 w-64 rounded-2xl border border-border bg-card p-4 text-left shadow-card">
              <AccountMenuPanel currentUser={currentUser} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const isActive = useActiveNav();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Primary"
    >
      <div className="flex w-fit max-w-full items-center gap-1 rounded-full bg-primary p-1.5 shadow-card">
        {NAV.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 items-center justify-center rounded-full border transition-colors",
                active
                  ? "gap-1.5 border-primary-foreground/50 bg-primary-foreground/15 px-3 py-2.5 text-primary-foreground backdrop-blur-sm"
                  : "h-10 w-10 shrink-0 border-transparent text-primary-foreground/50 hover:text-primary-foreground/80",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
              {active ? <span className="truncate text-[13px] font-semibold">{item.label}</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileMenuOverlay({
  open,
  onClose,
  currentUser,
}: {
  open: MenuKey | null;
  onClose: () => void;
  currentUser: ReturnType<typeof useCurrentUser>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-hidden />
      <div className="absolute top-16 right-4 w-72 rounded-2xl border border-border bg-card p-4 shadow-card">
        {open === "account" ? <AccountMenuPanel currentUser={currentUser} /> : <NotificationsPanel />}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileMenu, setMobileMenu] = useState<MenuKey | null>(null);
  const currentUser = useCurrentUser();

  function toggleMobile(menu: MenuKey) {
    setMobileMenu((current) => (current === menu ? null : menu));
  }

  return (
    <div className="min-h-screen bg-page">
      <DesktopNav />

      <MobileMenuOverlay open={mobileMenu} onClose={() => setMobileMenu(null)} currentUser={currentUser} />

      <div className="flex items-center justify-between gap-2 p-4 lg:hidden">
        <img src="/logo-primary.png" alt="CoinTrail" className="h-11 w-auto" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleMobile("notifications")}
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleMobile("account")}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground shadow-card"
          >
            {currentUser ? initials(currentUser.name) : <User className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <main className="px-4 pt-0 pb-28 sm:px-6 sm:pb-28 lg:px-8 lg:pt-8 lg:pb-10">{children}</main>

      <MobileBottomNav />
    </div>
  );
}
