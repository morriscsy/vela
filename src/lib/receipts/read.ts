import { createServerFn } from "@tanstack/react-start";
import {
  asCategory,
  asPayment,
  guessCategory,
  num,
  type CategoryId,
  type LineItem,
  type PaymentId,
} from "@/lib/receipts/model";

export type ExtractedSlip = {
  merchant: string;
  place: string;
  date: string | null;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number | null;
  payment: PaymentId;
  category: CategoryId;
  lineItems: LineItem[];
  confidence: number;
  notes: string;
};

export type ReadResult = { ok: true; slip: ExtractedSlip } | { ok: false; error: string };

const CURRENCY = ["HKD", "USD", "CNY", "MOP", "SGD", "EUR", "GBP", "JPY", "TWD", "AUD"];

export const readReceipt = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const image = input && typeof input === "object" && "image" in input ? (input as { image?: unknown }).image : "";
    if (typeof image !== "string" || !/^data:image\/(jpeg|jpg|png);base64,/.test(image)) {
      throw new Error("Use a JPEG or PNG photo.");
    }
    if (image.length > 1_500_000) throw new Error("That photo is too large to read.");
    return { image };
  })
  .handler(async ({ data }): Promise<ReadResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "The reader isn't available right now. Fill the fields yourself." };

    const prompt = `Extract one receipt, invoice, or bill from the image. Return only JSON with this shape:
{"merchant":string,"place":string,"date":"YYYY-MM-DD"|null,"currency":string,"subtotal":number|null,"tax":number|null,"tip":number|null,"total":number|null,"payment":"card"|"cash"|"octopus"|"fps"|"other"|null,"category":"dining"|"groceries"|"transit"|"travel"|"office"|"health"|"shopping"|"utilities"|"entertainment"|"other","lineItems":[{"name":string,"qty":number,"amount":number}],"confidence":number,"notes":string}
Rules: numbers not strings. Merchant is the store name, not the address. Place is a short address or branch. If Hong Kong and no currency is printed, use HKD. Service charge counts as tip. Do not invent line items. confidence is 0 to 1. notes is empty unless something is ambiguous.`;

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0,
          max_tokens: 900,
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: data.image, detail: "high" } },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `The reader couldn't finish (${res.status}). Fill the fields yourself.` };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const text = messageText(body.choices?.[0]?.message?.content);
      const slip = parseSlip(text);
      if (!slip) return { ok: false, error: "The reader returned something unreadable. Fill the fields yourself." };
      return { ok: true, slip };
    } catch {
      return { ok: false, error: "The reader didn't respond. Fill the fields yourself." };
    }
  });

function messageText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("\n");
  }
  return "";
}

function parseSlip(text: string): ExtractedSlip | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const merchant = typeof row.merchant === "string" ? row.merchant.trim().slice(0, 80) : "";
  const place = typeof row.place === "string" ? row.place.trim().slice(0, 80) : "";
  const date = typeof row.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : null;
  const currencyRaw = typeof row.currency === "string" ? row.currency.toUpperCase() : "HKD";
  const currency = CURRENCY.includes(currencyRaw) ? currencyRaw : "HKD";
  const lineItems = Array.isArray(row.lineItems)
    ? row.lineItems.slice(0, 20).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const line = item as Record<string, unknown>;
        const name = typeof line.name === "string" ? line.name.trim().slice(0, 80) : "";
        const amount = num(line.amount);
        if (!name || amount === null) return [];
        const qty = num(line.qty);
        return [{ name, qty: qty && qty > 0 ? qty : 1, amount }];
      })
    : [];
  const confidenceRaw = num(row.confidence);
  const confidence = confidenceRaw === null ? 0.5 : Math.min(1, Math.max(0, confidenceRaw));
  const category = asCategory(row.category);
  return {
    merchant,
    place,
    date,
    currency,
    subtotal: num(row.subtotal),
    tax: num(row.tax),
    tip: num(row.tip),
    total: num(row.total),
    payment: asPayment(row.payment),
    category: category === "other" ? guessCategory(merchant) : category,
    lineItems,
    confidence,
    notes: typeof row.notes === "string" ? row.notes.trim().slice(0, 180) : "",
  };
}
