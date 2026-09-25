import { useEffect } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard, Library, ScanLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { Desk } from "@/components/vela/desk";
import { Library as SlipLibrary } from "@/components/vela/library";
import { Scan } from "@/components/vela/scan";
import { Slip } from "@/components/vela/slip";
import { Btn } from "@/components/vela/ui";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/receipts/model";
import { useDesk, type ViewId } from "@/lib/receipts/store";

const NAV: { id: ViewId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "desk", label: "Desk", icon: LayoutDashboard },
  { id: "library", label: "Slips", icon: Library },
  { id: "scan", label: "Scan", icon: ScanLine },
];

export function VelaApp() {
  const ready = useDesk((s) => s.ready);
  const view = useDesk((s) => s.view);
  const month = useDesk((s) => s.month);
  const load = useDesk((s) => s.load);
  const setView = useDesk((s) => s.setView);
  const setMonth = useDesk((s) => s.setMonth);
  const reviewCount = useDesk((s) => s.receipts.filter((r) => r.status === "review").length);
  const activeId = useDesk((s) => s.activeId);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, activeId]);

  const now = currentMonth();
  const atPresent = month >= now;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <button type="button" onClick={() => setView("desk")} className="flex items-center gap-2">
            <span className="brand-dot" aria-hidden="true" />
            <span className="text-lg font-extrabold tracking-tight">Vela</span>
          </button>
          <span className="hidden text-sm text-muted sm:inline">Receipt desk</span>
          <nav className="hidden items-center gap-1 rounded-full border border-line bg-ink/5 p-1 md:flex" aria-label="Sections">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => setView(item.id)}
                className={cn(
                  "h-9 rounded-full px-3 text-sm font-semibold",
                  view === item.id ? "bg-cyan/20 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {item.label}
                {item.id === "library" && reviewCount > 0 ? <span className="ml-1 text-cyan">{reviewCount}</span> : null}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {ready && month ? (
              <div className="flex items-center rounded-full border border-line">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="grid size-11 place-items-center text-muted hover:text-ink"
                  onClick={() => setMonth(shiftMonth(month, -1))}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-16 text-center text-sm font-semibold tabular-nums sm:hidden">{monthLabel(month, "short")}</span>
                <span className="hidden min-w-32 text-center text-sm font-semibold sm:inline">{monthLabel(month, "long")}</span>
                <button
                  type="button"
                  aria-label="Next month"
                  disabled={atPresent}
                  className="grid size-11 place-items-center text-muted hover:text-ink disabled:opacity-40"
                  onClick={() => setMonth(shiftMonth(month, 1))}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : null}
            <Btn className="hidden md:inline-flex" onClick={() => setView("scan")}>
              Scan a slip
            </Btn>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 md:px-6 md:pb-16">
        {view === "desk" ? (
          <Desk />
        ) : view === "library" ? (
          <SlipLibrary />
        ) : view === "scan" ? (
          <Scan />
        ) : (
          <Slip key={activeId ?? "slip"} />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Sections"
      >
        <div className="grid grid-cols-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon className={cn("size-5", item.id === "scan" && !active && "text-cyan")} />
                {item.label}
                {item.id === "library" && reviewCount > 0 ? <span className="sr-only">{reviewCount} need a look</span> : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
