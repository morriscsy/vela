import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CategoryChip, Eyebrow } from "@/components/vela/ui";
import {
  byDateDesc,
  categoryMeta,
  dateLabel,
  drawerMeta,
  DRAWERS,
  inMonth,
  money,
  monthLabel,
  monthSpend,
  shiftMonth,
  toHkd,
  yourExtras,
  yourShare,
  type Receipt,
} from "@/lib/receipts/model";
import { useDesk } from "@/lib/receipts/store";

export function Desk() {
  const receipts = useDesk((s) => s.receipts);
  const rules = useDesk((s) => s.rules);
  const month = useDesk((s) => s.month);
  const openSlip = useDesk((s) => s.openSlip);
  const openDrawer = useDesk((s) => s.openDrawer);
  const setView = useDesk((s) => s.setView);
  const setStatusFilter = useDesk((s) => s.setStatusFilter);
  const setDrawerFilter = useDesk((s) => s.setDrawerFilter);
  const clearSamples = useDesk((s) => s.clearSamples);
  const hasSamples = receipts.some((r) => r.origin === "sample");

  const current = inMonth(receipts, month);
  const spend = monthSpend(receipts, month);
  const previous = monthSpend(receipts, shiftMonth(month, -1));
  const delta = spend - previous;
  const tax = current.reduce((sum, r) => sum + toHkd(yourExtras(r), r.currency), 0);
  const review = receipts.filter((r) => r.status === "review").sort(byDateDesc);
  const latest = current.slice().sort(byDateDesc).slice(0, 4);
  const shared = current.filter((r) => yourShare(r).split).length;
  const mixed = current.some((r) => r.currency !== "HKD");

  const bars = categoryMetaList(current);

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-hero grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr] md:p-6">
        <div className="relative z-10 flex flex-col gap-3">
          <Eyebrow>This month</Eyebrow>
          <h1 className="text-4xl font-semibold tracking-tight text-ink tabular-nums">{money(spend)}</h1>
          <p className="text-sm text-muted">
            {current.length === 1 ? "1 slip" : `${current.length} slips`}
            {tax > 0 ? ` · tax & service ${money(tax)}` : ""}
            {review.length === 1 ? " · 1 needs a look" : review.length ? ` · ${review.length} need a look` : ""}
          </p>
          <p className="flex items-center gap-1 text-sm text-ink">
            {delta >= 0 ? <ArrowUpRight className="size-4 text-cyan" /> : <ArrowDownRight className="size-4 text-green" />}
            <span className="tabular-nums">
              {money(Math.abs(delta))} {delta >= 0 ? "more" : "less"} than {monthLabel(shiftMonth(month, -1), "long")}
            </span>
          </p>
          {mixed ? <p className="text-xs text-muted">Other currencies are shown in HKD at desk rates.</p> : null}
          {shared ? (
            <p className="text-xs text-muted">
              {shared === 1 ? "1 shared slip counts only your lines." : `${shared} shared slips count only your lines.`}
            </p>
          ) : null}
        </div>
        <div className="relative z-10 h-56 min-w-0">
          {bars.length === 0 ? (
            <p className="text-sm text-muted">No slips in {monthLabel(month, "long")} yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={88}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={10} isAnimationActive={false}>
                  {bars.map((bar) => (
                    <Cell key={bar.label} fill={bar.swatch} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Drawers</h2>
          <p className="text-sm text-muted">Where a slip lives after you file it</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {DRAWERS.map((drawer) => {
            const slips = receipts.filter((r) => r.drawer === drawer.id);
            const total = slips.reduce((sum, r) => sum + toHkd(yourShare(r).yours, r.currency), 0);
            return (
              <button
                key={drawer.id}
                type="button"
                onClick={() => openDrawer(drawer.id)}
                className="rounded-xl border border-line bg-card p-4 text-left transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-accent/45"
              >
                <p className="text-xs font-bold tracking-[0.12em] text-cyan uppercase">{drawer.label}</p>
                <p className="mt-3 font-mono text-lg text-ink tabular-nums">{money(total)}</p>
                <p className="text-xs text-muted">{slips.length === 1 ? "1 slip" : `${slips.length} slips`}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Needs a look</h2>
            {review.length > 0 ? (
              <button
                type="button"
                className="text-sm font-semibold text-cyan"
                onClick={() => {
                  setDrawerFilter("all");
                  setStatusFilter("review");
                  setView("library");
                }}
              >
                See all
              </button>
            ) : null}
          </div>
          {review.length === 0 ? (
            <p className="text-sm text-muted">Nothing waiting. New scans with a faint total land here.</p>
          ) : (
            <ul className="flex flex-col">
              {review.slice(0, 4).map((slip) => (
                <SlipRow key={slip.id} slip={slip} onOpen={() => openSlip(slip.id)} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Latest in {monthLabel(month, "long")}</h2>
          {latest.length === 0 ? (
            <p className="text-sm text-muted">Scan a slip and it will show up here.</p>
          ) : (
            <ul className="flex flex-col">
              {latest.map((slip) => (
                <SlipRow key={slip.id} slip={slip} onOpen={() => openSlip(slip.id)} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {rules.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Merchant memory</h2>
          <div className="flex flex-wrap gap-2">
            {rules.map((rule) => (
              <span key={rule.key} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-muted">
                <span className="font-semibold text-ink">{rule.merchant}</span>
                {" · "}
                {categoryMeta(rule.category).label}
                {" · "}
                {drawerMeta(rule.drawer).label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {hasSamples ? (
        <button type="button" className="self-start text-sm text-muted underline-offset-2 hover:text-ink hover:underline" onClick={() => void clearSamples()}>
          Remove sample slips
        </button>
      ) : null}
    </div>
  );
}

function categoryMetaList(receipts: Receipt[]) {
  const totals = new Map<string, number>();
  for (const slip of receipts) {
    totals.set(slip.category, (totals.get(slip.category) ?? 0) + toHkd(yourShare(slip).yours, slip.currency));
  }
  return [...totals.entries()]
    .map(([id, value]) => {
      const meta = categoryMeta(id as Receipt["category"]);
      return { label: meta.label, value: Math.round(value), swatch: meta.swatch };
    })
    .sort((a, b) => b.value - a.value);
}

function SlipRow({ slip, onOpen }: { slip: Receipt; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 border-t border-line py-3 text-left first:border-t-0">
        <Thumb slip={slip} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{slip.merchant}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {dateLabel(slip.date)}
            <CategoryChip id={slip.category} />
          </span>
        </span>
        <Amount slip={slip} />
      </button>
    </li>
  );
}

export function Amount({ slip }: { slip: Receipt }) {
  const share = yourShare(slip);
  if (!share.split) {
    return <span className="font-mono text-sm whitespace-nowrap tabular-nums">{money(slip.total, slip.currency)}</span>;
  }
  return (
    <span className="text-right">
      <span className="block font-mono text-sm whitespace-nowrap tabular-nums">{money(share.yours, slip.currency)}</span>
      <span className="block text-xs whitespace-nowrap text-muted">of {money(share.bill, slip.currency)}</span>
    </span>
  );
}

export function Thumb({ slip }: { slip: Receipt }) {
  if (slip.image) {
    return <img src={slip.image} alt="" className="h-14 w-11 rounded-sm border border-line object-cover" />;
  }
  return (
    <span className="grid h-14 w-11 place-items-center rounded-sm border border-line bg-bg text-xs font-bold text-cyan">
      {slip.merchant.slice(0, 1)}
    </span>
  );
}
