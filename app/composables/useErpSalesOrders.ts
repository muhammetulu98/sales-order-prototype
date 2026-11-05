// Kesit 7 · ekran 04 (Satış Teklif) + 05 (Satış Sipariş). Ekran 28 (Sipariş Kapatma) 2026-10-19'da
// kaldırıldı — satır kapatma Sipariş Planlama'dan (closeLines / OrderCloseAction).
// → /api/erp/sales-orders. Okuma vw_ErpSalesOrder(Line)'dan.
//
// Teklif ve sipariş TEK gövdedir; fark yalnız orderType (0 = sipariş, 2 = teklif) —
// legacy'de de iki form aynı SIPARISLER satırını farklı sip_tip ile yazıyor.
//
// KAPSAM DIŞI (kanalı/aynası olmayan, ölçülmüş alanlar — bkz. CUTOVER_UAT):
// kredi limiti, serbest miktar kontrolü, "hazır stok yoksa teklife düş" otomatiği,
// prim oranı, SIPARISLER_USER (Nakit / Onaylanma Tarihi / REFERANS), Yerinden/Transit.
// Ekran 19 (Teklif Onaylama) bu kesitte ERTELENDİ.
import { errorMessage, errorStatus } from "../utils/apiEnvelope";

export const SALES_ORDER_TYPE = 0;
export const SALES_OFFER_TYPE = 2;

export interface ErpSalesOrder {
  orderSeries: string;
  orderNumber: number;
  orderType: number;
  orderTypeName: string | null;
  orderDate: string | null;
  deliveryDate: string | null;
  customerCode: string | null;
  customerTitle: string | null;
  addressNo: number | null;
  addressTitle: string | null;
  representativeCode: string | null;
  representativeName: string | null;
  projectCode: string | null;
  projectName: string | null;
  paymentPlanNo: number | null;
  paymentPlanName: string | null;
  deliveryTypeCode: string | null;
  deliveryTypeName: string | null;
  currencyCode: number | null;
  priceListNo: number | null;
  lineCount: number;
  openLineCount: number;
  closedLineCount: number;
  grossTotal: number;
  discountTotal: number;
  taxTotal: number;
  netTotal: number;
  approved: boolean;
  approverUserNo: number | null;
  taxFree: boolean;
  note1: string | null;
  note2: string | null;
  note9: string | null;
  urgent: boolean;
  partialShipmentNotAllowed: boolean;
  singleDelivery: boolean;
  collectionDate: string | null;
  collectionType: string | null;
  cargoCustomerCode: string | null;
  cargoFee: number | null;
  erpCreated: boolean;
  syncStatus: number;
  syncStatusName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ErpSalesOrderLine {
  id: string;
  lineGuid: string;
  orderSeries: string;
  orderNumber: number;
  orderType: number;
  lineNo: number;
  customerCode: string | null;
  productCode: string | null;
  productName: string | null;
  unitPntr: number | null;
  unitName: string | null;
  quantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  lineTotal: number;
  discount1: number;
  discount2: number;
  discount3: number;
  discount4: number;
  discount5: number;
  discount6: number;
  discountTotal: number;
  taxPntr: number | null;
  taxPercent: number;
  taxAmount: number;
  netTotal: number;
  depotNo: number | null;
  depotName: string | null;
  deliveryDate: string | null;
  note1: string | null;
  note2: string | null;
  priceListNo: number | null;
  currencyCode: number | null;
  open: boolean;
  closeReasonCode: string | null;
  closeReasonName: string | null;
  /** Yerinden/Transit'in bağladığı karşı evrak ("SERİ-SIRA"); kaskad kapatma kapsam dışı. */
  linkedReference: string | null;
  approved: boolean;
  syncStatus: number;
  syncStatusName: string | null;
  createdAt: string | null;
  version: string;
}

export interface ErpSalesOrderDetail {
  header: ErpSalesOrder | null;
  lines: ErpSalesOrderLine[];
}

export interface ErpSalesLookupItem { code: string; name: string }
export interface ErpSalesDepotItem { no: number; name: string }
export interface ErpSalesPaymentPlanItem { no: number; name: string }

export interface ErpSalesOrderLookups {
  depots: ErpSalesDepotItem[];
  paymentPlans: ErpSalesPaymentPlanItem[];
  deliveryTypes: ErpSalesLookupItem[];
  representatives: ErpSalesLookupItem[];
  projects: ErpSalesLookupItem[];
  closeReasons: ErpSalesLookupItem[];
  orderSeries: string[];
  /** Seçilebilir ambarlar (nakliye ambarı carileri). */
  forwarders?: ErpSalesLookupItem[];
  /** Yeni evrakta verilecek sıradaki numara (bilgi; kesin numara kayıtta verilir). */
  nextOrderNumber?: number | null;
}

export interface ErpSalesProductUnit { pntr: number; name: string; factor: number }

import type { BasketTerm } from "~/utils/basketProfitability";

export interface ErpSalesProductInfo {
  code: string;
  name: string | null;
  defaultUnitPntr: number;
  units: ErpSalesProductUnit[];
  taxPntr: number;
  taxPercent: number;
  listPrice: number;
  /** İsk 1 (%): fiyat kuralından gelir, satırda değiştirilemez. */
  discount1?: number | null;
  /** Evrak tarihinde bu stoğa tanımlı geçerli insert (kampanya) adı; yoksa null. */
  insertName?: string | null;
  insertValidTo?: string | null;
  /** Bütçe hesabı için tedarikçi sözleşme oranları; sözleşmesiz stokta null. */
  budgetTerm?: BasketTerm | null;
  priceListNo: number;
  passive: boolean;
  salesStopped: boolean;
  physicalStateCode: string | null;
}

export interface ErpSalesOrderLineInput {
  id?: string | null;
  productCode: string;
  unitPntr: number;
  quantity: number;
  unitPrice: number;
  discountPercents?: number[] | null;
  depotNo: number;
  deliveryDate?: string | null;
  note1?: string | null;
  note2?: string | null;
  priceListNo?: number | null;
  /** Satır vadesi (gün). */
  dueDays?: number | null;
  /** Satır vadesi gün ya da nokta tarih; İsk 2 varsa plana ek gün eklenmiş tarih. */
  dueKind?: "days" | "date";
  dueDate?: string | null;
}

export interface ErpSalesOrderSavePayload {
  orderSeries?: string | null;
  orderNumber?: number | null;
  orderType: number;
  customerCode: string;
  addressNo: number;
  representativeCode?: string | null;
  projectCode?: string | null;
  paymentPlanNo?: number | null;
  /** Ödeme planı: vade günü YA DA nokta tarih. */
  paymentDueKind?: "days" | "date";
  paymentDueDays?: number | null;
  paymentDueDate?: string | null;
  deliveryTypeCode?: string | null;
  /** Yalnız "Kendisi Alacak" teslimde: müşterinin mal alacağı depo. */
  pickupDepotNo?: number | null;
  /** Yalnız "Ambar" teslimde: nakliye ambarı carisi (cari kartından gelir, değiştirilebilir). */
  forwarderCode?: string | null;
  deliveryDate?: string | null;
  urgent?: boolean;
  partialShipmentNotAllowed?: boolean;
  singleDelivery?: boolean;
  collectionDate?: string | null;
  collectionType?: string | null;
  cargoCustomerCode?: string | null;
  cargoFee?: number | null;
  notes?: string[] | null;
  lines: ErpSalesOrderLineInput[];
  version?: string | null;
  /** Yeni evrakta tekrar gönderim anahtarı; yalnız başarıdan sonra yenilenir. */
  requestId?: string;
}

export interface ErpSalesOrderSaved {
  orderSeries: string;
  orderNumber: number;
  orderType: number;
}

// ── Ekran 26 · Sipariş Aktarma ──────────────────────────────────────────────────────────
export interface ErpSalesOrderImportLineInput {
  rowNo: number;
  documentNo: string | null;
  customerCode: string;
  barcode: string | null;
  productCode: string | null;
  quantity: number;
  unitName: string | null;
  unitPrice: number;
  discount1: number | null;
  discount2: number | null;
  discount3: number | null;
  discount4: number | null;
  note: string | null;
  paymentPlanNo: number | null;
  headerNote1: string | null;
  headerNote4: string | null;
  headerNote5: string | null;
  headerNote9: string | null;
  discountsFromList: boolean;
}

export interface ErpSalesOrderImportResolvedLine {
  rowNo: number;
  documentNo: string;
  customerCode: string;
  customerName: string | null;
  productCode: string | null;
  productName: string | null;
  unitPntr: number;
  unitName: string | null;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discountPercents: number[];
  note: string | null;
  paymentPlanNo: number;
  headerNote1: string | null;
  headerNote4: string | null;
  headerNote5: string | null;
  headerNote9: string | null;
  /** Doluysa satır kaydedilmez. */
  error: string | null;
}

export interface ErpSalesOrderImportSavedOrder {
  customerCode: string;
  documentNo: string;
  orderSeries: string;
  orderNumber: number;
  lineCount: number;
}

export interface ErpPagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export class ErpSalesOrderActionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ErpSalesOrderActionError";
  }
}

const wrap = async <T>(fallback: string, run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (err) {
    throw new ErpSalesOrderActionError(errorMessage(err, fallback), errorStatus(err));
  }
};

export const useErpSalesOrders = () => {
  const api = useApi();
  const base = "/api/erp/sales-orders";

  const list = (
    query: {
      orderType?: number;
      search?: string;
      customerCode?: string;
      series?: string;
      onlyOpen?: boolean;
      onlyErpSeries?: boolean;
      fromDate?: string;
      toDate?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) =>
    api.request<ErpPagedResult<ErpSalesOrder>>(`${base}/`, {
      query: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });

  const get = (orderType: number, series: string, number: number, includeClosed = false) =>
    api.request<ErpSalesOrderDetail>(
      `${base}/${orderType}/${encodeURIComponent(series)}/${number}`,
      { query: { includeClosed } },
    );

  const lookups = () => cachedLookup("sales-orders:lookups", () => api.request<ErpSalesOrderLookups>(`${base}/lookups`));

  /** `date`: evrak tarihi — o tarihte geçerli insert tanımı varsa yanıtta gelir. */
  const productInfo = (code: string, date?: string) =>
    api.request<ErpSalesProductInfo>(`${base}/products/${encodeURIComponent(code)}`, { query: date ? { date } : undefined });

  const create = (payload: ErpSalesOrderSavePayload) =>
    wrap("Evrak kaydedilemedi.", () =>
      api.request<ErpSalesOrderSaved>(`${base}/`, { method: "POST", body: { ...payload }, silentError: true }));

  const update = (orderType: number, series: string, number: number, payload: ErpSalesOrderSavePayload) =>
    wrap("Evrak güncellenemedi.", () =>
      api.request<ErpSalesOrderSaved>(`${base}/${orderType}/${encodeURIComponent(series)}/${number}`, {
        method: "PUT",
        body: { ...payload },
        silentError: true,
      }));

  const closeLines = (ids: string[], reasonCode: string) =>
    wrap("Satırlar kapatılamadı.", () =>
      api.request<boolean>(`${base}/lines/close`, {
        method: "POST",
        body: { ids, reasonCode },
        silentError: true,
      }));

  const deleteLines = (ids: string[]) =>
    wrap("Satırlar silinemedi.", () =>
      api.request<boolean>(`${base}/lines/delete`, { method: "POST", body: { ids }, silentError: true }));

  const changeDepot = (ids: string[], depotNo: number) =>
    wrap("Depo değiştirilemedi.", () =>
      api.request<boolean>(`${base}/lines/depot`, {
        method: "POST",
        body: { ids, depotNo },
        silentError: true,
      }));

  const updateNotes = (orderType: number, series: string, number: number, notes: string[]) =>
    wrap("Açıklamalar kaydedilemedi.", () =>
      api.request<boolean>(`${base}/${orderType}/${encodeURIComponent(series)}/${number}/notes`, {
        method: "PUT",
        body: { notes },
        silentError: true,
      }));

  /** Ekran 26 — yapıştırılan satırları çözümle (cari/stok/birim/iskonto); hata satır içinde döner. */
  const importResolve = (payload: {
    lines: ErpSalesOrderImportLineInput[];
    supplierCode: string | null;
    useMultiCode: boolean;
    pricesIncludeTax: boolean;
  }) =>
    wrap("Satırlar çözümlenemedi.", () =>
      api.request<ErpSalesOrderImportResolvedLine[]>(`${base}/import/resolve`, {
        method: "POST",
        body: payload,
        silentError: true,
      }));

  /** Ekran 26 — çözümlenmiş satırları cari + belge no başına siparişe çevirir (tek transaction). */
  const importSave = (payload: {
    lines: ErpSalesOrderImportResolvedLine[];
    series: string;
    projectCode: string;
    depotNo: number;
    representativeCode: string;
    /** Çözümleme başına tekrar gönderim anahtarı; yalnız başarıdan sonra yenilenir. */
    requestId: string;
  }) =>
    wrap("Siparişler kaydedilemedi.", () =>
      api.request<{ orders: ErpSalesOrderImportSavedOrder[] }>(`${base}/import`, {
        method: "POST",
        body: payload,
        silentError: true,
      }));

  return {
    list, get, lookups, productInfo,
    create, update, closeLines, deleteLines, changeDepot, updateNotes,
    importResolve, importSave,
  };
};

type DiscountAmounts = {
  lineTotal: number | null;
  discount1: number | null; discount2: number | null; discount3: number | null;
  discount4: number | null; discount5: number | null; discount6: number | null;
};

/**
 * Satır iskonto tutarlarından legacy kaskad yüzdelerini geri çözer (satış ve satın alma formu).
 * 6 ondalığa yuvarlanır: 2 ondalık, onaylamanın 4 ondalıklı İsk 1'ini dokunulmamış satırda bile
 * yeniden kaydederken bozuyordu; 6 ondalık float gürültüsünü siler, 4 ondalığı birebir korur.
 */
export const discountPercentsOf = (line: DiscountAmounts): number[] => {
  const amounts = [line.discount1, line.discount2, line.discount3, line.discount4, line.discount5, line.discount6];
  const percents: number[] = [];
  let remaining = line.lineTotal ?? 0;
  for (const amount of amounts) {
    if (remaining <= 0 || !amount) { percents.push(0); continue; }
    percents.push(Math.round((amount / remaining) * 100 * 1e6) / 1e6);
    remaining -= amount;
  }
  return percents;
};
