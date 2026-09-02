import { Children, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { CATEGORY_BADGE, initials } from "@/lib/expenses";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card-surface", className)}>{children}</div>;
}

export function KpiCarousel({
  children,
  gridClassName = "sm:grid-cols-2 xl:grid-cols-4",
}: {
  children: ReactNode;
  gridClassName?: string;
}) {
  const items = Children.toArray(children);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(items.length - 1, Math.max(0, index)));
  }

  function goTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-1 sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {child}
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5 sm:hidden">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "w-5 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
      ) : null}

      <div className={cn("hidden gap-5 sm:grid", gridClassName)}>{items}</div>
    </div>
  );
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
    <Card className={cn("min-h-[132px] border-t-2 p-3.5 sm:min-h-[136px] sm:p-4", accentClass)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[26px] leading-8 font-bold tracking-tight text-foreground sm:text-[30px] sm:leading-9">
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
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-9 font-bold tracking-tight text-foreground sm:text-[32px] sm:leading-10">{title}</h1>
        {subtitle ? (
          <p className="mt-1 flex items-center gap-2 text-[15px] text-muted-foreground">
            {icon}
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">{actions}</div> : null}
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

export function SelectField({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select {...props} className={cn(fieldClass, "appearance-none pr-10", className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
