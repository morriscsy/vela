import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { SlipForm } from "@/components/vela/slip-form";
import { Btn, Eyebrow } from "@/components/vela/ui";
import { applyMemory, blankDraft, findDuplicate, isoDaysAgo, lineSum, money, type Draft } from "@/lib/receipts/model";
import { fileToJpeg, paintPractice, practiceDraft } from "@/lib/receipts/paper";
import { readReceipt, type ExtractedSlip } from "@/lib/receipts/read";
import { useDesk } from "@/lib/receipts/store";

type Stage =
  | { kind: "idle" }
  | { kind: "camera" }
  | { kind: "reading"; image: string }
  | { kind: "review"; draft: Draft; note: string | null };

export function Scan() {
  const receipts = useDesk((s) => s.receipts);
  const rules = useDesk((s) => s.rules);
  const save = useDesk((s) => s.save);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (stage.kind !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setError("The camera preview didn't start."));
  }, [stage]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser has no camera. Upload a photo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setStage({ kind: "camera" });
    } catch {
      setError("Camera isn't available here. Upload a photo instead.");
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    stopCamera();
    if (!blob) return;
    await readImage(blob);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await readImage(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that photo.");
    }
  }

  async function readImage(file: Blob) {
    setBusy(true);
    try {
      const image = await fileToJpeg(file);
      setStage({ kind: "reading", image });
      const result = await readReceipt({ data: { image } });
      if (!result.ok) {
        setStage({ kind: "review", draft: { ...blankDraft(image, "scan"), confidence: 0 }, note: result.error });
        return;
      }
      const drafted = draftFromExtract(image, result.slip);
      const remembered = applyMemory(drafted, rules);
      setStage({ kind: "review", draft: remembered.draft, note: remembered.note });
    } catch (err) {
      setStage({ kind: "idle" });
      setError(err instanceof Error ? err.message : "Could not read that photo.");
    } finally {
      setBusy(false);
    }
  }

  async function readPractice() {
    setError(null);
    setBusy(true);
    const known = practiceDraft();
    const image = paintPractice(known);
    known.image = image;
    setStage({ kind: "reading", image });
    try {
      const result = await readReceipt({ data: { image } });
      if (!result.ok) {
        setStage({
          kind: "review",
          draft: known,
          note: "Reader unavailable, so this practice slip was filled in locally.",
        });
        return;
      }
      const drafted = draftFromExtract(image, result.slip);
      if (!drafted.merchant) drafted.merchant = known.merchant;
      if (!drafted.total) {
        drafted.total = known.total;
        drafted.subtotal = known.subtotal;
        drafted.tip = known.tip;
        drafted.lineItems = known.lineItems;
      }
      const remembered = applyMemory(drafted, rules);
      setStage({ kind: "review", draft: remembered.draft, note: remembered.note });
    } finally {
      setBusy(false);
    }
  }

  if (stage.kind === "reading") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <Eyebrow>Reading</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight">Pulling merchant, tax, and total</h1>
        <div className="scan-stage">
          <img src={stage.image} alt="Slip being read" className="max-h-[480px] w-full object-contain" />
          <span className="corner corner-tl" />
          <span className="corner corner-tr" />
          <span className="corner corner-bl" />
          <span className="corner corner-br" />
          <span className="scan-beam" />
        </div>
      </div>
    );
  }

  if (stage.kind === "camera") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Frame the slip</h1>
        <div className="scan-stage">
          <video ref={videoRef} playsInline muted className="max-h-[480px] w-full bg-bg object-contain" />
          <span className="corner corner-tl" />
          <span className="corner corner-tr" />
          <span className="corner corner-bl" />
          <span className="corner corner-br" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => void captureFrame()}>Capture</Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              stopCamera();
              setStage({ kind: "idle" });
            }}
          >
            Cancel
          </Btn>
        </div>
      </div>
    );
  }

  if (stage.kind === "review") {
    const duplicate = findDuplicate(receipts, stage.draft);
    return (
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div>
          <Eyebrow>Confirm</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Check the slip</h1>
          <p className="mt-2 text-sm text-muted">Nothing is filed until you say so. The photo stays in this browser.</p>
          {stage.draft.image ? (
            <img
              src={stage.draft.image}
              alt={stage.draft.merchant ? `Receipt from ${stage.draft.merchant}` : "Receipt photo"}
              className="mt-4 max-h-80 w-full rounded-xl border border-line object-contain"
            />
          ) : null}
        </div>
        <div className="rounded-xl border border-line bg-card p-4 md:p-5">
          <SlipForm
            draft={stage.draft}
            onChange={(draft) => setStage({ kind: "review", draft, note: stage.note })}
            duplicate={
              duplicate
                ? `${duplicate.merchant} on this date for ${money(duplicate.total, duplicate.currency)} is already filed.`
                : null
            }
            note={stage.note}
            submitLabel="File slip"
            onSubmit={() => void save(stage.draft, "filed")}
            onHold={() => void save(stage.draft, "review")}
            busy={busy}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <Eyebrow>Scan</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Point at a slip</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          The reader pulls the merchant, date, tax, service, and lines. You confirm the total, then it lands in a drawer.
          Photos are sent once to be read, then kept only in this browser.
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void onFile(event.dataTransfer.files?.[0]);
        }}
        className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-card px-6 py-10 text-center"
      >
        <ImagePlus className="size-6 text-cyan" />
        <span className="font-semibold">Drop a photo, or choose one</span>
        <span className="text-sm text-muted">JPEG or PNG. A full slip in frame reads best.</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/*"
        className="sr-only"
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error ? <p className="text-sm text-amber-soft">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => void startCamera()}>
          <Camera className="size-4" />
          Use camera
        </Btn>
        <Btn variant="ghost" onClick={() => void readPractice()} disabled={busy}>
          Read a practice slip
        </Btn>
        <Btn
          variant="quiet"
          onClick={() => setStage({ kind: "review", draft: blankDraft(null, "manual"), note: null })}
        >
          Enter by hand
        </Btn>
      </div>
    </div>
  );
}

function draftFromExtract(image: string, slip: ExtractedSlip): Draft {
  const subtotal = slip.subtotal ?? lineSum(slip.lineItems);
  const tax = slip.tax ?? 0;
  const tip = slip.tip ?? 0;
  const total = slip.total ?? Math.round((subtotal + tax + tip) * 100) / 100;
  return {
    image,
    merchant: slip.merchant,
    place: slip.place,
    date: slip.date ?? isoDaysAgo(0),
    currency: slip.currency,
    subtotal,
    tax,
    tip,
    total,
    category: slip.category,
    payment: slip.payment,
    drawer: slip.category === "travel" ? "trip" : "personal",
    notes: slip.notes,
    lineItems: slip.lineItems,
    confidence: slip.confidence,
    remember: true,
    origin: "scan",
  };
}
