// Satış Sipariş Onaylama — satır ve sipariş hesapları (prototip: siparis-onaylama/useSiparis.ts).
// Sunucu onay anında aynı hesabı yeniden yapar; buradaki değerler ekran önizlemesidir.
import { parseDecimal } from "./money";

export interface ApprovalLineMath {
  quantity: number;
  unitPrice: number;
  listPrice: number;
  /** Kademeli yüzde iskontolar (İsk 1–4). */
  discounts: number[];
  vatRate: number;
}

const DISCOUNT_SLOTS = 4;

/** Π(1 − i/100) — kademeli iskonto çarpanı. */
export const discountFactor = (discounts: readonly number[]) =>
  discounts.reduce((acc, discount) => acc * (1 - clampDiscount(discount) / 100), 1);

/** Ham tutar: miktar × birim fiyat (iskonto ve KDV öncesi). */
export const lineRawTotal = (line: ApprovalLineMath) => line.quantity * line.unitPrice;
/** İskonto sonrası KDV hariç tutar. */
export const lineExVat = (line: ApprovalLineMath) => lineRawTotal(line) * discountFactor(line.discounts);
export const lineVat = (line: ApprovalLineMath) => lineExVat(line) * (line.vatRate / 100);
/** Satır toplamı, iskonto sonrası KDV DAHİL (money.ts lineNet KDV hariçtir — ad bu yüzden ayrı). */
export const lineTotalInclVat = (line: ApprovalLineMath) => lineExVat(line) * (1 + line.vatRate / 100);
/** Net birim fiyat (KDV dahil). */
export const lineNetUnit = (line: ApprovalLineMath) => (line.quantity ? lineTotalInclVat(line) / line.quantity : 0);
/** Toplam iskonto oranı (%). */
export const lineDiscountRate = (line: ApprovalLineMath) => (1 - discountFactor(line.discounts)) * 100;

/** İskonto girdisi: 0–100 arasına sıkıştırılır, boş / geçersiz değer 0 sayılır. */
export const clampDiscount = (raw: string | number | null | undefined) => {
  const value = parseDecimal(raw);
  return value === null ? 0 : Math.min(100, Math.max(0, value));
};

/** İskonto dizisini her zaman 4 elemana tamamlar. */
export const normalizeDiscounts = (discounts: readonly number[]) =>
  Array.from({ length: DISCOUNT_SLOTS }, (_, index) => clampDiscount(discounts[index] ?? 0));

export type NetUnitResult = { ok: true; discount: number } | { ok: false; message: string; ceiling: number };

/**
 * Net birim fiyat (KDV dahil) elle girilince gereken toplam iskonto. Sonuç İsk 1'e yazılır,
 * İsk 2–4 temizlenir. İskontosuz fiyatı aşan ya da geçersiz değer reddedilir.
 */
export const discountForNetUnit = (line: ApprovalLineMath, target: number): NetUnitResult => {
  const ceiling = line.unitPrice * (1 + line.vatRate / 100);
  if (!Number.isFinite(target) || target < 0) return { ok: false, message: "Geçerli bir net birim fiyat girin.", ceiling };
  if (target > ceiling + 0.005) return { ok: false, message: "Net birim fiyat iskontosuz fiyatı aşamaz.", ceiling };
  if (ceiling === 0) return { ok: true, discount: 0 };
  const rate = Math.min(100, Math.max(0, (1 - target / ceiling) * 100));
  return { ok: true, discount: Math.round(rate * 10_000) / 10_000 };
};

/** Birim değişince fiyatlar birim katsayısı oranında ölçeklenir. */
export const scalePricesForUnit = (
  prices: { unitPrice: number; listPrice: number },
  fromFactor: number,
  toFactor: number,
) => {
  const ratio = (toFactor || 1) / (fromFactor || 1);
  return { unitPrice: prices.unitPrice * ratio, listPrice: prices.listPrice * ratio };
};

export const sumBy = <T>(items: readonly T[], value: (item: T) => number) =>
  items.reduce((total, item) => total + value(item), 0);

export interface LimitState {
  /** Kullanım = risk + sipariş neti; limit yoksa null. */
  usagePercent: number | null;
  /** Kalan = limit − risk − net; limit yoksa null. */
  remaining: number | null;
  exceeded: boolean;
}

export const limitState = (creditLimit: number | null, creditRisk: number | null, orderNet: number): LimitState => {
  if (creditLimit === null || creditLimit <= 0) return { usagePercent: null, remaining: null, exceeded: false };
  const used = (creditRisk ?? 0) + orderNet;
  const remaining = creditLimit - used;
  return { usagePercent: (used / creditLimit) * 100, remaining, exceeded: remaining < 0 };
};

/** İki "YYYY-MM-DD" arasındaki gün farkı (a − b). */
export const dayDiff = (a: string, b: string) =>
  Math.round((new Date(a.slice(0, 10)).getTime() - new Date(b.slice(0, 10)).getTime()) / 86_400_000);
