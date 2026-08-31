import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  Menu,
  PlusCircle,
  User,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { CURRENT_USER } from "@/lib/sample-store";
import { initials } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: Home },
  { label: "Expenses", to: "/expenses", icon: FileText },
  { label: "Add Expense", to: "/expenses/new", icon: PlusCircle },
  { label: "My Expenses", to: "/my-expenses", icon: User },
  { label: "Reports", to: "/reports", icon: BarChart3 },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full w-[284px] flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 px-6 pt-7 pb-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <BarChart3 className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </span>
        <span className="text-[21px] font-bold tracking-tight text-foreground">
          Expense Tracker
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
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
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
            {initials(CURRENT_USER.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {CURRENT_USER.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{CURRENT_USER.email}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <Link
          to="/login"
          className="mt-4 flex items-center gap-3 px-1 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </Link>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <SidebarContent />
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
            className="absolute top-5 right-5 rounded-lg bg-card p-2 shadow-card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="m-4 rounded-lg border border-border bg-card p-2 shadow-card lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <main className="px-6 pt-4 pb-12 lg:px-10 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
