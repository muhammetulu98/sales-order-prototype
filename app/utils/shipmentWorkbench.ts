import type { ErpShipmentPlan, ErpShipmentPlanLine } from "../composables/useErpShipmentPlans";

export const WORKBENCH_STATUSES = [
  { code: 1, label: "Planlandı", tone: "planned" },
  { code: 2, label: "Atandı", tone: "assigned" },
  { code: 3, label: "Toplanıyor", tone: "picking" },
  { code: 4, label: "Toplandı", tone: "picked" },
  { code: 5, label: "Kutulanıyor", tone: "boxing" },
  { code: 6, label: "Kutulandı", tone: "boxed" },
] as const;

export interface WorkbenchPlan extends ErpShipmentPlan {
  shipmentDate: string | null;
  orderDate: string | null;
  deliveryDate: string | null;
  province: string | null;
  district: string | null;
  region: string | null;
  routeName: string | null;
  routeSequence: number | null;
  plannerName: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  customerLocked: boolean | null;
  stockSufficient: boolean | null;
  invoiceIssued: boolean | null;
  boxCount: number | null;
  description: string | null;
}
export interface WorkbenchLine extends ErpShipmentPlanLine {
  freeQuantity: number | null;
  secondaryQuantity: number | null;
  secondaryUnit: string | null;
}
export interface WorkbenchPicker {
  userNo: number; name: string; categoryCodes: string[]; categoryNames: string[];
  warehouseNos: number[]; activeLineCount: number;
}
export interface ShipmentWorkbenchQuery {
  statuses: string; warehouseNos?: string; search?: string; boxedFrom?: string;
  boxedTo?: string; page: number; pageSize: number; sortBy?: string; sortDirection?: "asc" | "desc";
  planNos?: string;
}
export interface ShipmentWorkbenchResponse {
  items: WorkbenchPlan[]; totalCount: number;
  statusCounts: Record<string, number>;
  warehouses: { no: number; name: string }[];
  capabilities: { assign: boolean; cancelPlan: boolean; cancelBoxing: boolean;
    cancelPicking: boolean; group: boolean; smartAssign: boolean; print: boolean; export: boolean };
  /** Tam seçili-depo kapsamı; sayfalı listeye bakarak küresel öneri/iş yükü uydurulmaz. */
  recommendationPlans: WorkbenchPlan[];
  recommendationComplete: boolean;
  snapshotVersion: string;
  pickers: WorkbenchPicker[];
  /** Görünen grupların, diğer sayfalar dahil TAM üyeleri. */
  groups: { groupNo: number; plans: WorkbenchPlan[] }[];
}
export interface ShipmentRecommendation {
  text: string; reason: string; priority: 1 | 2 | 3;
  action: "assign" | "check" | "box" | "wait" | "done";
}
export interface ShipmentAssignment {
  plan: WorkbenchPlan; picker: WorkbenchPicker; reason: string;
}
export type ShipmentBatchAction = "assign" | "unassign" | "cancelPlan" | "cancelPicking" | "cancelBoxing" | "group" | "ungroup";

const dayDistance = (date: string | null, today: string): number | null => {
  if (!date) return null;
  const distance = (Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86400000;
  return Number.isFinite(distance) ? Math.round(distance) : null;
};
export function shipmentRecommendation(plan: WorkbenchPlan, today: string): ShipmentRecommendation {
  const days = dayDistance(plan.deliveryDate, today);
  const soon = days !== null && days <= 1;
  const priority = plan.urgent || soon ? 1 : 2;
  const timing = days === null ? "Teslim tarihi belirtilmemiş." : days < 0
    ? `Teslim tarihi ${-days} gün geçti.` : days === 0 ? "Teslim tarihi bugün." : days === 1 ? "Teslim tarihi yarın." : `Teslime ${days} gün var.`;
  switch (plan.statusCode) {
    case 1:
      if (plan.customerLocked === true) return { text: "Atanamaz: cari kilitli", reason: "Cari hareket durumu uygun değil.", priority: 1, action: "check" };
      if (plan.customerLocked == null || plan.stockSufficient == null) return { text: "Cari / stok kontrolü bekleniyor", reason: "Eksik kontrol bilgisiyle atama önerilmez.", priority, action: "check" };
      if (!plan.stockSufficient) return { text: "Stok yetersiz, planı gözden geçir", reason: `Serbest stok bazı satırlara yetmiyor. ${timing}`, priority, action: "check" };
      if (!plan.categoryCode) return { text: "Plan kategorisini kontrol et", reason: "Kategori bilinmeden uygun listeci seçilemez.", priority, action: "check" };
      return { text: "Atama yap", reason: `${plan.categoryName ?? plan.categoryCode} kategorisi; stok ve cari uygun. ${timing}`, priority, action: "assign" };
    case 2: {
      const elapsed = dayDistance(plan.assignedAt, today);
      return elapsed !== null && elapsed <= -1
        ? { text: "Listeci başlamadı, hatırlat", reason: `${-elapsed} gün önce atandı, toplama başlamadı.`, priority, action: "check" }
        : { text: "Listeci bekleniyor", reason: `Atanan: ${plan.assignedUserName ?? "Bilinmiyor"}. ${timing}`, priority: soon || plan.urgent ? 2 : 3, action: "wait" };
    }
    case 3: {
      const elapsed = dayDistance(plan.pickingStartedAt ?? plan.createdAt, today);
      return elapsed !== null && elapsed <= -2
        ? { text: "Toplama uzadı, kontrol et", reason: `Toplama ${-elapsed} gündür sürüyor.`, priority, action: "check" }
        : { text: "Toplama sürüyor", reason: "Listeci ürünleri hazırlıyor.", priority: 3, action: "wait" };
    }
    case 4: return { text: "Kutulamaya geç", reason: `Toplama tamamlandı. ${timing}`, priority, action: "box" };
    case 5: return { text: "Kutulama sürüyor", reason: `${Math.max(0, plan.plannedQuantity - plan.boxedQuantity).toLocaleString("tr-TR")} birim kutulanmayı bekliyor.`, priority: soon ? 2 : 3, action: "wait" };
    case 6: return plan.invoiceIssued === true
      ? { text: "Tamamlandı", reason: "Kutulandı ve faturası oluştu.", priority: 3, action: "done" }
      : { text: "Fatura kontrolü", reason: plan.invoiceIssued === null ? "Fatura durumu henüz doğrulanmadı." : "Kutulanan planın faturasını kontrol edin.", priority: 3, action: "check" };
    default: return { text: "Durumu kontrol et", reason: "Bu durum depo iş akışında tanımlı değil.", priority: 3, action: "check" };
  }
}

export function shipmentSelectionActions(plans: WorkbenchPlan[]) {
  const all = (codes: number[]) => plans.length > 0 && plans.every((plan) => codes.includes(plan.statusCode ?? -1));
  const categories = new Set(plans.map((plan) => plan.categoryCode));
  return {
    assign: all([1]) && categories.size === 1 && !categories.has(null) && !categories.has(""),
    unassign: all([2]), cancelPlan: all([1]), cancelPicking: all([3, 4]), cancelBoxing: all([5, 6]),
    group: plans.length >= 2, ungroup: plans.length >= 2,
    mixedStatuses: new Set(plans.map((plan) => plan.statusCode)).size > 1,
    mixedCategories: categories.size > 1,
    unknownCategory: plans.some((plan) => !plan.categoryCode),
  };
}

export function eligibleShipmentPickers(plans: WorkbenchPlan[], pickers: WorkbenchPicker[]): WorkbenchPicker[] {
  if (!shipmentSelectionActions(plans).assign) return [];
  return pickers.filter((picker) => Number.isFinite(picker.activeLineCount) && picker.activeLineCount >= 0 && picker.userNo > 0 && plans.every((plan) => plan.categoryCode
    && picker.categoryCodes.includes(plan.categoryCode) && plan.warehouseNo !== null
    && picker.warehouseNos.includes(plan.warehouseNo)))
    .sort((a, b) => a.activeLineCount - b.activeLineCount || a.name.localeCompare(b.name, "tr") || a.userNo - b.userNo);
}

/** Aynı müşteri/grup + kategori/depo kümesi birlikte kalır; yalnız uygun listeciler. */
export function suggestShipmentAssignments(plans: WorkbenchPlan[], pickers: WorkbenchPicker[], today: string) {
  const loads = new Map(pickers.map((picker) => [picker.userNo, picker.activeLineCount]));
  const groups = new Map<string, WorkbenchPlan[]>();
  const skipped: WorkbenchPlan[] = [];
  for (const plan of plans) {
    if (shipmentRecommendation(plan, today).action !== "assign") continue;
    if (!plan.groupNo && !plan.customerCode) { skipped.push(plan); continue; }
    const key = `${plan.warehouseNo}|${plan.categoryCode}|${plan.groupNo ? `group:${plan.groupNo}` : `customer:${plan.customerCode}`}`;
    groups.set(key, [...(groups.get(key) ?? []), plan]);
  }
  const ranked = [...groups.values()].sort((a, b) => Math.min(...a.map((plan) => shipmentRecommendation(plan, today).priority))
    - Math.min(...b.map((plan) => shipmentRecommendation(plan, today).priority))
    || b.reduce((sum, plan) => sum + plan.plannedQuantity, 0) - a.reduce((sum, plan) => sum + plan.plannedQuantity, 0)
    || (a[0]?.planNo ?? 0) - (b[0]?.planNo ?? 0));
  const assignments: ShipmentAssignment[] = [];
  for (const group of ranked) {
    const candidates = eligibleShipmentPickers(group, pickers)
      .sort((a, b) => (loads.get(a.userNo) ?? 0) - (loads.get(b.userNo) ?? 0)
        || a.name.localeCompare(b.name, "tr") || a.userNo - b.userNo);
    const picker = candidates[0];
    if (!picker) { skipped.push(...group); continue; }
    const reason = `${group[0]?.categoryName ?? group[0]?.categoryCode}: uygun listecilerden en az yüklü (${loads.get(picker.userNo)} satır).${group.length > 1 ? " Aynı müşteri/grup birlikte tutuldu." : ""}`;
    assignments.push(...group.map((plan) => ({ plan, picker, reason })));
    loads.set(picker.userNo, (loads.get(picker.userNo) ?? 0) + group.reduce((sum, plan) => sum + plan.lineCount, 0));
  }
  return { assignments, skipped, loads };
}

export function suggestShipmentGroups(plans: WorkbenchPlan[]) {
  const candidates = plans.filter((plan) => [1, 2].includes(plan.statusCode ?? 0) && plan.categoryCode && plan.warehouseNo !== null);
  const used = new Set<string>();
  const suggestions: { key: string; plans: WorkbenchPlan[]; reason: string }[] = [];
  const groupBy = (keyOf: (plan: WorkbenchPlan) => string | null, reason: string) => {
    const groups = new Map<string, WorkbenchPlan[]>();
    for (const plan of candidates.filter((item) => !used.has(item.id))) {
      const key = keyOf(plan); if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), plan]);
    }
    for (const [key, group] of groups) {
      if (group.length < 2 || (group[0]?.groupNo && group.every((plan) => plan.groupNo === group[0]!.groupNo))) continue;
      suggestions.push({ key, plans: group, reason }); group.forEach((plan) => used.add(plan.id));
    }
  };
  groupBy((plan) => plan.customerCode ? `customer:${plan.warehouseNo}|${plan.categoryCode}|${plan.customerCode}` : null, "Aynı müşteri, kategori ve depo; birlikte hazırlanabilir.");
  groupBy((plan) => plan.routeName && plan.shipmentDate ? `route:${plan.warehouseNo}|${plan.categoryCode}|${plan.routeName}|${plan.shipmentDate.slice(0, 10)}` : null, "Aynı rut, sevk günü, depo ve kategori; aynı araca hazırlanabilir.");
  return suggestions;
}

export interface ShipmentColumn { key: string; label: string; default: boolean; required?: boolean; numeric?: boolean }
export const SHIPMENT_SUMMARY_COLUMNS: ShipmentColumn[] = [
  { key: "urgent", label: "Acil", default: true }, { key: "recommendation", label: "Önerilen İşlem", default: true },
  { key: "planNo", label: "Plan No", default: true, required: true, numeric: true },
  { key: "shipmentDate", label: "Sevk Tarihi", default: true }, { key: "order", label: "Sipariş", default: true },
  { key: "orderDate", label: "Sipariş Tarihi", default: true }, { key: "customer", label: "Cari", default: true },
  { key: "lineCount", label: "Satır", default: true, numeric: true }, { key: "statusCode", label: "Durumu", default: true },
  { key: "warehouseName", label: "Depo", default: true }, { key: "location", label: "İl / İlçe", default: true },
  { key: "region", label: "Bölge", default: false }, { key: "deliveryType", label: "Teslim Türü", default: true },
  { key: "deliveryDate", label: "Teslim Tarihi", default: false },
  { key: "plannedQuantity", label: "Planlanan", default: true, numeric: true },
  { key: "pickedQuantity", label: "Toplanan", default: true, numeric: true }, { key: "boxedQuantity", label: "Kutulanan", default: true, numeric: true },
  { key: "boxes", label: "Kutu / Palet", default: true }, { key: "route", label: "Rut", default: true },
  { key: "groupNo", label: "Grup", default: true, numeric: true }, { key: "createdAt", label: "Planlama Tarihi", default: false },
  { key: "plannerName", label: "Planlayan", default: true }, { key: "categoryName", label: "Kategori", default: true },
  { key: "assignedUserName", label: "Listeci", default: true }, { key: "assignedAt", label: "Atama Zamanı", default: false },
  { key: "boxerUserName", label: "Kutulayan", default: false }, { key: "description", label: "Açıklama", default: true },
];
export const SHIPMENT_DETAIL_COLUMNS: ShipmentColumn[] = [
  { key: "productCode", label: "Stok Kodu", default: true, required: true },
  { key: "productName", label: "Stok Adı", default: true, required: true }, { key: "unit", label: "Birim", default: true },
  { key: "plannedQuantity", label: "Planlanan", default: true, numeric: true },
  { key: "pickedQuantity", label: "Toplanan", default: true, numeric: true }, { key: "boxedQuantity", label: "Kutulanan", default: true, numeric: true },
  { key: "missingQuantity", label: "Eksik", default: true, numeric: true }, { key: "freeQuantity", label: "Serbest", default: true, numeric: true },
  { key: "secondaryQuantity", label: "Miktar 2", default: true, numeric: true }, { key: "secondaryUnit", label: "Birim 2", default: true },
];
export const sanitizeShipmentColumns = (value: unknown, columns: ShipmentColumn[]) => columns
  .filter((column) => column.required || (Array.isArray(value) ? value.includes(column.key) : column.default)).map((column) => column.key);
export interface ShipmentSort { key: string; direction: "asc" | "desc" }
export function nextShipmentSort(current: ShipmentSort | null, key: string): ShipmentSort | null {
  return current?.key !== key ? { key, direction: "desc" }
    : current.direction === "desc" ? { key, direction: "asc" } : null;
}
export function sortShipmentRows<T>(rows: T[], sort: ShipmentSort | null, value: (row: T, key: string) => string | number | boolean | null | undefined): T[] {
  if (!sort) return [...rows];
  const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });
  return [...rows].sort((left, right) => {
    const a = value(left, sort.key), b = value(right, sort.key);
    const emptyA = a === null || a === undefined || a === "";
    const emptyB = b === null || b === undefined || b === "";
    if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
    const comparison = typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b));
    return comparison * (sort.direction === "desc" ? -1 : 1);
  });
}

export const shipmentSummaryValue = (plan: WorkbenchPlan, key: string, today: string): string | number | boolean | null => {
  if (key === "recommendation") return 4 - shipmentRecommendation(plan, today).priority;
  if (key === "order") return plan.orderNumber === null ? null : `${plan.orderSeries ?? ""}-${plan.orderNumber}`;
  if (key === "customer") return plan.customerTitle ?? plan.customerCode;
  if (key === "location") return [plan.province, plan.district].filter(Boolean).join(" / ");
  if (key === "boxes") return plan.boxCount;
  if (key === "route") return plan.routeName;
  const value = plan[key as keyof WorkbenchPlan];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null;
};
export const shipmentDetailValue = (line: WorkbenchLine, key: string): string | number | null => {
  if (key === "missingQuantity") return line.plannedQuantity === null || line.boxedQuantity === null ? null : Math.max(0, line.plannedQuantity - line.boxedQuantity);
  const value = line[key as keyof WorkbenchLine];
  return typeof value === "number" || typeof value === "string" ? value : null;
};
