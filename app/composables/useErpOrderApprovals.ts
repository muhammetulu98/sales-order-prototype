// Satış Sipariş Onaylama (eski adıyla Sipariş Finans Onayı) — /api/erp/sales-order-approvals.
// Sözleşme: BEKLEYEN_API_DEGISIKLIKLERI.md → Sipariş Operasyonları A (genişletilmiş, 2026-10-19:
// siparis-onaylama prototipi). Teklif dönüşümünden ayrıdır. Kontroller (kilit, limit, stand,
// sürüm) onay anında SUNUCUDA yeniden yapılır; ekrandaki öneri (orderApprovalAdvice) bağlayıcı değildir.
// Teslim türleri sabit liste değil, satış sözlüğünden (useErpSalesOrders().lookups) gelir.

export type OrderApprovalStatus = "pending" | "partial" | "approved";

export const LINE_CLOSE_REASONS = [
  "Müşteri vazgeçti",
  "Stok yetersiz",
  "Fiyat uyuşmazlığı",
  "Mükerrer sipariş",
  "Ürün üretimden kalktı",
] as const;

export interface ErpOrderApprovalUnit {
  slot: number;
  name: string;
  /** Ana birime göre katsayı (adet 1, koli 12…). */
  factor: number;
}

export interface ErpOrderApprovalLine {
  id: string;
  /** Opak sürüm — onay/kapatma isteğinde aynen geri gönderilir; uyuşmazsa 409. */
  version: string;
  productCode: string;
  productName: string | null;
  /** Onay bekleyen (kalan) miktar, `unitSlot` biriminde. */
  quantity: number;
  unitSlot: number;
  units: ErpOrderApprovalUnit[];
  listPrice: number;
  unitPrice: number;
  /** Kademeli yüzde iskontolar, 4 eleman. */
  discounts: number[];
  vatRate: number;
  dueDate: string | null;
  /** Stand satırı: parçalanmadan onaylanamaz. */
  isStand: boolean;
  note: string | null;
}

export interface ErpOrderApproval {
  orderSeries: string;
  orderNumber: number;
  /** Müşterinin B2B portalından girdiği sipariş. */
  isB2B: boolean;
  orderDate: string | null;
  deliveryDate: string | null;
  customerCode: string;
  customerTitle: string | null;
  projectCode: string | null;
  deliveryType: string | null;
  representativeName: string | null;
  salesRepName: string | null;
  province: string | null;
  district: string | null;
  collectionType: string | null;
  /** Evrak açıklamaları 1–9 (her biri en çok 50 karakter). */
  notes: string[];
  creditLimit: number | null;
  creditRisk: number | null;
  customerLock: { reason: string; lockedAt: string | null } | null;
  shippingAddressId: string | null;
  currency: string;
  lineCount: number;
  approvedLineCount: number;
  approvalStatus: OrderApprovalStatus;
  /** Son onayı veren ve tarihi (kısmen onaylı siparişte dolu; PDF adım 2 — onaylayan + tarih). */
  approvedByName: string | null;
  approvedAt: string | null;
  // Özet tutarlar (sunucu satırlardan hesaplar; liste sütunları ve sıralama için).
  netTotal: number;
  grossTotal: number;
  discountTotal: number;
  exVatTotal: number;
  vatTotal: number;
  totalQuantity: number;
  // Kayıt ve sınıflama bilgileri (Sütunlar penceresinden açılır).
  createdByName: string | null;
  createdAt: string | null;
  updatedByName: string | null;
  updatedAt: string | null;
  channel: string | null;
  orderType: string | null;
  region: string | null;
  customerGroup: string | null;
  priceListName: string | null;
  /** Ödeme vadesi (gün); 0 = peşin. */
  paymentDays: number | null;
}

export interface ErpShippingAddress {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  district: string | null;
  isDefault: boolean;
}

export interface ErpOrderApprovalDetail {
  order: ErpOrderApproval;
  /** Sunucunun izin çözümleyicisinden; istemci izin adı uydurmaz. */
  capabilities: {
    approve: boolean;
    edit: boolean;
    /**
     * Kullanıcının değiştirebileceği iskonto kademeleri, 1 tabanlı (1–4). Her kademe ayrı
     * yetkidir (PDF adım 2). Sunucu göndermezse `edit` ise dördü de açılır; sunucu yine doğrular.
     */
    discountSlots?: number[];
    /** Vade güncelleme yetkisi; gönderilmezse `edit` kullanılır. */
    dueDate?: boolean;
  };
  lines: ErpOrderApprovalLine[];
  shippingAddresses: ErpShippingAddress[];
}

/** Onayda satırın son hâli gider; sunucu fiyat/iskonto/limit kontrolünü bununla yapar. */
export interface ErpOrderApprovalLineInput {
  id: string;
  version: string;
  quantity: number;
  unitSlot: number;
  discounts: number[];
  /** Vade; bugünden önce olamaz (sunucu da reddeder). */
  dueDate: string | null;
  note: string | null;
}

export interface ErpOrderApprovalHeaderPatch {
  /** Teslim türü KODU (tslt_kod); liste/detaydaki `deliveryType` ise ADI taşır. */
  deliveryType?: string;
  notes?: string[];
  shippingAddressId?: string;
}

export const useErpOrderApprovals = () => {
  const api = useApi();
  const base = "/api/erp/sales-order-approvals";
  const at = (series: string, number: number) => `${base}/${encodeURIComponent(series)}/${number}`;

  return {
    /** Onay bekleyen (bekliyor + kısmen onaylı) siparişler. */
    list: (query: { search?: string; status?: OrderApprovalStatus; page?: number; pageSize?: number } = {}) =>
      api.request<{ items: ErpOrderApproval[]; totalCount: number }>(base, {
        query: Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== "")),
        silentError: true,
      }),
    get: (series: string, number: number) => api.request<ErpOrderApprovalDetail>(at(series, number), { silentError: true }),
    /** Teslim türü / evrak açıklamaları / sevk adresi — anında kaydedilir. */
    updateHeader: (series: string, number: number, patch: ErpOrderApprovalHeaderPatch) =>
      api.request<ErpOrderApproval>(at(series, number), { method: "PATCH", body: patch, silentError: true }),
    approve: (series: string, number: number, lines: ErpOrderApprovalLineInput[]) =>
      api.request<{ approvedLineCount: number }>(`${at(series, number)}/approve`, {
        method: "POST",
        body: { lines },
        silentError: true,
      }),
    close: (series: string, number: number, lines: { id: string; version: string }[], reason: string) =>
      api.request<{ closedLineCount: number }>(`${at(series, number)}/close-lines`, {
        method: "POST",
        body: { lines, reason },
        silentError: true,
      }),
    /** requestId: onay penceresi başına bir kez üretilir; aynı anahtarın tekrarı ikinci evrak açmamalı. */
    duplicate: (series: string, number: number, requestId: string) =>
      api.request<{ orderSeries: string; orderNumber: number }>(`${at(series, number)}/duplicate`, {
        method: "POST",
        body: { requestId },
        silentError: true,
      }),
    convertToQuote: (series: string, number: number, requestId: string) =>
      api.request<{ quoteSeries: string; quoteNumber: number }>(`${at(series, number)}/convert-to-quote`, {
        method: "POST",
        body: { requestId },
        silentError: true,
      }),
  };
};

export const orderApprovalKey = (order: Pick<ErpOrderApproval, "orderSeries" | "orderNumber">) =>
  `${order.orderSeries}-${order.orderNumber}`;

export const orderApprovalErrorStatus = (err: unknown) =>
  Number((err as { statusCode?: number; status?: number })?.statusCode ?? (err as { status?: number })?.status ?? 0);
