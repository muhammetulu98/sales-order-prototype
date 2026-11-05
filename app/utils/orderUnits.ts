// Sipariş formlarında birim (Adet/Koli/…) dönüşümü. Birim fiyat SEÇİLİ birim başınadır
// (onaylama ekranı ve fiyat defteri de böyle); birim değişince fiyat katsayı oranında ölçeklenir.

/** Mikro birim katsayısı → pozitif çarpan. Aynada 2–4. slot negatif saklanır; boş/0 → 1. */
export const unitFactor = (coefficient: number | null | undefined) => Math.abs(coefficient ?? 1) || 1;

/** Adet 10 TL, Koli(12) seçilince 120 TL. Yuvarlanmaz: ileri-geri geçiş fiyatı kaydırmasın. */
export const priceForUnit = (unitPrice: number, fromFactor: number, toFactor: number) =>
  (unitPrice * unitFactor(toFactor)) / unitFactor(fromFactor);
