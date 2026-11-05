// Excel'den yapıştırılan "stok kodu · alış · satış" satırlarını ayrıştırır. Ürün adı ve
// birim yazılmaz; kod sunucudaki üründen çözülür. Satış kolonu boş bırakılabilir — o zaman
// satış tarafına dokunulmaz (0 yazılmaz).

import { parseDecimal } from "./money";

export interface PastedPriceLine {
  stockCode: string;
  grossPrice: number;
  salesPrice: number | null;
}

/**
 * Satırlar tab, noktalı virgül ya da boşlukla ayrılır. Alış fiyatı okunamayan satır
 * (başlık satırı dahil) atlanır; aynı kod birden fazla kez yapıştırıldıysa sonuncusu kalır.
 */
export const parsePastedPriceLines = (text: string): PastedPriceLine[] => {
  const byCode = new Map<string, PastedPriceLine>();
  for (const rawLine of text.split(/\r?\n/)) {
    const cols = rawLine.split(/\t|;|\s+/).map((c) => c.trim());
    const stockCode = cols[0] ?? "";
    const grossPrice = parseDecimal(cols[1]);
    if (!stockCode || grossPrice == null || grossPrice <= 0) continue;
    const salesPrice = parseDecimal(cols[2]);
    byCode.set(stockCode, { stockCode, grossPrice, salesPrice: salesPrice != null && salesPrice > 0 ? salesPrice : null });
  }
  return [...byCode.values()];
};
