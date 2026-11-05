import type {
  OperationPage, OperationOrder, OperationOrderDetail, OperationRef, FulfillmentOptions,
  SalesDocumentRow, DocumentSource, DocumentDraft, GoodsReceiptOrder, GoodsReceiptDetail,
  OrderReportRow, OrderReportKind, PriceDifferenceRequest, PrintDocument, OrderStockContextLine,
} from "~/utils/orderOperations";

// ÖNERİLEN uçlar: mevcut API'ye ekleme yapılmadı; sözleşmeler bekleyen API dosyasında.
export const useErpOrderOperations = () => {
  const api = useApi();
  const base = "/api/erp/order-operations";
  const read = <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
    api.request<T>(`${base}${path}`, { query, silentError: true });
  const write = <T = boolean>(path: string, body: Record<string, unknown>) =>
    api.request<T>(`${base}${path}`, { method: "POST", body, silentError: true });
  return {
    orders: (query: Record<string, string | number | boolean | undefined>) => read<OperationPage<OperationOrder>>("/orders", query),
    order: (series: string, number: number) => read<OperationOrderDetail>(`/orders/${encodeURIComponent(series)}/${number}`),
    fulfillmentOptions: () => read<FulfillmentOptions>("/fulfillment/options"),
    fulfill: (input: {
      sourceKind: "sales" | "depot"; orderSeries: string; orderNumber: number; lines: OperationRef[];
      mode: "warehouse" | "dropship" | "transit" | "purchase"; warehouseNo: number | null;
      supplierCode: string | null; deliveryDate: string | null; stand: boolean; requestId: string;
    }) => write<{ purchaseOrders: { series: string; number: number }[]; changedLineCount: number }>("/fulfillment", input),
    documents: (query: Record<string, string | number | undefined>) => read<OperationPage<SalesDocumentRow>>("/documents", query),
    sources: (search: string) => read<{ items: { id: string; label: string }[] }>("/documents/sources", { search }),
    source: (id: string) => read<DocumentSource>(`/documents/sources/${encodeURIComponent(id)}`),
    createDocument: (draft: DocumentDraft) => write<SalesDocumentRow>("/documents", { ...draft }),
    cancelDocument: (id: string, version: string, reason: string) => write(`/documents/${encodeURIComponent(id)}/cancel`, { version, reason, requestId: crypto.randomUUID() }),
    linkCandidates: (id: string, search: string) => read<{ items: (OperationRef & { label: string; remainingQuantity: number })[] }>(`/documents/${encodeURIComponent(id)}/link-candidates`, { search }),
    linkDocument: (id: string, version: string, lines: (OperationRef & { quantity: number })[]) => write(`/documents/${encodeURIComponent(id)}/link`, { version, lines, requestId: crypto.randomUUID() }),
    receiptOrders: (search: string, page: number) => read<OperationPage<GoodsReceiptOrder>>("/goods-receipts/orders", { search, page, pageSize: 25 }),
    receiptOrder: (id: string) => read<GoodsReceiptDetail>(`/goods-receipts/orders/${encodeURIComponent(id)}`),
    receive: (input: { orderId: string; version: string; documentNo: string; date: string; lines: (OperationRef & { quantity: number; warehouseNo: number })[]; requestId: string }) => write<{ reference: string }>("/goods-receipts", input),
    reports: (kind: OrderReportKind, query: Record<string, string | number | undefined>) => read<OperationPage<OrderReportRow>>(`/reports/${kind}`, query),
    priceDifferences: (search: string, page: number) => read<OperationPage<PriceDifferenceRequest>>("/price-differences", { search, page, pageSize: 25 }),
    requestPriceDifference: (input: { invoiceId: string; lineId: string; version: string; quantity: number; newPrice: number; reason: string; requestId: string }) => write("/price-differences", input),
    priceDifferenceSources: (search: string) => read<{ items: (OperationRef & { invoiceId: string; lineId: string; label: string; quantity: number; unitPrice: number; currency: string })[] }>("/price-differences/sources", { search }),
    priceDifferenceAction: (id: string, action: "approve" | "reject" | "invoice", input: { version: string; reason: string; requestId: string }) => write(`/price-differences/${encodeURIComponent(id)}/${action}`, input),
    print: (kind: string, reference: string, numbers?: string) => read<PrintDocument>("/print", { kind, reference, numbers }),
    shipmentActions: (planNo: number) => read<{ version: string; actions: Record<string, boolean>; reasons: string[] }>(`/shipment-plans/${planNo}/actions`),
    shipmentAction: (planNo: number, action: string, version: string, reason: string) => write(`/shipment-plans/${planNo}/${action}`, { version, reason, requestId: crypto.randomUUID() }),
    splitPlan: (planNo: number, version: string, lines: (OperationRef & { quantity: number })[]) => write(`/shipment-plans/${planNo}/split`, { version, lines, requestId: crypto.randomUUID() }),
    mergePlans: (plans: (OperationRef & { planNo: number })[]) => write("/shipment-plans/merge", { plans, requestId: crypto.randomUUID() }),
    mergeOptions: (planNos: number[]) => read<{ canMerge: boolean; reasons: string[] }>("/shipment-plans/merge-options", { planNos: planNos.join(",") }),
    commercialOptions: (series: string, number: number) => read<{ canUpdate: boolean; discountIndexes: number[]; canDuplicate: boolean }>(`/orders/${encodeURIComponent(series)}/${number}/commercial-options`),
    updateCommercial: (series: string, number: number, input: { lines: (OperationRef & { discounts: number[] })[]; dueDate: string | null }) => write(`/orders/${encodeURIComponent(series)}/${number}/commercial`, input),
    duplicate: (series: string, number: number, input: { targetSeries: string; requestId: string }) => write<{ orderSeries: string; orderNumber: number }>(`/orders/${encodeURIComponent(series)}/${number}/duplicate`, input),
    stockContext: (input: { customerCode: string; lines: { productCode: string; depotNo: number; quantity: number; unitPntr: number }[] }) => write<{ checks: { passed: boolean; message: string }[]; lines: OrderStockContextLine[] }>("/stock-context", input),
    closingPreview: (sourceKind: "sales" | "depot", lines: OperationRef[]) => write<{
      canClose: boolean; canCloseLinked: boolean; reasons: string[];
      closingReasons: { code: string; name: string }[];
      linked: { reference: string; productCode: string; remainingQuantity: number }[];
    }>("/closing/preview", { sourceKind, lines }),
    closeLines: (input: { sourceKind: "sales" | "depot"; lines: OperationRef[]; reasonCode: string; closeLinked: boolean; requestId: string }) => write("/closing", input),
  };
};
