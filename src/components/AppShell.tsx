import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  BarChart3,
  ChevronLeft,
  Clock,
  FileText,
  Home,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  MoreHorizontal,
  PlusCircle,
  Receipt,
  Sun,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { PrimaryButton, SecondaryButton, fieldClass, labelClass } from "@/components/expense-ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser, useNotifications, useRequireAuth } from "@/lib/app-data";
import { formatHours, formatMoney, initials } from "@/lib/expenses";
import { changePassword, type NotificationItem } from "@/lib/team-api.functions";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: Home, mobileSlot: "pinned" },
  { label: "Expenses", to: "/expenses", icon: FileText, mobileSlot: "primary" },
  { label: "Add Expense", to: "/expenses/new", icon: PlusCircle, mobileSlot: "primary" },
  { label: "My Expenses", to: "/my-expenses", icon: User, mobileSlot: "more" },
  { label: "Time Tracking", to: "/time", icon: Clock, mobileSlot: "primary" },
  { label: "Reports", to: "/reports", icon: BarChart3, mobileSlot: "more" },
  { label: "Team", to: "/team", icon: Users, mobileSlot: "more" },
] as const;

const MOBILE_PINNED_NAV = NAV.filter((item) => item.mobileSlot === "pinned");
const MOBILE_PRIMARY_NAV = NAV.filter((item) => item.mobileSlot === "primary");
const MOBILE_MORE_NAV = NAV.filter((item) => item.mobileSlot === "more");

// AppShell is mounted fresh by every route (each page wraps itself in <AppShell>),
// so ordinary component state resets on every navigation. Keeping "show more" here,
// outside the component tree, lets it survive those remounts until the user taps Back.
let mobileNavShowMore = false;
const mobileNavShowMoreListeners = new Set<() => void>();

function setMobileNavShowMore(value: boolean) {
  mobileNavShowMore = value;
  mobileNavShowMoreListeners.forEach((listener) => listener());
}

function useMobileNavShowMore() {
  return useSyncExternalStore(
    (onStoreChange) => {
      mobileNavShowMoreListeners.add(onStoreChange);
      return () => mobileNavShowMoreListeners.delete(onStoreChange);
    },
    () => mobileNavShowMore,
    () => false, // SSR has no concept of this client-only toggle — always render collapsed
  );
}

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

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doChangePassword = useServerFn(changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setError("");
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await doChangePassword({ data: { currentPassword, newPassword } });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        {success ? (
          <>
            <p className="text-[14px] text-success">Your password has been changed.</p>
            <DialogFooter>
              <SecondaryButton type="button" onClick={handleClose}>
                Close
              </SecondaryButton>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Current password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={fieldClass}
              />
            </div>
            {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
            <DialogFooter>
              <SecondaryButton type="button" onClick={handleClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </PrimaryButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccountMenuPanel({ currentUser }: { currentUser: ReturnType<typeof useCurrentUser> }) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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

      <button
        type="button"
        onClick={() => setChangePasswordOpen(true)}
        className="mt-4 flex h-9 w-full items-center gap-3 text-left text-[15px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <KeyRound className="h-5 w-5" />
        Change password
      </button>

      <a
        href="/api/auth/signout"
        className="mt-1 flex h-9 items-center gap-3 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </a>

      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const icon =
    item.type === "expense" ? (
      <Receipt className="h-4 w-4" />
    ) : item.type === "time" ? (
      <Clock className="h-4 w-4" />
    ) : (
      <UserPlus className="h-4 w-4" />
    );

  const description =
    item.type === "expense" ? (
      <>
        logged <span className="font-medium text-foreground">{formatMoney(item.amount, item.currency)}</span> for{" "}
        {item.description}
      </>
    ) : item.type === "time" ? (
      <>
        logged <span className="font-medium text-foreground">{formatHours(item.hours)}</span>
        {item.note ? ` — ${item.note}` : ""}
      </>
    ) : (
      "joined the team"
    );

  const content = (
    <div className="flex items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-5 text-foreground">
          <span className="font-semibold">{item.actorName}</span> {description}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{timeAgo(item.timestamp)}</p>
      </div>
    </div>
  );

  if (item.type === "expense") {
    return (
      <Link to="/expenses/$expenseId" params={{ expenseId: item.expenseId }}>
        {content}
      </Link>
    );
  }
  if (item.type === "join") {
    return (
      <Link to="/team/$userId" params={{ userId: item.userId }}>
        {content}
      </Link>
    );
  }
  return content;
}

function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  if (items.length === 0) {
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

  return (
    <div className="max-h-[360px] space-y-1 overflow-y-auto">
      {items.map((item) => (
        <NotificationRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function DesktopNav() {
  const isActive = useActiveNav();
  const currentUser = useCurrentUser();
  const notifications = useNotifications();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);

  function toggle(menu: MenuKey) {
    setOpenMenu((current) => {
      const next = current === menu ? null : menu;
      if (next === "notifications") notifications.markAsRead();
      return next;
    });
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
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Bell className="h-4 w-4" />
            <NotificationBadge count={notifications.unreadCount} />
          </button>
          {openMenu === "notifications" ? (
            <div className="absolute top-12 right-0 w-80 rounded-2xl border border-border bg-card p-4 text-left shadow-card">
              <NotificationsPanel items={notifications.items} />
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
  const showMore = useMobileNavShowMore();
  const moreActive = MOBILE_MORE_NAV.some((item) => isActive(item.to));

  const items = [...MOBILE_PINNED_NAV, ...(showMore ? MOBILE_MORE_NAV : MOBILE_PRIMARY_NAV)];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Primary"
    >
      <div className="flex w-fit max-w-full items-center gap-1 rounded-full bg-primary p-1.5 shadow-card">
        {items.map((item) => {
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
        <button
          type="button"
          onClick={() => setMobileNavShowMore(!showMore)}
          aria-label={showMore ? "Back" : "More"}
          aria-expanded={showMore}
          className={cn(
            "flex min-w-0 items-center justify-center rounded-full border transition-colors",
            showMore || moreActive
              ? "gap-1.5 border-primary-foreground/50 bg-primary-foreground/15 px-3 py-2.5 text-primary-foreground backdrop-blur-sm"
              : "h-10 w-10 shrink-0 border-transparent text-primary-foreground/50 hover:text-primary-foreground/80",
          )}
        >
          {showMore ? (
            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2.4} />
          ) : (
            <MoreHorizontal className="h-5 w-5 shrink-0" strokeWidth={moreActive ? 2.4 : 2} />
          )}
          {showMore || moreActive ? (
            <span className="truncate text-[13px] font-semibold">{showMore ? "Back" : "More"}</span>
          ) : null}
        </button>
      </div>
    </nav>
  );
}

function MobileMenuOverlay({
  open,
  onClose,
  currentUser,
  notificationItems,
}: {
  open: MenuKey | null;
  onClose: () => void;
  currentUser: ReturnType<typeof useCurrentUser>;
  notificationItems: NotificationItem[];
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-hidden />
      <div className="absolute top-16 right-4 w-72 rounded-2xl border border-border bg-card p-4 shadow-card">
        {open === "account" ? (
          <AccountMenuPanel currentUser={currentUser} />
        ) : (
          <NotificationsPanel items={notificationItems} />
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileMenu, setMobileMenu] = useState<MenuKey | null>(null);
  const currentUser = useRequireAuth();
  const notifications = useNotifications();

  function toggleMobile(menu: MenuKey) {
    setMobileMenu((current) => {
      const next = current === menu ? null : menu;
      if (next === "notifications") notifications.markAsRead();
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-page">
      <DesktopNav />

      <MobileMenuOverlay
        open={mobileMenu}
        onClose={() => setMobileMenu(null)}
        currentUser={currentUser}
        notificationItems={notifications.items}
      />

      <div className="header-pattern flex items-center justify-between gap-2 bg-primary p-4 lg:hidden">
        <img src="/favico.svg" alt="CoinTrail" className="h-11 w-auto brightness-0 invert" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleMobile("notifications")}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card"
          >
            <Bell className="h-4 w-4" />
            <NotificationBadge count={notifications.unreadCount} />
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
