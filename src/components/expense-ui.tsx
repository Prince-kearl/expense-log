import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { CATEGORY_BADGE, STATUS_BADGE, initials } from "@/lib/expenses";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card-surface", className)}>{children}</div>;
}

export function StatCard({
  icon,
  iconClass,
  label,
  value,
  delta,
  deltaDirection = "up",
  deltaNote,
  accentClass = "border-t-primary",
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down";
  deltaNote?: string;
  accentClass?: string;
}) {
  return (
    <Card className={cn("min-h-[136px] border-t-2 p-4", accentClass)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[30px] leading-9 font-bold tracking-tight text-foreground">
          {value}
          </p>
          <p className="mt-2 text-[10px] font-semibold tracking-[0.12em] text-foreground uppercase">
            {label}
          </p>
        </div>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center", iconClass)}>
          {icon}
        </span>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        {delta || deltaNote ? (
          <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
            {delta ? (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  deltaDirection === "up" ? "text-success" : "text-warning",
                )}
              >
                {deltaDirection === "up" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
                {delta}
              </span>
            ) : null}
            {deltaNote ? <span className="text-muted-foreground">{deltaNote}</span> : null}
          </p>
        ) : <p className="text-[12px] text-muted-foreground">Current period</p>}
      </div>
    </Card>
  );
}

export function CategoryPill({ category }: { category: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-medium",
        CATEGORY_BADGE[category] ?? "bg-muted text-muted-foreground",
      )}
    >
      {category}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-medium",
        STATUS_BADGE[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function UserCell({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-primary-soft font-semibold text-primary",
          size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs",
        )}
      >
        {initials(name)}
      </span>
      <span className="text-[15px] text-foreground">{name}</span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[32px] leading-10 font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-1 flex items-center gap-2 text-[15px] text-muted-foreground">
            {icon}
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-medium text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export const fieldClass =
  "h-12 w-full rounded-none border border-border bg-card px-4 text-[15px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-muted-foreground";

export const labelClass = "mb-2 block text-[14px] font-medium text-foreground";
