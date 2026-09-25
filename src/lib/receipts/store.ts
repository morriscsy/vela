import { create } from "zustand";
import { merchantKey, receiptFromDraft, type Draft, type DrawerId, type Receipt, type Rule, type SlipStatus } from "@/lib/receipts/model";
import { deleteReceipt, deleteSamples, loadDesk, putReceipt, putRule } from "@/lib/receipts/persist";

export type ViewId = "desk" | "library" | "scan" | "slip";
export type StatusFilter = "all" | "review" | "filed";

type DeskState = {
  ready: boolean;
  receipts: Receipt[];
  rules: Rule[];
  view: ViewId;
  activeId: string | null;
  query: string;
  drawerFilter: DrawerId | "all";
  statusFilter: StatusFilter;
  month: string;
  load: () => Promise<void>;
  setView: (view: ViewId) => void;
  openSlip: (id: string) => void;
  setQuery: (query: string) => void;
  setDrawerFilter: (drawer: DrawerId | "all") => void;
  setStatusFilter: (status: StatusFilter) => void;
  setMonth: (month: string) => void;
  openDrawer: (drawer: DrawerId) => void;
  save: (draft: Draft, status: SlipStatus, existingId?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearSamples: () => Promise<void>;
};

let loading: Promise<void> | null = null;

function claimTeamDinner(receipts: Receipt[]) {
  return receipts.map((receipt) => {
    if (receipt.id !== "sample-orchid" || receipt.origin !== "sample") return receipt;
    if (receipt.lineItems.some((item) => item.mine === false)) return receipt;
    return {
      ...receipt,
      notes: "Team dinner. Only the goose is yours.",
      lineItems: receipt.lineItems.map((item) => ({
        ...item,
        mine: /goose/i.test(item.name),
      })),
    };
  });
}

export const useDesk = create<DeskState>((set, get) => ({
  ready: false,
  receipts: [],
  rules: [],
  view: "desk",
  activeId: null,
  query: "",
  drawerFilter: "all",
  statusFilter: "all",
  month: "",
  load: () => {
    if (typeof indexedDB === "undefined") {
      set({ ready: true });
      return Promise.resolve();
    }
    if (!loading) {
      loading = (async () => {
        const loaded = await loadDesk();
        const receipts = claimTeamDinner(loaded.receipts);
        await Promise.all(
          receipts.filter((receipt, index) => receipt !== loaded.receipts[index]).map((receipt) => putReceipt(receipt)),
        );
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        set({ receipts, rules: loaded.rules, ready: true, month: get().month || month });
      })().finally(() => {
        loading = null;
      });
    }
    return loading;
  },
  setView: (view) => set({ view }),
  openSlip: (id) => set({ view: "slip", activeId: id }),
  setQuery: (query) => set({ query }),
  setDrawerFilter: (drawerFilter) => set({ drawerFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setMonth: (month) => set({ month }),
  openDrawer: (drawer) => set({ view: "library", drawerFilter: drawer, statusFilter: "all" }),
  save: async (draft, status, existingId) => {
    const id = existingId ?? crypto.randomUUID();
    const previous = get().receipts.find((r) => r.id === id);
    const receipt = receiptFromDraft(draft, status, id, previous);
    await putReceipt(receipt);
    let rules = get().rules;
    const key = merchantKey(draft.merchant);
    if (draft.remember && key) {
      const rule: Rule = {
        key,
        merchant: draft.merchant.trim(),
        category: draft.category,
        drawer: draft.drawer,
      };
      await putRule(rule);
      rules = [...rules.filter((item) => item.key !== key), rule];
    }
    set({
      receipts: [...get().receipts.filter((r) => r.id !== id), receipt],
      rules,
      view: "slip",
      activeId: id,
    });
  },
  remove: async (id) => {
    await deleteReceipt(id);
    set({
      receipts: get().receipts.filter((r) => r.id !== id),
      view: "library",
      activeId: null,
    });
  },
  clearSamples: async () => {
    const receipts = await deleteSamples();
    set({ receipts, view: "desk", activeId: null });
  },
}));
