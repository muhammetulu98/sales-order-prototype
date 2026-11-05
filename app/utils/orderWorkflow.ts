export interface OrderPlanningEligibilityLine {
  id: string;
  version: string;
  productCode: string;
  productName: string | null;
  depotNo: number;
  depotName: string | null;
  remainingQuantity: number;
  activePlannedQuantity: number;
  availableStock: number;
  /** Serbest stok ana birimdedir; satır miktarını ana birime çeviren katsayı. */
  stockUnitFactor?: number;
  maxPlannableQuantity: number;
  approved: boolean;
  canPlan: boolean;
  reasons: string[];
}

export interface OrderPlanningEligibility {
  /** Sunucunun ürettiği, belgeye/kullanıcıya bağlı kontrol belirteci; yazmada yeniden doğrulanır. */
  eligibilityToken: string;
  sourceKind: "sales" | "depot";
  orderSeries: string;
  orderNumber: number;
  lines: OrderPlanningEligibilityLine[];
  reasons: string[];
}

export interface OrderPlanningLineInput { id: string; version: string; quantity: number }

/** Yalnız kullanıcı geri bildirimi; asıl stok/onay/eşzamanlılık kontrolü sunucudadır. */
export function getOrderPlanningIssue(
  eligibility: OrderPlanningEligibility | null,
  selection: OrderPlanningLineInput[],
): string | null {
  if (!eligibility?.eligibilityToken) return "Planlama kontrolleri henüz hazır değil. Kontrolleri yenileyin.";
  if (eligibility.reasons.length) return eligibility.reasons.join(" ");
  if (!selection.length) return "Planlanacak satır seçin.";
  const seen = new Set<string>();
  const stockGroups = new Map<string, { quantity: number; available: number }>();
  for (const input of selection) {
    const line = eligibility.lines.find((item) => item.id === input.id);
    if (seen.has(input.id)) return "Aynı satır birden fazla kez planlanamaz.";
    seen.add(input.id);
    if (!line || line.version !== input.version) return "Sipariş satırı değişti. Kontrolleri yenileyin.";
    if (!line.canPlan || line.reasons.length) return line.reasons.join(" ") || "Seçili satır planlamaya uygun değil.";
    if (eligibility.sourceKind === "sales" && !line.approved) return "Finans onayı olmayan satır planlanamaz.";
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) return "Plan miktarı sıfırdan büyük olmalı.";
    if (!Number.isFinite(line.maxPlannableQuantity) || input.quantity > line.maxPlannableQuantity) {
      return "Plan miktarı, onaylı kalan miktarı veya kullanılabilir stoğu aşıyor.";
    }
    const factor = line.stockUnitFactor ?? 1;
    if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(line.availableStock)) return "Stok birim bilgisi doğrulanamadı.";
    const key = `${line.productCode}\u0000${line.depotNo}`;
    const group = stockGroups.get(key) ?? { quantity: 0, available: line.availableStock };
    group.quantity += input.quantity * factor;
    group.available = Math.min(group.available, line.availableStock);
    stockGroups.set(key, group);
  }
  if ([...stockGroups.values()].some((group) => group.quantity > group.available + 1e-9)) return "Aynı ürün ve depodaki toplam plan miktarı kullanılabilir stoğu aşıyor.";
  return null;
}
