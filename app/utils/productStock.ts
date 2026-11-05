import type { ErpProductDepotBalance } from "~/composables/useErpProducts";

// Stok listesi: net stok, depo özeti ve stok yaşı dilimi. B2B pages/products/index.vue
// (getNetStockQuantity, getStockPopoverRows, agingBucket) ile aynı kurallar.

export interface StockFigures {
  depotBalances?: ErpProductDepotBalance[] | null;
  stockQuantity?: number | null;
  incomingOrderQuantity?: number | null;
  customerOrderQuantity?: number | null;
}

/** Mevcut: depo dökümü varsa toplamı, yoksa stockQuantity. İkisi de yoksa null. */
export const onHandQuantity = (row: StockFigures): number | null => {
  if (row.depotBalances?.length) return row.depotBalances.reduce((sum, depot) => sum + depot.quantity, 0);
  return row.stockQuantity ?? null;
};

/** Stok = mevcut + tedarik siparişi − müşteri siparişi (rezerve). */
export const netStockQuantity = (row: StockFigures): number | null => {
  const onHand = onHandQuantity(row);
  if (onHand === null) return null;
  return onHand + (row.incomingOrderQuantity ?? 0) - (row.customerOrderQuantity ?? 0);
};

export const MAX_POPOVER_DEPOTS = 4;

/** Popover'da gösterilecek depolar: sıfır olmayanlar, mutlak miktara göre büyükten küçüğe. */
export const popoverDepots = (balances: readonly ErpProductDepotBalance[] | null | undefined) => {
  const nonZero = (balances ?? [])
    .filter((depot) => depot.quantity !== 0)
    .sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity));
  return {
    visible: nonZero.slice(0, MAX_POPOVER_DEPOTS),
    hiddenCount: Math.max(0, nonZero.length - MAX_POPOVER_DEPOTS),
  };
};

export interface StockAgeBand {
  key: string;
  label: string;
  /** Rozet sınıfları (zemin + metin + çerçeve). */
  className: string;
}

const AGE_BANDS: (StockAgeBand & { maxDays: number })[] = [
  { key: "0-30", label: "0-30 gün", maxDays: 30, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "31-60", label: "31-60 gün", maxDays: 60, className: "bg-lime-50 text-lime-700 border-lime-200" },
  { key: "61-90", label: "61-90 gün", maxDays: 90, className: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "91-180", label: "91-180 gün", maxDays: 180, className: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "180+", label: "180+ gün", maxDays: Number.POSITIVE_INFINITY, className: "bg-rose-50 text-rose-700 border-rose-200" },
];

export const stockAgeBand = (days: number | null | undefined): StockAgeBand | null => {
  if (days === null || days === undefined || Number.isNaN(days)) return null;
  const band = AGE_BANDS.find((candidate) => days <= candidate.maxDays)!;
  return { key: band.key, label: band.label, className: band.className };
};

/** "+40", "−20", "0" — popover satırları için işaretli miktar. */
export const signedQuantity = (value: number) => {
  const text = formatQuantityAbs(value);
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text}`;
  return text;
};

const quantityFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });
const formatQuantityAbs = (value: number) => quantityFormat.format(Math.abs(value));

/** Stok durumu tonu (B2B getStockIndicatorTone): min altı kritik, 2×min altı düşük. */
export type StockTone = "critical" | "low" | "ok";

export const stockTone = (net: number, minStock: number | null | undefined): StockTone => {
  const min = minStock ?? 0;
  if (!Number.isFinite(net)) return "critical";
  if (net < min || net < 0) return "critical";
  if (net < min * 2) return "low";
  return "ok";
};

/** Göstergedeki çubuğun doluluğu, 0–100: net ÷ max(2×min, net, 1). */
export const stockFillPercent = (net: number, minStock: number | null | undefined) => {
  if (!Number.isFinite(net)) return 0;
  const current = Math.max(net, 0);
  return Math.min(100, (current / Math.max((minStock ?? 0) * 2, current, 1)) * 100);
};
