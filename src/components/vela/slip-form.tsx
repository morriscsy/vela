import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Btn, controlClass, Field } from "@/components/vela/ui";
import {
  CATEGORIES,
  CURRENCIES,
  DRAWERS,
  guessCategory,
  itemIsMine,
  lineSum,
  money,
  PAYMENTS,
  yourShare,
  type Draft,
} from "@/lib/receipts/model";

export function SlipForm({
  draft,
  onChange,
  duplicate,
  note,
  submitLabel,
  holdLabel,
  onSubmit,
  onHold,
  onDelete,
  busy,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  duplicate: string | null;
  note: string | null;
  submitLabel: string;
  holdLabel?: string;
  onSubmit: () => void;
  onHold?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const [catTouched, setCatTouched] = useState(draft.category !== "other");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const summed = lineSum(draft.lineItems);
  const share = yourShare(draft);
  const canSave = draft.merchant.trim().length > 0 && Number(draft.total) > 0;

  function patch(partial: Partial<Draft>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSubmit();
      }}
    >
      {note ? <p className="rounded-md border border-line bg-card px-3 py-2 text-sm text-muted">{note}</p> : null}
      {duplicate ? (
        <p className="rounded-md border border-amber/35 bg-amber/10 px-3 py-2 text-sm text-amber-soft">{duplicate}</p>
      ) : null}
      {draft.confidence > 0 ? (
        <p className="text-xs font-semibold tracking-wide text-muted">
          Reader confidence {Math.round(draft.confidence * 100)}%
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Merchant">
          <input
            className={controlClass}
            value={draft.merchant}
            required
            onChange={(event) => {
              const merchant = event.target.value;
              patch({
                merchant,
                category: catTouched ? draft.category : guessCategory(merchant),
              });
            }}
          />
        </Field>
        <Field label="Place">
          <input className={controlClass} value={draft.place} onChange={(event) => patch({ place: event.target.value })} />
        </Field>
        <Field label="Date">
          <input className={controlClass} type="date" value={draft.date} onChange={(event) => patch({ date: event.target.value })} />
        </Field>
        <Field label="Currency">
          <select className={controlClass} value={draft.currency} onChange={(event) => patch({ currency: event.target.value })}>
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            className={controlClass}
            value={draft.category}
            onChange={(event) => {
              setCatTouched(true);
              patch({ category: event.target.value as Draft["category"] });
            }}
          >
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Drawer">
          <select className={controlClass} value={draft.drawer} onChange={(event) => patch({ drawer: event.target.value as Draft["drawer"] })}>
            {DRAWERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment">
          <select className={controlClass} value={draft.payment} onChange={(event) => patch({ payment: event.target.value as Draft["payment"] })}>
            {PAYMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subtotal">
          <input className={controlClass} inputMode="decimal" value={String(draft.subtotal)} onChange={(event) => patch({ subtotal: Number(event.target.value) || 0 })} />
        </Field>
        <Field label="Tax">
          <input className={controlClass} inputMode="decimal" value={String(draft.tax)} onChange={(event) => patch({ tax: Number(event.target.value) || 0 })} />
        </Field>
        <Field label="Service / tip">
          <input className={controlClass} inputMode="decimal" value={String(draft.tip)} onChange={(event) => patch({ tip: Number(event.target.value) || 0 })} />
        </Field>
        <Field label="Total">
          <input className={controlClass} inputMode="decimal" value={String(draft.total)} onChange={(event) => patch({ total: Number(event.target.value) || 0 })} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {draft.lineItems.length > 0 && Math.abs(summed - Number(draft.subtotal)) > 0.05
            ? `Lines add to ${money(summed, draft.currency)}, not the subtotal.`
            : "Lines are optional. The total is what gets filed."}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-cyan"
          onClick={() =>
            patch({
              total: Math.round((Number(draft.subtotal) + Number(draft.tax) + Number(draft.tip)) * 100) / 100,
            })
          }
        >
          Total from parts
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm font-semibold">Lines</p>
          <p className="text-xs text-muted">Leave a colleague’s dish off. The bill stays. Your budget uses the rest.</p>
        </div>
        {share.split ? (
          <p className="rounded-md border border-cyan/35 bg-cyan/10 px-3 py-2 text-sm text-ink">
            Your budget counts {money(share.yours, draft.currency)} of the {money(share.bill, draft.currency)} bill. Tax and service follow your lines.
          </p>
        ) : null}
        {draft.lineItems.map((item, index) => {
          const mine = itemIsMine(item);
          return (
            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_4.5rem_6.5rem_2.75rem]">
              <button
                type="button"
                aria-pressed={mine}
                aria-label={mine ? "This line is yours" : "This line is not yours"}
                className={
                  mine
                    ? "h-11 rounded-sm border border-cyan/50 bg-cyan/15 px-3 text-xs font-semibold text-ink"
                    : "h-11 rounded-sm border border-line px-3 text-xs font-semibold text-muted line-through"
                }
                onClick={() => {
                  const lineItems = draft.lineItems.slice();
                  lineItems[index] = { ...item, mine: !mine };
                  patch({ lineItems });
                }}
              >
                {mine ? "Mine" : "Not mine"}
              </button>
              <input
                aria-label="Line name"
                className={controlClass}
                value={item.name}
                onChange={(event) => {
                  const lineItems = draft.lineItems.slice();
                  lineItems[index] = { ...item, name: event.target.value };
                  patch({ lineItems });
                }}
              />
              <input
                aria-label="Quantity"
                className={controlClass}
                inputMode="decimal"
                value={String(item.qty)}
                onChange={(event) => {
                  const lineItems = draft.lineItems.slice();
                  lineItems[index] = { ...item, qty: Number(event.target.value) || 0 };
                  patch({ lineItems });
                }}
              />
              <input
                aria-label="Amount"
                className={controlClass}
                inputMode="decimal"
                value={String(item.amount)}
                onChange={(event) => {
                  const lineItems = draft.lineItems.slice();
                  lineItems[index] = { ...item, amount: Number(event.target.value) || 0 };
                  patch({ lineItems });
                }}
              />
              <button
                type="button"
                aria-label="Remove line"
                className="grid h-11 place-items-center rounded-sm border border-line text-muted hover:text-ink"
                onClick={() => patch({ lineItems: draft.lineItems.filter((_, i) => i !== index) })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="self-start text-sm font-semibold text-cyan"
          onClick={() => patch({ lineItems: [...draft.lineItems, { name: "", qty: 1, amount: 0, mine: true }] })}
        >
          Add a line
        </button>
      </div>

      <Field label="Notes">
        <textarea
          className="min-h-20 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink outline-none"
          value={draft.notes}
          onChange={(event) => patch({ notes: event.target.value })}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="size-4 accent-cyan"
          checked={draft.remember}
          onChange={(event) => patch({ remember: event.target.checked })}
        />
        Remember this merchant's category and drawer
      </label>

      <div className="flex flex-wrap gap-2">
        <Btn type="submit" disabled={!canSave || busy}>
          {submitLabel}
        </Btn>
        {onHold ? (
          <Btn variant="ghost" disabled={!canSave || busy} onClick={onHold}>
            {holdLabel ?? "Hold for review"}
          </Btn>
        ) : null}
        {onDelete ? (
          confirmDelete ? (
            <>
              <Btn variant="quiet" onClick={onDelete}>
                Delete slip
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep
              </Btn>
            </>
          ) : (
            <Btn variant="ghost" onClick={() => setConfirmDelete(true)}>
              Delete
            </Btn>
          )
        ) : null}
      </div>
    </form>
  );
}
