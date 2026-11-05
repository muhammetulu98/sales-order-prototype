import type { ShipmentWorkbenchQuery, ShipmentWorkbenchResponse, ShipmentBatchAction, WorkbenchPlan, WorkbenchLine } from "~/utils/shipmentWorkbench";
import { errorMessage, errorStatus } from "../utils/apiEnvelope";
// Kesit 4 · Blok 1 — Sevkiyat Planlama Yönetimi (ekran 20) → /api/erp/shipment-plans.
// Okuma vw_ErpShipmentPlan(Line)'dan; yazmalar guard'lı durum geçişleri (sunucu 409'u
// "durum bu sırada değişmiş olabilir" anlamına gelir — form kaydetme yok, imza/retry
// deseni gerekmez; mesaj gösterilir ve liste yenilenir). Planlama İptal ve Kutulama
// İptal Faz C'de — bu istemcide yoktur.

// ── Tipler ────────────────────────────────────────────────────────────────────────────

export interface ErpShipmentPlan {
  id: string;
  legacyId: number;
  planNo: number | null;
  statusCode: number | null;
  status: string | null;
  orderSeries: string | null;
  orderNumber: number | null;
  customerCode: string | null;
  customerTitle: string | null;
  warehouseNo: number | null;
  warehouseName: string | null;
  addressNo: number | null;
  deliveryType: string | null;
  parkingSpot: string | null;
  urgent: boolean;
  warehouseOrder: boolean;
  palletCount: number | null;
  groupNo: number | null;
  assignedUserNo: number | null;
  assignedUserName: string | null;
  pickerUserNo: number | null;
  pickerUserName: string | null;
  boxerUserNo: number | null;
  boxerUserName: string | null;
  assignedAt: string | null;
  pickingStartedAt: string | null;
  pickingEndedAt: string | null;
  boxingStartedAt: string | null;
  boxingEndedAt: string | null;
  lineCount: number;
  plannedQuantity: number;
  pickedQuantity: number;
  boxedQuantity: number;
  createdAt: string | null;
  createdBy: number | null;
  version: string;
}

export interface ErpShipmentPlanLine {
  id: string;
  legacyId: number;
  planNo: number | null;
  orderGuid: string | null;
  productCode: string | null;
  productName: string | null;
  unit: string | null;
  orderQuantity: number | null;
  plannedQuantity: number | null;
  pickedQuantity: number | null;
  boxedQuantity: number | null;
  warehouseOrder: boolean;
  createdAt: string | null;
  version: string;
}

/** Atama adayı — son 90 günün atamalarından türetilir (BSR_KULLANICILAR aynası yok). */
export interface ErpShipmentPicker {
  userNo: number;
  userName: string | null;
  assignmentCount: number;
  lastAssignedAt: string | null;
}

export interface ErpShipmentPlanPage {
  items: ErpShipmentPlan[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Durum kodu → Türkçe etiket (anahtar İngilizce, etiket Türkçe). */
export const SHIPMENT_PLAN_STATUS_LABELS: Readonly<Record<string, string>> = {
  Planned: "Planlandı",
  Assigned: "Atandı",
  Picking: "Toplanıyor",
  Picked: "Toplandı",
  Boxing: "Kutulanıyor",
  Boxed: "Kutulandı",
  Parked: "Parkta",
  AtRamp: "Rampada",
  Shipped: "Sevk Edildi",
  Unknown: "Bilinmeyen",
};

/** Durum filtre seçenekleri — kod, anahtar. Varsayılan görünüm 1–5 (bitmemiş işler). */
export const SHIPMENT_PLAN_STATUSES: ReadonlyArray<{ code: number; key: string }> = [
  { code: 1, key: "Planned" },
  { code: 2, key: "Assigned" },
  { code: 3, key: "Picking" },
  { code: 4, key: "Picked" },
  { code: 5, key: "Boxing" },
  { code: 6, key: "Boxed" },
  { code: 7, key: "Parked" },
  { code: 8, key: "AtRamp" },
  { code: 9, key: "Shipped" },
];

/** Kesit 17 · Adım B — bir kutuya eklenmiş satır. */
/**
 * "Bitir" sonucu (BEKLEYEN_API madde 16): Bitir'de kesilen çıkış irsaliyesi ya da depo siparişinde
 * depo transfer fişi; YOK işaretlenen ve bölünen satır sayıları.
 */
export interface BoxingCompletionResult {
  documentKind: "dispatch" | "depotTransfer";
  documentNo: string;
  removedLineCount: number;
  splitLineCount: number;
}

export interface ErpShipmentPlanBoxLine {
  id: string;
  boxNo: number;
  boxBarcode: string;
  productCode: string;
  productName: string | null;
  quantity: number;
}

/** Barkod okutma sonucu (terminal deneyiminin PC eşdeğeri — elle kod girişi). */
export interface ErpShipmentPlanBarcodeLookup {
  productCode: string;
  productName: string | null;
  unit: string | null;
  remainingQuantity: number;
}

export class ErpShipmentPlanActionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ErpShipmentPlanActionError";
  }
}

// ── Hata yardımcıları ────────────────────────────────────────────────────────────────



// ── İstemci ──────────────────────────────────────────────────────────────────────────

export const useErpShipmentPlans = () => {
  const api = useApi();
  const base = "/api/erp/shipment-plans";

  // 3480 referansına göre ÖNERİLEN sözleşmeler; backend yapılacaklar dosyasında.
  const workbench = (query: ShipmentWorkbenchQuery) =>
    api.request<ShipmentWorkbenchResponse>(`${base}/workbench`, { query: { ...query }, silentError: true });
  const workbenchDetail = (planNo: number) =>
    api.request<{ plan: WorkbenchPlan; lines: WorkbenchLine[] }>(`${base}/workbench/${planNo}`, { silentError: true });
  const workbenchAction = (body: {
    action: ShipmentBatchAction; plans: { id: string; planNo: number; version: string }[];
    userNo: number | null; reason: string; requestId: string;
  }) => api.request<{ affectedCount: number; groupNo: number | null }>(`${base}/workbench/actions`, { method: "POST", body, silentError: true });
  const applyAssignments = (body: {
    snapshotVersion: string; assignments: { id: string; planNo: number; version: string; userNo: number }[];
    requestId: string;
  }) => api.request<{ affectedCount: number }>(`${base}/workbench/assignments`, { method: "POST", body, silentError: true });
  const labels = (planNo: number) => api.request<{
    boxes: { no: number; barcode: string }[]; pallets: { no: number; barcode: string }[];
  }>(`${base}/workbench/${planNo}/labels`, { silentError: true });

  const list = (query: {
    status?: string;
    search?: string;
    warehouseNo?: number;
    urgent?: boolean;
    page?: number;
    pageSize?: number;
  } = {}) =>
    api.request<ErpShipmentPlanPage>(base, {
      query: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });

  const get = (planNo: number) =>
    api.request<{ plan: ErpShipmentPlan; lines: ErpShipmentPlanLine[] }>(`${base}/${planNo}`);

  const pickers = () => api.request<ErpShipmentPicker[]>(`${base}/pickers`);

  const act = async <T = boolean>(path: string, body: Record<string, unknown>, fallback: string): Promise<T> => {
    try {
      return await api.request<T>(`${base}/${path}`, { method: "POST", body, silentError: true });
    } catch (err) {
      throw new ErpShipmentPlanActionError(errorMessage(err, fallback), errorStatus(err));
    }
  };

  const assign = (planNos: number[], userNo: number) =>
    act("assign", { planNos, userNo }, "Atama yapılamadı.");
  const unassign = (planNos: number[]) =>
    act("unassign", { planNos }, "Atama iptal edilemedi.");
  const cancelPicking = (planNos: number[]) =>
    act("cancel-picking", { planNos }, "Toplama iptal edilemedi.");
  const group = (planNos: number[]) =>
    act<{ groupNo: number; planCount: number }>("group", { planNos }, "Gruplanamadı.");
  const ungroup = (planNos: number[]) =>
    act("ungroup", { planNos }, "Gruptan çıkarılamadı.");

  // ── Kesit 17 · Adım B — Kutulama (yalnız Postgres; Mikro'ya yazmaz) ─────────────────

  const startBoxing = (planNo: number) =>
    act(`${planNo}/boxing/start`, {}, "Kutulama başlatılamadı.");

  const resolveBoxingBarcode = async (planNo: number, barcode: string) => {
    try {
      return await api.request<ErpShipmentPlanBarcodeLookup>(
        `${base}/${planNo}/boxing/barcode/${encodeURIComponent(barcode)}`,
        { silentError: true },
      );
    } catch (err) {
      throw new ErpShipmentPlanActionError(errorMessage(err, "Ürün bulunamadı."), errorStatus(err));
    }
  };

  const addToBox = (
    planNo: number,
    input: { boxNo: number; barcode: string; quantity: number },
  ) =>
    act<ErpShipmentPlanBoxLine>(`${planNo}/boxing/lines`, { ...input }, "Kutuya eklenemedi.");

  const listBoxLines = (planNo: number) =>
    api.request<ErpShipmentPlanBoxLine[]>(`${base}/${planNo}/boxing/lines`);

  /** Bugün uç `true` döner; madde 16 uygulanınca kesilen evrak bilgisini döndürür. */
  const completeBoxing = (planNo: number) =>
    act<BoxingCompletionResult | true>(`${planNo}/boxing/complete`, {}, "Kutulama tamamlanamadı.");

  return {
    workbench, workbenchDetail, workbenchAction, applyAssignments, labels,
    list, get, pickers, assign, unassign, cancelPicking, group, ungroup,
    startBoxing, resolveBoxingBarcode, addToBox, listBoxLines, completeBoxing,
  };
};
