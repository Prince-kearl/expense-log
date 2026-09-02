import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  Menu,
  PlusCircle,
  User,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCurrentUser } from "@/lib/app-data";
import { initials } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: Home },
  { label: "Expenses", to: "/expenses", icon: FileText },
  { label: "Add Expense", to: "/expenses/new", icon: PlusCircle },
  { label: "My Expenses", to: "/my-expenses", icon: User },
  { label: "Reports", to: "/reports", icon: BarChart3 },
] as const;

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggle,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentUser = useCurrentUser();

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-[232px]",
      )}
    >
      <div className={cn("flex items-center pt-6 pb-6", collapsed ? "flex-col px-3" : "gap-3 px-4")}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <BarChart3 className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </span>
        {!collapsed ? <span className="text-[21px] font-bold tracking-tight text-foreground">CoinTrail</span> : null}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed ? "mt-3" : "ml-auto",
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <nav className={cn("flex flex-col gap-2", collapsed ? "px-3" : "px-2")}>
        {NAV.map((item) => {
          const active =
            item.to === "/expenses"
              ? pathname === "/expenses"
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-11 items-center rounded-full text-[15px] font-medium transition-colors",
                collapsed ? "justify-center px-0" : "gap-3 px-4",
                active
                  ? "border border-primary/30 bg-sidebar-active text-sidebar-active-foreground"
                  : "border border-transparent text-sidebar-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {!collapsed ? item.label : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto border-t border-sidebar-border py-5", collapsed ? "px-3" : "px-5")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
            {currentUser ? initials(currentUser.name) : "..."}
          </span>
          {!collapsed ? <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {currentUser?.name ?? "Loading account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{currentUser?.email ?? ""}</p>
          </div> : null}
          {!collapsed ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
        </div>
        <a
          href="/api/auth/signout"
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "mt-4 flex h-9 items-center text-[15px] text-muted-foreground transition-colors hover:text-foreground",
            collapsed ? "justify-center" : "gap-3 px-1",
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed ? "Sign out" : null}
        </a>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 h-full">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="absolute top-5 right-5 rounded-full bg-card p-2 shadow-card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="m-4 rounded-full border border-border bg-card p-2 shadow-card lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <main className="px-6 pt-4 pb-12 lg:px-8 lg:pt-7">{children}</main>
      </div>
    </div>
  );
}
