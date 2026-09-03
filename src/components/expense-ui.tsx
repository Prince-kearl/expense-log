import { Children, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus } from "lucide-react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CATEGORY_BADGE, initials } from "@/lib/expenses";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card-surface", className)}>{children}</div>;
}

const AVATAR_TONES = [
  "bg-primary-soft text-primary",
  "bg-success-soft text-success",
  "bg-violet-soft text-violet",
  "bg-warning-soft text-warning",
  "bg-sky-soft text-sky",
];

export function TeamAvatarStack({
  members,
  max = 6,
}: {
  members: { name: string; email: string }[];
  max?: number;
}) {
  const visible = members.slice(0, max);

  return (
    <div className="flex items-center -space-x-3">
      {visible.map((member, i) => (
        <span
          key={member.email || member.name}
          title={member.name}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border-2 border-card text-[13px] font-semibold shadow-card",
            AVATAR_TONES[i % AVATAR_TONES.length],
          )}
        >
          {initials(member.name)}
        </span>
      ))}
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border bg-card text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
      </span>
    </div>
  );
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
    <div className="-mt-14 lg:mt-0">
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

export type StatTrendPoint = { label: string; value: number };
export type StatTone = "primary" | "success" | "violet" | "warning" | "sky";

const STAT_TONE: Record<StatTone, { from: string; stroke: string; border: string }> = {
  primary: { from: "from-primary/25", stroke: "var(--primary)", border: "border-primary/25" },
  success: { from: "from-success/25", stroke: "var(--success)", border: "border-success/25" },
  violet: { from: "from-violet/25", stroke: "var(--violet)", border: "border-violet/25" },
  warning: { from: "from-warning/25", stroke: "var(--warning)", border: "border-warning/25" },
  sky: { from: "from-sky/25", stroke: "var(--sky)", border: "border-sky/25" },
};

function trendChangePercent(trend: StatTrendPoint[]) {
  if (trend.length < 2) return 0;
  const prev = trend[trend.length - 2]!.value;
  const curr = trend[trend.length - 1]!.value;
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

export function StatCard({
  label,
  value,
  deltaNote,
  trend,
  tone = "primary",
  periodLabel = "Past 12 months",
  changePercent,
  trendValueFormatter = (v: number) => String(v),
}: {
  label: string;
  value: string;
  deltaNote?: ReactNode;
  trend: StatTrendPoint[];
  tone?: StatTone;
  periodLabel?: string;
  changePercent?: number;
  trendValueFormatter?: (value: number) => string;
}) {
  const gradientId = useId();
  const { from, stroke, border } = STAT_TONE[tone];
  const change = changePercent ?? trendChangePercent(trend);
  const changeUp = change >= 0;
  const last = trend[trend.length - 1];

  return (
    <Card className={cn("relative overflow-hidden border bg-gradient-to-br via-card to-card p-4", from, border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                changeUp ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {changeUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="flex items-center gap-0.5 text-[12px] text-muted-foreground">
              {periodLabel}
              <ChevronDown className="h-3 w-3" />
            </span>
          </div>

          <p className="mt-3 truncate text-[26px] leading-8 font-bold tracking-tight text-foreground sm:text-[28px]">
            {value}
          </p>
          {deltaNote ? <p className="mt-1 truncate text-[13px] text-muted-foreground">{deltaNote}</p> : null}
        </div>

        <div className="relative h-16 w-24 shrink-0 pt-6 sm:h-20 sm:w-28">
          {last ? (
            <div className="absolute top-0 right-0 z-10 border border-border bg-card px-2 py-1 text-left whitespace-nowrap shadow-card">
              <p className="text-[11px] font-semibold text-foreground">{trendValueFormatter(last.value)}</p>
              <p className="text-[10px] text-muted-foreground">{last.label}</p>
            </div>
          ) : null}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 0, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              {last ? (
                <ReferenceLine x={last.label} stroke={stroke} strokeOpacity={0.4} strokeDasharray="2 3" />
              ) : null}
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={(dotProps: { cx?: number; cy?: number; index?: number }) =>
                  dotProps.index === trend.length - 1 ? (
                    <circle
                      key="end-dot"
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={3.5}
                      fill={stroke}
                      stroke="var(--card)"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <g key={`empty-dot-${dotProps.index}`} />
                  )
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
  overlapNext = false,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  overlapNext?: boolean;
}) {
  return (
    <div
      className={cn(
        "-mx-4 mb-5 flex flex-wrap items-start justify-between gap-4 bg-primary px-4 pt-4 sm:-mx-6 sm:mb-6 sm:px-6 lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0",
        overlapNext ? "pb-20" : "pb-6",
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[28px] leading-9 font-bold tracking-tight text-primary-foreground sm:text-[32px] sm:leading-10 lg:text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 flex items-center gap-2 text-[15px] text-primary-foreground/80 lg:text-muted-foreground">
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
        "inline-flex h-11 items-center gap-2 rounded-full border border-primary-foreground/40 bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-card transition-colors hover:border-primary-foreground/60 hover:bg-primary/90 disabled:opacity-60",
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

const selectFieldClass =
  "h-11 w-full appearance-none rounded-full border border-border bg-card px-4 pr-10 text-[14px] text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15";

export function SelectField({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select {...props} className={cn(selectFieldClass, className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
