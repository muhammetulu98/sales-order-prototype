// Stok kartı sekmelerinin saf hesapları: barkod doğrulama, satınalma şartında son maliyet,
// iskonto zinciri gösterimi ve KDV dönüşümü.

/** Barkod: yalnız rakam, 8–14 hane (EAN-8 … GTIN-14). */
export const isValidBarcode = (value: string) => /^\d{8,14}$/.test(value.trim());

/**
 * Son maliyet = net × Π(1 − p/100) — ek iskontolar ve primler kademeli düşülür
 * (mal fazlası, ödeme, fuar iskontoları; personel ve sene sonu primleri).
 */
export const lastCost = (net: number | null, percents: readonly (number | null | undefined)[]) => {
  if (net === null) return null;
  const factor = percents.reduce<number>((acc, percent) => acc * (1 - (percent ?? 0) / 100), 1);
  return Math.round(net * factor * 10_000) / 10_000;
};

/** "10+5+0+0+0+0" — legacy iskonto zinciri gösterimi. */
export const discountChain = (discounts: readonly (number | null | undefined)[]) =>
  discounts.map((value) => String(value ?? 0).replace(".", ",")).join("+");

export const withVat = (price: number | null, taxRate: number | null) =>
  price === null ? null : Math.round(price * (1 + (taxRate ?? 0) / 100) * 10_000) / 10_000;

export const withoutVat = (priceWithVat: number | null, taxRate: number | null) =>
  priceWithVat === null ? null : Math.round((priceWithVat / (1 + (taxRate ?? 0) / 100)) * 10_000) / 10_000;
