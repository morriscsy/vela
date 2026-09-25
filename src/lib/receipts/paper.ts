import { isoDaysAgo, lineSum, type Draft, type LineItem, type PaymentId } from "@/lib/receipts/model";

type PaintInput = {
  merchant: string;
  place: string;
  date: string;
  currency: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  payment: PaymentId;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paymentInk(payment: PaymentId) {
  if (payment === "card") return "VISA •••• 4242";
  if (payment === "octopus") return "OCTOPUS";
  if (payment === "fps") return "FPS";
  if (payment === "cash") return "CASH";
  return "PAID";
}

export function paintSlip(input: PaintInput): string {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#12182b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(480, 180, 20, 360, 420, 520);
  glow.addColorStop(0, "rgba(34,211,238,0.16)");
  glow.addColorStop(1, "rgba(7,10,18,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(360, 490);
  ctx.rotate(-0.035);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, -214, -360, 440, 760, 10);
  ctx.fill();
  ctx.fillStyle = "#f3eee4";
  roundRect(ctx, -200, -372, 400, 744, 8);
  ctx.fill();

  ctx.fillStyle = "#1c1915";
  ctx.textAlign = "center";
  ctx.font = "700 30px ui-monospace, monospace";
  ctx.fillText(input.merchant.toUpperCase().slice(0, 18), 0, -318);
  ctx.font = "16px ui-monospace, monospace";
  ctx.fillStyle = "#4a453c";
  if (input.place) ctx.fillText(input.place.slice(0, 36), 0, -288);
  ctx.fillText(input.date, 0, -262);
  ctx.strokeStyle = "#c8bfb0";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(-160, -240);
  ctx.lineTo(160, -240);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#1c1915";
  ctx.font = "16px ui-monospace, monospace";
  let y = -208;
  for (const item of input.lineItems.slice(0, 9)) {
    const label = item.qty > 1 ? `${item.name} x${item.qty}` : item.name;
    ctx.textAlign = "left";
    ctx.fillText(label.slice(0, 22), -160, y);
    ctx.textAlign = "right";
    ctx.fillText(item.amount.toFixed(2), 160, y);
    y += 28;
  }

  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(-160, y - 8);
  ctx.lineTo(160, y - 8);
  ctx.stroke();
  y += 22;
  const rows: [string, number][] = [
    ["Subtotal", input.subtotal],
    ["Tax", input.tax],
    ["Service", input.tip],
  ];
  ctx.font = "16px ui-monospace, monospace";
  ctx.fillStyle = "#3f3a33";
  for (const [label, amount] of rows) {
    if (!amount) continue;
    ctx.textAlign = "left";
    ctx.fillText(label, -160, y);
    ctx.textAlign = "right";
    ctx.fillText(amount.toFixed(2), 160, y);
    y += 26;
  }
  y += 8;
  ctx.fillStyle = "#1c1915";
  ctx.font = "700 20px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`TOTAL ${input.currency}`, -160, y);
  ctx.textAlign = "right";
  ctx.fillText(input.total.toFixed(2), 160, y);
  y += 40;
  ctx.font = "15px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#4a453c";
  ctx.fillText(paymentInk(input.payment), 0, y);
  ctx.fillText("Thank you", 0, y + 28);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.72);
}

export async function fileToJpeg(file: Blob): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Use a JPEG or PNG photo.");
  }
  try {
    let maxSide = 1280;
    let quality = 0.72;
    const render = () => {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not read that photo.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", quality);
    };
    let url = render();
    while (url.length > 700_000 && (quality > 0.42 || maxSide > 720)) {
      if (quality > 0.46) quality = Math.round((quality - 0.1) * 100) / 100;
      else maxSide = Math.round(maxSide * 0.8);
      url = render();
    }
    if (url.length > 1_400_000) throw new Error("That photo is still too large. Try a closer crop.");
    return url;
  } finally {
    bitmap.close();
  }
}

export function practiceDraft(): Draft {
  const lineItems: LineItem[] = [
    { name: "Flat white", qty: 1, amount: 42 },
    { name: "Egg tart", qty: 2, amount: 24 },
  ];
  const subtotal = lineSum(lineItems);
  const tip = 6.6;
  return {
    image: null,
    merchant: "Harbour & Rye",
    place: "12 Pottinger St, Central",
    date: isoDaysAgo(0),
    currency: "HKD",
    subtotal,
    tax: 0,
    tip,
    total: Math.round((subtotal + tip) * 100) / 100,
    category: "dining",
    payment: "card",
    drawer: "personal",
    notes: "",
    lineItems,
    confidence: 0.9,
    remember: true,
    origin: "scan",
  };
}

export function paintPractice(draft: Draft) {
  return paintSlip({
    merchant: draft.merchant,
    place: draft.place,
    date: draft.date,
    currency: draft.currency,
    lineItems: draft.lineItems,
    subtotal: draft.subtotal,
    tax: draft.tax,
    tip: draft.tip,
    total: draft.total,
    payment: draft.payment,
  });
}
