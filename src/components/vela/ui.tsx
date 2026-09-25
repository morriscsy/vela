import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { categoryMeta, type CategoryId } from "@/lib/receipts/model";

export function Btn({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition-[filter,background-color,border-color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-cyan text-ink-deep hover:brightness-110",
        variant === "ghost" && "border border-line bg-ink/5 text-ink hover:border-accent/45 hover:bg-accent/10",
        variant === "quiet" && "border border-accent/35 bg-accent/12 text-accent-soft hover:bg-accent/20",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "h-11 w-full rounded-sm border border-line bg-bg px-3 text-sm text-ink outline-none placeholder:text-muted";

export function Chip({
  children,
  tone = "accent",
  className,
}: {
  children: ReactNode;
  tone?: "accent" | "cyan" | "green" | "amber" | "pink" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "accent" && "border-accent/35 bg-accent/12 text-accent-soft",
        tone === "cyan" && "border-cyan/35 bg-cyan/10 text-cyan-soft",
        tone === "green" && "border-green/35 bg-green/10 text-green-soft",
        tone === "amber" && "border-amber/35 bg-amber/10 text-amber-soft",
        tone === "pink" && "border-pink/35 bg-pink/10 text-pink",
        tone === "muted" && "border-line bg-ink/5 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

const CATEGORY_TONE: Record<CategoryId, "accent" | "cyan" | "green" | "amber" | "pink" | "muted"> = {
  dining: "pink",
  groceries: "green",
  transit: "cyan",
  travel: "accent",
  office: "amber",
  health: "green",
  shopping: "pink",
  utilities: "amber",
  entertainment: "accent",
  other: "muted",
};

export function CategoryChip({ id }: { id: CategoryId }) {
  return <Chip tone={CATEGORY_TONE[id]}>{categoryMeta(id).label}</Chip>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold tracking-[0.14em] text-cyan uppercase">{children}</p>;
}
