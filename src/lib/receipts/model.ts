export const CATEGORIES = [
  { id: "dining", label: "Dining", swatch: "var(--color-pink)" },
  { id: "groceries", label: "Groceries", swatch: "var(--color-green)" },
  { id: "transit", label: "Transit", swatch: "var(--color-cyan)" },
  { id: "travel", label: "Travel", swatch: "var(--color-accent-soft)" },
  { id: "office", label: "Office", swatch: "var(--color-amber)" },
  { id: "health", label: "Health", swatch: "var(--color-green-soft)" },
  { id: "shopping", label: "Shopping", swatch: "var(--color-pink)" },
  { id: "utilities", label: "Utilities", swatch: "var(--color-amber-soft)" },
  { id: "entertainment", label: "Entertainment", swatch: "var(--color-accent)" },
  { id: "other", label: "Other", swatch: "var(--color-muted)" },
] as const;

export const DRAWERS = [
  { id: "personal", label: "Personal" },
  { id: "work", label: "Work" },
  { id: "tax", label: "Tax packet" },
  { id: "trip", label: "Trip" },
] as const;

export const PAYMENTS = [
  { id: "card", label: "Card" },
  { id: "cash", label: "Cash" },
  { id: "octopus", label: "Octopus" },
  { id: "fps", label: "FPS" },
  { id: "other", label: "Other" },
] as const;

export const CURRENCIES = ["HKD", "USD", "CNY", "MOP", "SGD", "EUR", "GBP", "JPY", "TWD", "AUD"] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type DrawerId = (typeof DRAWERS)[number]["id"];
export type PaymentId = (typeof PAYMENTS)[number]["id"];
export type SlipStatus = "review" | "filed";
export type Origin = "sample" | "scan" | "manual";

export type LineItem = { name: string; qty: number; amount: number; mine?: boolean };

export type Receipt = {
  id: string;
  image: string | null;
  merchant: string;
  place: string;
  date: string;
  currency: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  category: CategoryId;
  payment: PaymentId;
  drawer: DrawerId;
  notes: string;
  lineItems: LineItem[];
  status: SlipStatus;
  confidence: number;
  origin: Origin;
  createdAt: number;
};

export type Rule = {
  key: string;
  merchant: string;
  category: CategoryId;
  drawer: DrawerId;
};

export type Draft = {
  image: string | null;
  merchant: string;
  place: string;
  date: string;
  currency: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  category: CategoryId;
  payment: PaymentId;
  drawer: DrawerId;
  notes: string;
  lineItems: LineItem[];
  confidence: number;
  remember: boolean;
  origin: Origin;
};

const TO_HKD: Record<string, number> = {
  HKD: 1,
  USD: 7.8,
  CNY: 1.09,
  MOP: 0.97,
  SGD: 5.85,
  EUR: 8.6,
  GBP: 9.9,
  JPY: 0.052,
  TWD: 0.24,
  AUD: 5.1,
};

const KEYWORDS: [RegExp, CategoryId][] = [
  [/cafe|coffee|bakery|restaurant|noodle|kitchen|eatery|bar\b|dim sum|goose|orchid|cheong|pizza|tea house/, "dining"],
  [/mart|market|wellcome|grocery|supermarket|park.?n|seven/, "groceries"],
  [/taxi|uber|mtr|bus|ferry|transit|airport express|octopus ride/, "transit"],
  [/hotel|airway|airline|hostel|harbour grand|flight/, "travel"],
  [/clinic|pharm|mannings|watson|dental|hospital/, "health"],
  [/clp|power|electric|water|gas|utility|telecom|hkt/, "utilities"],
  [/stationery|paper|ink &|office/, "office"],
  [/cinema|netflix|concert|ticket|game/, "entertainment"],
  [/fortress|apple|uniqlo|store|shop|earbuds/, "shopping"],
];

export function merchantKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();
}

export function guessCategory(name: string): CategoryId {
  const hay = name.toLowerCase();
  for (const [re, id] of KEYWORDS) {
    if (re.test(hay)) return id;
  }
  return "other";
}

export function toHkd(amount: number, currency: string) {
  const rate = TO_HKD[currency] ?? 1;
  return amount * rate;
}

export function money(amount: number, currency = "HKD") {
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-HK", {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(ym: string, length: "long" | "short" = "long") {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleString("en-HK", { month: length, year: "numeric" });
}

export function dateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleString("en-HK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isoDaysAgo(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function categoryMeta(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function drawerMeta(id: DrawerId) {
  return DRAWERS.find((d) => d.id === id) ?? DRAWERS[0];
}

export function paymentMeta(id: PaymentId) {
  return PAYMENTS.find((p) => p.id === id) ?? PAYMENTS[0];
}

export function asCategory(value: unknown): CategoryId {
  const id = typeof value === "string" ? value : "";
  return CATEGORIES.some((c) => c.id === id) ? (id as CategoryId) : "other";
}

export function asPayment(value: unknown): PaymentId {
  const id = typeof value === "string" ? value.toLowerCase() : "";
  if (id.includes("octopus")) return "octopus";
  if (id.includes("fps") || id.includes("payme") || id.includes("alipay") || id.includes("wechat")) return "fps";
  if (id.includes("cash")) return "cash";
  if (id.includes("card") || id.includes("visa") || id.includes("master") || id.includes("amex")) return "card";
  return PAYMENTS.some((p) => p.id === id) ? (id as PaymentId) : "card";
}

export function asDrawer(value: unknown): DrawerId {
  const id = typeof value === "string" ? value : "";
  return DRAWERS.some((d) => d.id === id) ? (id as DrawerId) : "personal";
}

export function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100) / 100;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/,/g, ""));
    if (Number.isFinite(n)) return Math.round(n * 100) / 100;
  }
  return null;
}

export function blankDraft(image: string | null, origin: Origin): Draft {
  return {
    image,
    merchant: "",
    place: "",
    date: isoDaysAgo(0),
    currency: "HKD",
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0,
    category: "other",
    payment: "card",
    drawer: "personal",
    notes: "",
    lineItems: [],
    confidence: 0,
    remember: true,
    origin,
  };
}

export function lineSum(items: LineItem[]) {
  return Math.round(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * 100) / 100;
}

export function itemIsMine(item: LineItem) {
  return item.mine !== false;
}

type Bill = { lineItems: LineItem[]; subtotal: number; tax: number; tip: number; total: number };

/** Full bill stays on the slip. Budget figures use only lines marked mine, with tax and service in the same proportion. */
export function yourShare(bill: Bill) {
  const items = bill.lineItems;
  const billTotal = Number(bill.total) || 0;
  if (items.length === 0 || items.every(itemIsMine)) {
    return { yours: billTotal, bill: billTotal, split: false };
  }
  const base = lineSum(items) || Number(bill.subtotal) || billTotal;
  const mine = lineSum(items.filter(itemIsMine));
  const ratio = base > 0 ? mine / base : 0;
  const extras = (Number(bill.tax) || 0) + (Number(bill.tip) || 0);
  return {
    yours: Math.round((mine + extras * ratio) * 100) / 100,
    bill: billTotal,
    split: true,
  };
}

export function yourExtras(bill: Bill) {
  const extras = (Number(bill.tax) || 0) + (Number(bill.tip) || 0);
  if (!yourShare(bill).split) return Math.round(extras * 100) / 100;
  const base = lineSum(bill.lineItems) || Number(bill.subtotal) || Number(bill.total) || 0;
  const mine = lineSum(bill.lineItems.filter(itemIsMine));
  const ratio = base > 0 ? mine / base : 0;
  return Math.round(extras * ratio * 100) / 100;
}

export function inMonth(receipts: Receipt[], ym: string) {
  return receipts.filter((r) => r.date.slice(0, 7) === ym);
}

export function monthSpend(receipts: Receipt[], ym: string) {
  return inMonth(receipts, ym).reduce((sum, r) => sum + toHkd(yourShare(r).yours, r.currency), 0);
}

export function findDuplicate(receipts: Receipt[], draft: Draft, exceptId?: string) {
  const key = merchantKey(draft.merchant);
  if (!key || !draft.total) return null;
  return (
    receipts.find(
      (r) =>
        r.id !== exceptId &&
        merchantKey(r.merchant) === key &&
        r.date === draft.date &&
        Math.abs(r.total - draft.total) < 0.02 &&
        r.currency === draft.currency,
    ) ?? null
  );
}

export function applyMemory(draft: Draft, rules: Rule[]) {
  const rule = rules.find((r) => r.key && r.key === merchantKey(draft.merchant));
  if (!rule) return { draft, note: null as string | null };
  return {
    draft: { ...draft, category: rule.category, drawer: rule.drawer },
    note: `Using your memory for ${rule.merchant}.`,
  };
}

export function draftFromReceipt(r: Receipt): Draft {
  return {
    image: r.image,
    merchant: r.merchant,
    place: r.place,
    date: r.date,
    currency: r.currency,
    subtotal: r.subtotal,
    tax: r.tax,
    tip: r.tip,
    total: r.total,
    category: r.category,
    payment: r.payment,
    drawer: r.drawer,
    notes: r.notes,
    lineItems: r.lineItems.map((item) => ({ ...item })),
    confidence: r.confidence,
    remember: true,
    origin: r.origin,
  };
}

export function receiptFromDraft(draft: Draft, status: SlipStatus, id: string, previous?: Receipt): Receipt {
  const items = draft.lineItems
    .filter((item) => item.name.trim() || item.amount)
    .map((item) => ({
      name: item.name.trim() || "Item",
      qty: Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1,
      amount: Number(item.amount) || 0,
      mine: item.mine !== false,
    }));
  return {
    id,
    image: draft.image,
    merchant: draft.merchant.trim(),
    place: draft.place.trim(),
    date: draft.date || isoDaysAgo(0),
    currency: draft.currency || "HKD",
    subtotal: Number(draft.subtotal) || 0,
    tax: Number(draft.tax) || 0,
    tip: Number(draft.tip) || 0,
    total: Number(draft.total) || 0,
    category: draft.category,
    payment: draft.payment,
    drawer: draft.drawer,
    notes: draft.notes.trim(),
    lineItems: items,
    status,
    confidence: draft.confidence,
    origin: previous?.origin === "sample" ? "manual" : (previous?.origin ?? draft.origin),
    createdAt: previous?.createdAt ?? Date.now(),
  };
}

export function byDateDesc(a: Receipt, b: Receipt) {
  return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
}

export function toCsv(receipts: Receipt[]) {
  const header = [
    "date",
    "merchant",
    "place",
    "category",
    "drawer",
    "currency",
    "subtotal",
    "tax",
    "service_or_tip",
    "total",
    "yours",
    "total_hkd",
    "yours_hkd",
    "payment",
    "status",
    "notes",
  ];
  const lines = receipts.slice().sort(byDateDesc).map((r) =>
    [
      r.date,
      r.merchant,
      r.place,
      categoryMeta(r.category).label,
      drawerMeta(r.drawer).label,
      r.currency,
      r.subtotal.toFixed(2),
      r.tax.toFixed(2),
      r.tip.toFixed(2),
      r.total.toFixed(2),
      yourShare(r).yours.toFixed(2),
      toHkd(r.total, r.currency).toFixed(2),
      toHkd(yourShare(r).yours, r.currency).toFixed(2),
      paymentMeta(r.payment).label,
      r.status,
      r.notes,
    ]
      .map(csvCell)
      .join(","),
  );
  return `\uFEFF${header.join(",")}\n${lines.join("\n")}\n`;
}

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
