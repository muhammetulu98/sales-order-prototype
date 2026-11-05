// Kesit 5 · ekran 13 (Hızlı Cari Kart) → /api/erp/customers.
// Ekran yalnız YARATIR: kod sunucuda 120.ERP serisinden üretilir, istemci veremez.
// Aynı vergi no'da cari varsa sunucu 409 döner; kullanıcı onaylarsa istek
// acknowledgeDuplicateTaxNumber ile tekrarlanır (legacy'nin Evet/Hayır sorusunun karşılığı).
import { errorMessage, errorStatus } from "../utils/apiEnvelope";

export interface ErpCustomer {
  id: string;
  customerGuid: string | null;
  code: string;
  title: string | null;
  titlePrefix: string | null;
  taxOfficeCode: string | null;
  taxOfficeName: string | null;
  taxNumber: string | null;
  taxIdentityNumber: string | null;
  representativeCode: string | null;
  regionCode: string | null;
  regionName: string | null;
  groupCode: string | null;
  groupName: string | null;
  sectorCode: string | null;
  sectorName: string | null;
  email: string | null;
  reconciliationEmail: string | null;
  mobilePhone: string | null;
  salesDiscountCode: string | null;
  salesPriceListNo: number | null;
  currencyType: number | null;
  accountingCode: string | null;
  invoiceAddressNo: number | null;
  shipmentAddressNo: number | null;
  eInvoiceDefaultType: number | null;
  transactionType: number | null;
  transactionTypeName: string | null;
  // Tam Cari Kart alanları (vw_ErpCustomer, detaylı mod).
  parentCustomerCode: string | null;
  connectionType: number | null;
  paymentPlanNo: number | null;
  paymentType: number | null;
  paymentMethod: number | null;
  dueDifferencePercent: number | null;
  creditRiskTracking: boolean;
  purchaseStockType: number | null;
  salesStockType: number | null;
  kepAddress: string | null;
  website: string | null;
  emailConsent: boolean;
  eInvoiceRegistered: boolean;
  eInvoiceStartDate: string | null;
  eDispatchRegistered: boolean;
  eDispatchStartDate: string | null;
  eDispatchDefaultType: number | null;
  locked: boolean;
  cancelled: boolean;
  creditLimit: number | null;
  /** Cari kartında kayıtlı ambar (nakliye ambarı) carisi; yoksa null. */
  forwarderCode?: string | null;
  addressCount: number;
  approvalStatus: number;
  approvalStatusName: string | null;
  syncStatus: number;
  syncStatusName: string | null;
  syncError: string | null;
  syncedAt: string | null;
  createdAt: string | null;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
  version: string;
  // Liste ve detay uçları doldurur (il/ilçe: fatura adresi, yoksa ilk adres).
  province: string | null;
  district: string | null;
  representativeName: string | null;
  balance: number | null;
  commercialStatus: string | null;
  // Yalnız detay ucu doldurur; listede null.
  paymentPlanName: string | null;
}

export interface ErpCustomerAddress {
  id: string;
  addressGuid: string | null;
  customerCode: string;
  addressNo: number | null;
  title: string | null;
  province: string | null;
  district: string | null;
  quarter: string | null;
  neighborhood: string | null;
  street: string | null;
  road: string | null;
  postalCode: string | null;
  country: string | null;
  phone1: string | null;
  phone2: string | null;
  representativeCode: string | null;
  eInvoiceAlias: string | null;
  eDispatchAlias: string | null;
  cancelled: boolean;
  createdAt: string | null;
  version: string;
}

export interface ErpCustomerContact {
  id: string;
  contactGuid: string | null;
  customerCode: string;
  addressNo: number | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  mobilePhone: string | null;
  workPhone: string | null;
  isReconciliationOfficer: boolean;
  kepAddress: string | null;
  website: string | null;
  cancelled: boolean;
  version: string;
}

// ── Cari ekstresi (GET /api/erp/customers/{code}/transactions) ─────────────────────
// API: ErpCustomerAccountEndpoints (D29 — B2B handler'ları). Kaynak Mikro
// CARI_HESAP_HAREKETLERI aynası; B2B karşılığı GET /api/v1/musteriler/{kod}/hareketler.

/** B2B `chaTip` karşılığı; etiketler ~/utils/customerStatement içinde. */
export type ErpTransactionKind = "invoice" | "collection" | "return" | "voucher" | "cheque" | "bond";

export interface ErpCustomerTransactionStockLine {
  stockCode: string;
  stockName: string | null;
  quantity: number;
  unitName: string | null;
  unitPrice: number;
  discount1: number;
  discount2: number;
  discount3: number;
  discount4: number;
  netUnitPrice: number;
  netAmount: number;
}

export interface ErpCustomerTransaction {
  id: string;
  documentSeries: string | null;
  documentSequence: number | null;
  /** "YYYY-MM-DD" veya ISO timestamp. */
  transactionDate: string;
  referenceNo: string | null;
  kind: ErpTransactionKind;
  /** Mikro evrak tipi adı ("Satış faturası", "Tahsilat makbuzu"...). */
  documentTypeName: string | null;
  /** Mikro cins adı. */
  typeName: string | null;
  description: string | null;
  dueDate: string | null;
  debit: number;
  credit: number;
  currency: string;
  stockLines: ErpCustomerTransactionStockLine[];
}

// ── Yaşlandırma / e-Fatura / Finansal Özet ──────────────────────────────────────────
// API: ErpCustomerAccountEndpoints (D29).

/** Ay bazlı açık bakiye (B2B TMN_RAPOR_CARI_BAKIYE_YASLANDIRMA_TARIHLI karşılığı). */
export interface ErpCustomerAgingRow {
  year: number;
  /** 1–12 */
  month: number;
  /** Borç − alacak, carinin dövizinde. */
  balance: number;
}

export type ErpEInvoiceDirection = "outgoing" | "incoming";
export type ErpEInvoiceDocumentType = "eInvoice" | "eArchive" | "eDispatch";
export type ErpEInvoiceStatus = "pending" | "sent" | "accepted" | "rejected" | "cancelled" | "failed";

export interface ErpEInvoice {
  documentSeries: string;
  documentSequence: number;
  direction: ErpEInvoiceDirection;
  documentType: ErpEInvoiceDocumentType;
  /** GİB fatura no ("TE62026000019004"). */
  invoiceNumber: string | null;
  ettn: string | null;
  invoiceDate: string | null;
  createdAt: string | null;
  sentAt: string | null;
  status: ErpEInvoiceStatus;
  statusMessage: string | null;
  amount: number;
  currency: string;
}

export interface ErpEInvoiceLine {
  stockCode: string;
  stockName: string | null;
  barcode: string | null;
  quantity: number;
  unitName: string | null;
  unitPrice: number;
  netUnitPrice: number;
  vatPercent: number;
  amount: number;
}

export interface ErpCustomerYearlySales {
  year: number;
  /** KDV dahil, iadeler düşülmüş net satış. */
  netAmountWithVat: number;
  netAmountWithoutVat: number;
}

export interface ErpCustomerFinancialSummary {
  currency: string;
  /** Bakiye + bekleyen sipariş/irsaliye + portföydeki çek/senet riski (Mikro cari risk). */
  totalRisk: number;
  balanceDays: number | null;
  pendingOrderAmount: number;
  pendingDispatchAmount: number;
  // Cari Risk Föyü kırılımı (BEKLEYEN_API madde 20) — uç henüz döndürmüyor; gelmezse föyde "—".
  /** Portföydeki (tahsile verilmemiş) müşteri çekleri. */
  portfolioChequeAmount?: number | null;
  /** Portföydeki, vadesi gelmemiş müşteri senetleri. */
  portfolioNoteAmount?: number | null;
  /** Sevk edilmemiş sipariş adedi. */
  pendingOrderCount?: number | null;
  /** Faturalanmamış irsaliye adedi. */
  pendingDispatchCount?: number | null;
  /** Bu yıl ve geçen yıl. */
  yearlySales: ErpCustomerYearlySales[];
}

export interface ErpCustomerCard {
  customer: ErpCustomer;
  addresses: ErpCustomerAddress[];
  contacts: ErpCustomerContact[];
}

/** Detaylı formun sözlükleri — hepsi ERP veritabanından, tek çağrıda. */
export interface ErpCustomerFormLookups {
  regions: ErpCustomerLookupItem[];
  groups: ErpCustomerLookupItem[];
  sectors: ErpCustomerLookupItem[];
  representatives: ErpCustomerLookupItem[];
  discountCodes: ErpCustomerLookupItem[];
  paymentPlans: ErpCustomerLookupItem[];
  accountingCodes: ErpCustomerLookupItem[];
}

// ── Tam Cari Kart yazma sözleşmesi (POST /api/erp/customers, PUT .../{code}) ──────────

export interface ErpCustomerWritePayload {
  title: string;
  titlePrefix: string | null;
  isIndividual: boolean;
  taxNumber: string;
  taxOfficeCode: string | null;
  taxOfficeName: string | null;
  parentCustomerCode: string | null;
  representativeCode: string;
  regionCode: string;
  groupCode: string;
  sectorCode: string;
  currencyType: number;
  transactionType: number;
  connectionType: number;
  accountingCode: string | null;
  salesDiscountCode: string | null;
  salesPriceListNo: number | null;
  paymentPlanNo: number | null;
  paymentType: number | null;
  paymentMethod: number | null;
  dueDifferencePercent: number | null;
  creditLimit: number;
  creditRiskTracking: boolean;
  purchaseStockType: number | null;
  salesStockType: number | null;
  locked: boolean;
  email: string;
  reconciliationEmail: string | null;
  mobilePhone: string;
  phone: string | null;
  kepAddress: string | null;
  website: string | null;
  emailConsent: boolean;
  eInvoiceRegistered: boolean;
  eInvoiceStartDate: string | null;
  eInvoiceDefaultType: number | null;
  eDispatchRegistered: boolean;
  eDispatchStartDate: string | null;
  eDispatchDefaultType: number | null;
  invoiceAddressNo: number | null;
  shipmentAddressNo: number | null;
}

export interface ErpCustomerAddressPayload {
  addressNo: number;
  addressGuid: string | null;
  title: string | null;
  province: string;
  district: string;
  quarter: string | null;
  neighborhood: string | null;
  street: string | null;
  road: string | null;
  postalCode: string | null;
  country: string | null;
  phone1: string | null;
  phone2: string | null;
  representativeCode: string | null;
  eInvoiceAlias: string | null;
  eDispatchAlias: string | null;
}

export interface ErpCustomerContactPayload {
  contactGuid: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  mobilePhone: string | null;
  workPhone: string | null;
  addressNo: number | null;
  isReconciliationOfficer: boolean;
  kepAddress: string | null;
  website: string | null;
}

export interface ErpCustomerWriteRequest {
  customer: ErpCustomerWritePayload;
  addresses: ErpCustomerAddressPayload[];
  contacts: ErpCustomerContactPayload[];
  acknowledgeDuplicateTaxNumber?: boolean;
}

export interface ErpCustomerPage {
  items: ErpCustomer[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Müşteri = 120./329., tedarikçi = 320. kodlu cari (B2B CustomerVisibility). */
export type ErpPartyType = "customer" | "supplier";

export interface ErpCustomerListQuery {
  search?: string;
  onlyErpSeries?: boolean;
  partyType?: ErpPartyType;
  representativeCode?: string;
  commercialStatus?: string;
  province?: string;
  page?: number;
  pageSize?: number;
}

export interface ErpCustomerListFilters {
  representatives: ErpCustomerLookupItem[];
  commercialStatuses: string[];
}

export interface ErpCustomerLookupItem {
  code: string;
  name: string | null;
}

export interface ErpCustomerLookups {
  regions: ErpCustomerLookupItem[];
  groups: ErpCustomerLookupItem[];
  sectors: ErpCustomerLookupItem[];
}

export interface ErpQuickCustomerPayload {
  title: string;
  isIndividual: boolean;
  taxNumber: string;
  taxOfficeCode: string | null;
  taxOfficeName: string | null;
  mobilePhone: string;
  email: string;
  province: string;
  district: string;
  quarter: string;
  neighborhood: string;
  postalCode: string;
  street: string | null;
  road: string | null;
  regionCode: string;
  groupCode: string;
  sectorCode: string;
  acknowledgeDuplicateTaxNumber?: boolean;
}

/** Adres kademesi — beşi de tek tablodan (TMN_IL_ILCE_MAHALLE aynası). */
export type ErpLocationLevel = "province" | "district" | "quarter" | "neighborhood" | "postalCode";

export class ErpCustomerActionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ErpCustomerActionError";
  }
}



export const useErpCustomers = () => {
  const api = useApi();
  const base = "/api/erp/customers";

  const list = (query: ErpCustomerListQuery = {}) =>
    api.request<ErpCustomerPage>(`${base}/`, {
      query: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });

  const get = (code: string) =>
    api.request<ErpCustomerCard>(`${base}/${encodeURIComponent(code)}`);

  /** Sekme verileri: hata sessiz, ekran 404'ü "devreye alınmadı" diye gösterir. */
  const tabResource = async <T>(code: string, path: string, fallback: string) => {
    try {
      return await api.request<T>(`${base}/${encodeURIComponent(code)}/${path}`, { silentError: true });
    } catch (err) {
      throw new ErpCustomerActionError(errorMessage(err, fallback), errorStatus(err));
    }
  };

  /** Carinin tüm hesap hareketleri, tarih sırasıyla. */
  const transactions = (code: string) =>
    tabResource<ErpCustomerTransaction[]>(code, "transactions", "Ekstre yüklenemedi.");

  const aging = (code: string) => tabResource<ErpCustomerAgingRow[]>(code, "aging", "Yaşlandırma yüklenemedi.");

  const eInvoices = (code: string) => tabResource<ErpEInvoice[]>(code, "e-invoices", "e-Faturalar yüklenemedi.");

  const eInvoiceLines = (code: string, series: string, sequence: number) =>
    tabResource<ErpEInvoiceLine[]>(
      code,
      `e-invoices/${encodeURIComponent(series)}/${sequence}/lines`,
      "Fatura satırları yüklenemedi.",
    );

  const financialSummary = (code: string) =>
    tabResource<ErpCustomerFinancialSummary>(code, "financial-summary", "Finansal özet yüklenemedi.");

  const lookups = () => cachedLookup("customers:lookups", () => api.request<ErpCustomerLookups>(`${base}/lookups`));

  /** Cari listesi filtre seçenekleri (temsilci + ticari statü); il listesi `locations("province")`. */
  const listFilters = () => api.request<ErpCustomerListFilters>(`${base}/list-filters`);

  /** Detaylı formun tüm sözlükleri (bölge/grup/sektör + temsilci/iskonto/plan/muhasebe). */
  const formLookups = () => cachedLookup("customers:form-lookups", () => api.request<ErpCustomerFormLookups>(`${base}/form-lookups`));

  const taxOffices = (search: string) =>
    api.request<ErpCustomerLookupItem[]>(`${base}/tax-offices`, { query: { search } });

  const locations = (
    level: ErpLocationLevel,
    parents: { province?: string; district?: string; quarter?: string; neighborhood?: string } = {},
  ) =>
    api.request<{ value: string }[]>(`${base}/locations`, {
      query: Object.fromEntries(
        Object.entries({ level, ...parents }).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });

  const taxNumberCheck = (taxNumber: string) =>
    api.request<ErpCustomerLookupItem[]>(`${base}/tax-number-check`, { query: { taxNumber } });

  const createQuick = async (payload: ErpQuickCustomerPayload) => {
    try {
      return await api.request<{ id: string; code: string }>(`${base}/quick`, {
        method: "POST",
        body: { ...payload },
        silentError: true,
      });
    } catch (err) {
      throw new ErpCustomerActionError(errorMessage(err, "Cari açılamadı."), errorStatus(err));
    }
  };

  /** Tam Cari Kart — yaratma. 409'da hızlı karttaki aynı onay akışı işler. */
  const create = async (payload: ErpCustomerWriteRequest) => {
    try {
      return await api.request<{ id: string; code: string }>(`${base}/`, {
        method: "POST",
        body: payload,
        silentError: true,
      });
    } catch (err) {
      throw new ErpCustomerActionError(errorMessage(err, "Cari açılamadı."), errorStatus(err));
    }
  };

  /** Tam Cari Kart — güncelleme. Onaylı cari yeniden senkron kuyruğuna girer. */
  const update = async (code: string, payload: ErpCustomerWriteRequest) => {
    try {
      return await api.request<{ id: string; code: string }>(
        `${base}/${encodeURIComponent(code)}`,
        { method: "PUT", body: payload, silentError: true },
      );
    } catch (err) {
      throw new ErpCustomerActionError(errorMessage(err, "Cari güncellenemedi."), errorStatus(err));
    }
  };

  return {
    list,
    get,
    transactions,
    aging,
    eInvoices,
    eInvoiceLines,
    financialSummary,
    lookups,
    listFilters,
    formLookups,
    taxOffices,
    locations,
    taxNumberCheck,
    createQuick,
    create,
    update,
  };
};
