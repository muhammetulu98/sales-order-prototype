// Kutulamayı Tamamla ("Bitir") öncesi eksik denetimi. Legacy kuralı (BEKLEYEN_API madde 16):
// Bitir'de okutulan miktarla irsaliye / depo transfer fişi kesilir; hiç okutulmayan sipariş
// satırı "YOK" işaretlenip plandan çıkar, kısmen okutulan satır bölünür ve kalanı siparişte
// açık kalır. Eksik varsa kullanıcı "Evrak kaydedilecek" onayı verir.
// Kural SİPARİŞ SATIRI bazındadır ama kutu satırları yalnız ürünü taşır: aynı ürün birden çok
// satırdaysa okutulan miktar satırlara plan sırasıyla (oluşturma zamanı, satır no) dağıtılır.
// Bu bir önizlemedir; dağıtımı sunucu aynı sırayla kesinleştirir.

export type BoxingOutcome = "none" | "partial";

export interface BoxingShortage {
  /** Plan satırı kimliği (yoksa ürün kodu). */
  lineId: string;
  productCode: string;
  productName: string | null;
  unit: string | null;
  planned: number;
  boxed: number;
  missing: number;
  /** none: hiç okutulmadı → YOK, plandan çıkar; partial: satır bölünür, kalan siparişte açık kalır. */
  outcome: BoxingOutcome;
}

export interface BoxingPlanLine {
  id?: string;
  legacyId?: number | null;
  createdAt?: string | null;
  productCode: string | null;
  productName: string | null;
  unit: string | null;
  plannedQuantity: number | null;
}

export interface BoxingBoxLine {
  productCode: string;
  quantity: number;
}

const EPSILON = 0.0001;

const lineOrder = (a: BoxingPlanLine, b: BoxingPlanLine) =>
  (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || (a.legacyId ?? 0) - (b.legacyId ?? 0);

export const boxingShortages = (planLines: readonly BoxingPlanLine[], boxLines: readonly BoxingBoxLine[]): BoxingShortage[] => {
  const boxedLeft = new Map<string, number>();
  for (const line of boxLines) boxedLeft.set(line.productCode, (boxedLeft.get(line.productCode) ?? 0) + line.quantity);

  const result: BoxingShortage[] = [];
  for (const line of [...planLines].sort(lineOrder)) {
    if (!line.productCode) continue;
    const planned = line.plannedQuantity ?? 0;
    if (planned <= EPSILON) continue;
    const available = boxedLeft.get(line.productCode) ?? 0;
    const boxed = Math.min(planned, available);
    boxedLeft.set(line.productCode, available - boxed);
    const missing = planned - boxed;
    if (missing <= EPSILON) continue;
    result.push({
      lineId: line.id ?? line.productCode,
      productCode: line.productCode,
      productName: line.productName,
      unit: line.unit,
      planned,
      boxed,
      missing,
      outcome: boxed <= EPSILON ? "none" : "partial",
    });
  }
  // Önce hiç okutulmayanlar (plandan çıkacaklar), sonra kısmiler; kendi içinde ürün koduna göre.
  return result.sort((a, b) => (a.outcome === b.outcome ? a.productCode.localeCompare(b.productCode, "tr") : a.outcome === "none" ? -1 : 1));
};
