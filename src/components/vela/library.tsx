import { Download, Search } from "lucide-react";
import { CategoryChip, controlClass } from "@/components/vela/ui";
import { Thumb, Amount } from "@/components/vela/desk";
import { byDateDesc, dateLabel, DRAWERS, drawerMeta, toCsv, type Receipt } from "@/lib/receipts/model";
import { useDesk, type StatusFilter } from "@/lib/receipts/store";

export function Library() {
  const receipts = useDesk((s) => s.receipts);
  const query = useDesk((s) => s.query);
  const drawerFilter = useDesk((s) => s.drawerFilter);
  const statusFilter = useDesk((s) => s.statusFilter);
  const setQuery = useDesk((s) => s.setQuery);
  const setDrawerFilter = useDesk((s) => s.setDrawerFilter);
  const setStatusFilter = useDesk((s) => s.setStatusFilter);
  const openSlip = useDesk((s) => s.openSlip);

  const filtered = receipts.filter((slip) => matches(slip, query, drawerFilter, statusFilter)).sort(byDateDesc);

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vela-slips.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Slips</h1>
          <p className="text-sm text-muted">{filtered.length} showing</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-line px-3 text-sm font-semibold text-ink hover:border-accent/45"
        >
          <Download className="size-4" />
          Export CSV
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          className={`${controlClass} pl-9`}
          placeholder="Search merchant, place, notes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search slips"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={drawerFilter === "all"} onClick={() => setDrawerFilter("all")}>
          All drawers
        </FilterChip>
        {DRAWERS.map((drawer) => (
          <FilterChip key={drawer.id} active={drawerFilter === drawer.id} onClick={() => setDrawerFilter(drawer.id)}>
            {drawer.label}
          </FilterChip>
        ))}
        {(["all", "review", "filed"] as StatusFilter[]).map((status) => (
          <FilterChip key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
            {status === "all" ? "Any status" : status === "review" ? "Needs a look" : "Filed"}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-line bg-card px-4 py-8 text-sm text-muted">No slips match that filter.</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line bg-card">
          {filtered.map((slip) => (
            <li key={slip.id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => openSlip(slip.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                <Thumb slip={slip} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{slip.merchant}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {dateLabel(slip.date)}
                    <CategoryChip id={slip.category} />
                    <span>{drawerMeta(slip.drawer).label}</span>
                    {slip.status === "review" ? <span className="text-amber-soft">Needs a look</span> : null}
                  </span>
                </span>
                <Amount slip={slip} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function matches(slip: Receipt, query: string, drawer: string, status: StatusFilter) {
  if (drawer !== "all" && slip.drawer !== drawer) return false;
  if (status !== "all" && slip.status !== status) return false;
  const hay = `${slip.merchant} ${slip.place} ${slip.notes} ${slip.lineItems.map((item) => item.name).join(" ")}`.toLowerCase();
  return hay.includes(query.trim().toLowerCase());
}

function FilterChip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-11 rounded-full border border-cyan/50 bg-cyan/15 px-3 text-xs font-semibold text-ink"
          : "h-11 rounded-full border border-line bg-ink/5 px-3 text-xs font-semibold text-muted"
      }
    >
      {children}
    </button>
  );
}
