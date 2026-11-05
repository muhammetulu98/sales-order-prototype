// Purchasing API istemcisi — /api/erp alış şartı uçlarının tipli sarmalayıcısı.
// Tüm sorgular aktif şirketin id'sini açık parametre olarak taşır.

export interface ErpPurchasingWarehouseLookup {
  id: number;
  code: string;
  name: string;
}

export interface ErpPurchasingPaymentTermLookup {
  id: number;
  name: string;
}

export interface ErpPurchasingLookups {
  warehouses: ErpPurchasingWarehouseLookup[];
  paymentTerms: ErpPurchasingPaymentTermLookup[];
  closureReasons: ErpPurchasingClosureReasonLookup[];
}

export interface ErpBulkDiscountUpdatePayload {
  companyId: number;
  supplierId: string;
  warehouseId: number | null;
  effectiveDate: string;
  oldDiscountPercent1: number;
  oldDiscountPercent2: number;
  oldDiscountPercent3: number;
  oldDiscountPercent4: number;
  oldDiscountPercent5: number;
  oldDiscountPercent6: number;
  newDiscountPercent1: number;
  newDiscountPercent2: number;
  newDiscountPercent3: number;
  newDiscountPercent4: number;
  newDiscountPercent5: number;
  newDiscountPercent6: number;
}

export interface ErpPurchasingClosureReasonLookup {
  id: number;
  code: string;
  name: string;
}

export interface ErpPurchaseOrderListItem {
  id: string;
  orderNumber: string;
  supplierCode: string;
  supplierName: string;
  orderDate: string;
  deliveryDate: string | null;
  status: number;
  kind: number;
  supplierNotified: boolean;
  lineCount: number;
  openLineCount: number;
  lastChangedAt: string;
  rowVersion: number;
}

export interface ErpPurchaseOrderPage {
  items: ErpPurchaseOrderListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ErpPurchaseOrderLine {
  id: string;
  lineNo: number;
  productId: string;
  productCode: string;
  productName: string;
  productUnitId: string;
  unitCode: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discountPercents: number[];
  taxRateId: number;
  netTotal: number;
  purchaseConditionId: string | null;
  sourceSalesOrderLineId: string | null;
  quoteStatus: number | null;
  deliveryDate: string | null;
  status: number;
  closureReasonId: number | null;
  description: string | null;
  rowVersion: number;
  unitOptions: { productUnitId: string; unitCode: string }[];
}

export interface ErpPurchaseOrderEvent {
  action: string;
  fromStatus: number | null;
  toStatus: number | null;
  note: string | null;
  createdAt: string;
}

export interface ErpPurchaseOrderDetail {
  id: string;
  companyId: number;
  orderNumber: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  warehouseId: number;
  orderDate: string;
  deliveryDate: string | null;
  paymentTermId: number | null;
  projectCode: string | null;
  kind: number;
  status: number;
  approvedAt: string | null;
  supplierNotified: boolean;
  notes: string | null;
  createdAt: string;
  rowVersion: number;
  lines: ErpPurchaseOrderLine[];
  events: ErpPurchaseOrderEvent[];
}

export interface ErpPurchaseOrderLinePayload {
  productId: string;
  productUnitId: string;
  quantity: number;
  unitPrice: number;
  discountPercent1: number;
  discountPercent2: number;
  discountPercent3: number;
  discountPercent4: number;
  discountPercent5: number;
  discountPercent6: number;
  taxRateId: number;
  purchaseConditionId: string | null;
  quoteStatus: number | null;
  deliveryDate: string | null;
  description: string | null;
}

export interface ErpPurchaseOrderHeaderPayload {
  supplierId: string;
  warehouseId: number;
  orderDate: string;
  deliveryDate: string | null;
  paymentTermId: number | null;
  projectCode: string | null;
  notes: string | null;
}

export interface ErpPurchasePriceSuggestion {
  conditionId: string;
  grossPrice: number;
  discountPercents: number[];
  netPrice: number;
}

export const PURCHASE_ORDER_STATUS_LABELS: Record<number, string> = {
  0: "Taslak",
  1: "Onay Bekliyor",
  2: "Onaylı",
  3: "Kapalı",
  4: "İptal",
};

export const PURCHASE_ORDER_KIND_LABELS: Record<number, string> = {
  0: "Standart",
  1: "Yerinden/Transit",
};

export interface ErpPassThroughRow {
  salesOrderLineId: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  productCode: string;
  productName: string;
  quantity: number;
  deliveredQuantity: number;
  fulfillmentType: number;
  salesLineStatus: number;
  deliveryDate: string | null;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  purchaseOrderStatus: number | null;
  supplierName: string | null;
  supplierNotified: boolean | null;
  purchaseOrderRowVersion: number | null;
  purchaseLineStatus: number | null;
}

export const FULFILLMENT_TYPE_LABELS: Record<number, string> = {
  0: "Stok",
  1: "Yerinden",
  2: "Transit",
};

export const MARKETING_SCOPE_LABELS: Record<number, string> = {
  0: "Genel",
  1: "Stok",
  2: "Marka",
};

export const useErpPurchasing = () => {
  const api = useApi();

  const fetchPurchasingLookups = (companyId: number) =>
    api.request<ErpPurchasingLookups>(`/api/erp/purchasing/lookups?companyId=${companyId}`);

  const bulkDiscountUpdate = (payload: ErpBulkDiscountUpdatePayload) =>
    api.request<number>("/api/erp/purchase-conditions/bulk-discount-update", {
      method: "POST",
      body: payload,
    });

  const queryPurchaseOrders = (params: {
    companyId: number;
    status?: number;
    kind?: number;
    search?: string;
    page: number;
    pageSize: number;
  }) => {
    const query = new URLSearchParams({
      companyId: String(params.companyId),
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    if (params.status !== undefined) query.set("status", String(params.status));
    if (params.kind !== undefined) query.set("kind", String(params.kind));
    if (params.search) query.set("search", params.search);
    return api.request<ErpPurchaseOrderPage>(`/api/erp/purchasing/orders?${query.toString()}`);
  };

  const fetchPurchaseOrder = (id: string) =>
    api.request<ErpPurchaseOrderDetail>(`/api/erp/purchasing/orders/${encodeURIComponent(id)}`);

  const fetchPurchasePriceSuggestion = (params: {
    supplierId: string;
    productId: string;
    warehouseId: number;
    date?: string;
  }) => {
    const query = new URLSearchParams({
      supplierId: params.supplierId,
      productId: params.productId,
      warehouseId: String(params.warehouseId),
    });
    if (params.date) query.set("date", params.date);
    return api.request<ErpPurchasePriceSuggestion | null>(
      `/api/erp/purchasing/price-suggestion?${query.toString()}`,
    );
  };

  const createPurchaseOrder = (payload: {
    companyId: number;
    header: ErpPurchaseOrderHeaderPayload;
    lines: ErpPurchaseOrderLinePayload[];
    submitForApproval: boolean;
  }) => api.request<string>("/api/erp/purchasing/orders", { method: "POST", body: payload });

  const updatePurchaseOrder = (
    id: string,
    payload: {
      header: ErpPurchaseOrderHeaderPayload;
      lines: ErpPurchaseOrderLinePayload[];
      rowVersion: number;
    },
  ) => api.request<number>(`/api/erp/purchasing/orders/${encodeURIComponent(id)}`, { method: "PUT", body: payload });

  const purchaseOrderAction = (
    id: string,
    action: "submit" | "approve" | "revoke-approval" | "cancel",
    payload: { rowVersion: number; note?: string },
  ) =>
    api.request<number>(`/api/erp/purchasing/orders/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      body: payload,
    });

  const closePurchaseOrder = (
    id: string,
    payload: { rowVersion: number; closureReasonId: number; note?: string },
  ) =>
    api.request<number>(`/api/erp/purchasing/orders/${encodeURIComponent(id)}/close`, {
      method: "POST",
      body: payload,
    });

  const updatePurchaseOrderLine = (
    orderId: string,
    lineId: string,
    payload: {
      quantity: number;
      unitPrice: number;
      discountPercent1: number;
      discountPercent2: number;
      discountPercent3: number;
      discountPercent4: number;
      discountPercent5: number;
      discountPercent6: number;
      quoteStatus: number | null;
      deliveryDate: string | null;
      description: string | null;
      rowVersion: number;
    },
  ) =>
    api.request<number>(`/api/erp/purchasing/orders/${encodeURIComponent(orderId)}/lines/${encodeURIComponent(lineId)}`, {
      method: "PUT",
      body: payload,
    });

  const closePurchaseOrderLine = (
    orderId: string,
    lineId: string,
    payload: { closureReasonId: number; note?: string },
  ) =>
    api.request<number>(`/api/erp/purchasing/orders/${encodeURIComponent(orderId)}/lines/${encodeURIComponent(lineId)}/close`, {
      method: "POST",
      body: payload,
    });

  const copyPurchaseOrderLineRemainder = (orderId: string, lineId: string) =>
    api.request<string>(
      `/api/erp/purchasing/orders/${encodeURIComponent(orderId)}/lines/${encodeURIComponent(lineId)}/copy-remainder`,
      { method: "POST" },
    );

  const setSupplierNotified = (
    orderId: string,
    payload: { rowVersion: number; notified: boolean },
  ) =>
    api.request<number>(`/api/erp/purchasing/orders/${encodeURIComponent(orderId)}/supplier-notified`, {
      method: "POST",
      body: payload,
    });

  const fetchPassThroughRows = (companyId: number, mode: "linked" | "candidates") =>
    api.request<ErpPassThroughRow[]>(
      `/api/erp/purchasing/pass-through?companyId=${companyId}&mode=${mode}`,
    );

  const createPassThrough = (payload: {
    companyId: number;
    supplierId: string;
    salesOrderLineIds: string[];
    fulfillmentType: number;
    notes: string | null;
  }) => api.request<string>("/api/erp/purchasing/pass-through", { method: "POST", body: payload });

  return {
    fetchPurchasingLookups,
    bulkDiscountUpdate,
    queryPurchaseOrders,
    fetchPurchaseOrder,
    fetchPurchasePriceSuggestion,
    createPurchaseOrder,
    updatePurchaseOrder,
    purchaseOrderAction,
    closePurchaseOrder,
    updatePurchaseOrderLine,
    closePurchaseOrderLine,
    copyPurchaseOrderLineRemainder,
    setSupplierNotified,
    fetchPassThroughRows,
    createPassThrough,
  };
};
