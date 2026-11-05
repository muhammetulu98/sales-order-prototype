// Kademeli alış iskontosu — backend'deki App/Features/Stocks/PurchaseConditionDiscounts.cs ile
// birebir aynı hesap. Her kademe bir önceki kademe düşüldükten sonra kalan matrah üzerinden
// uygulanır (klasik zincirleme iskonto); TimonERP'nin "10+5+2" ifadesi de böyle açılır.
//
// İki tarafın da aynı sayıyı üretmesi zorunlu: ekranda gösterilen net fiyat, ERP'ye yazılan
// sas_isk_miktar1..6 tutarlarıyla tutmalı.

export interface DiscountTier {
  /** 1..6 */
  index: number;
  percent: number;
  /** Bu kademenin düşürdüğü tutar. */
  amount: number;
  /** Kademe uygulanmadan önceki matrah. */
  base: number;
  /** Kademe uygulandıktan sonra kalan. */
  remaining: number;
}

export interface DiscountChain {
  grossPrice: number;
  tiers: DiscountTier[];
  /** Yalnız dolu (yüzde > 0) kademeler. */
  activeTiers: DiscountTier[];
  totalDiscount: number;
  netPrice: number;
  /** Brüt üzerinden toplam efektif indirim yüzdesi. */
  effectivePercent: number;
}

export const TIER_COUNT = 6;

export const calculateDiscountChain = (
  grossPrice: number,
  percentages: readonly (number | null | undefined)[],
): DiscountChain => {
  const gross = Number.isFinite(grossPrice) ? grossPrice : 0;
  const tiers: DiscountTier[] = [];
  let remaining = gross;

  for (let index = 0; index < TIER_COUNT; index += 1) {
    const rawPercent = Number(percentages[index] ?? 0) || 0;
    const percent = Math.min(100, Math.max(0, rawPercent));
    const base = remaining;
    const amount = percent > 0 && remaining > 0 ? (remaining * percent) / 100 : 0;
    remaining -= amount;
    tiers.push({ index: index + 1, percent, amount, base, remaining });
  }

  const totalDiscount = gross - remaining;

  return {
    grossPrice: gross,
    tiers,
    activeTiers: tiers.filter((t) => t.percent > 0),
    totalDiscount,
    netPrice: remaining,
    effectivePercent: gross > 0 ? (totalDiscount / gross) * 100 : 0,
  };
};

/** "10+5+2" gibi kısa gösterim — dolu kademe yoksa boş döner. */
export const formatDiscountChain = (percentages: readonly (number | null | undefined)[]): string =>
  percentages
    .map((p) => Number(p ?? 0) || 0)
    .filter((p) => p > 0)
    .map((p) => p.toLocaleString("tr-TR", { maximumFractionDigits: 2 }))
    .join("+");
