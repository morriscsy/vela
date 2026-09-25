import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { SlipForm } from "@/components/vela/slip-form";
import { draftFromReceipt, findDuplicate, money, type Draft } from "@/lib/receipts/model";
import { useDesk } from "@/lib/receipts/store";

export function Slip() {
  const id = useDesk((s) => s.activeId);
  const receipts = useDesk((s) => s.receipts);
  const save = useDesk((s) => s.save);
  const remove = useDesk((s) => s.remove);
  const setView = useDesk((s) => s.setView);
  const slip = receipts.find((item) => item.id === id);
  const [draft, setDraft] = useState<Draft | null>(() => (slip ? draftFromReceipt(slip) : null));

  if (!slip || !draft) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">That slip is gone</h1>
        <button type="button" className="self-start text-sm font-semibold text-cyan" onClick={() => setView("library")}>
          Back to slips
        </button>
      </div>
    );
  }

  const duplicate = findDuplicate(receipts, draft, slip.id);
  const holding = slip.status === "review";

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => setView("library")} className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted hover:text-ink">
        <ChevronLeft className="size-4" />
        Slips
      </button>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{draft.merchant || slip.merchant}</h1>
          <p className="mt-1 text-sm text-muted">{draft.place || "No place noted"}</p>
          {draft.image ? (
            <img src={draft.image} alt={`Receipt from ${slip.merchant}`} className="mt-4 max-h-[480px] w-full rounded-xl border border-line object-contain" />
          ) : (
            <p className="mt-4 rounded-xl border border-line bg-card px-4 py-8 text-sm text-muted">Filed without a photo.</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-card p-4 md:p-5">
          <SlipForm
            draft={draft}
            onChange={setDraft}
            duplicate={
              duplicate
                ? `Another ${duplicate.merchant} slip on this date is ${money(duplicate.total, duplicate.currency)}.`
                : null
            }
            note={slip.origin === "sample" ? "This is a sample. Saving it makes it yours." : null}
            submitLabel={holding ? "File slip" : "Save changes"}
            onSubmit={() => void save(draft, holding ? "filed" : slip.status, slip.id)}
            onHold={() => void save(draft, "review", slip.id)}
            holdLabel={holding ? "Save, still needs a look" : "Mark needs a look"}
            onDelete={() => void remove(slip.id)}
          />
        </div>
      </div>
    </div>
  );
}
