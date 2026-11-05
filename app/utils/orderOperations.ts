import { summarize } from "./money";

// Frontend sözleşme önerileri; backend yapılacakları BEKLEYEN_API_DEGISIKLIKLERI.md'de.
export interface OperationPage<T> { items: T[]; totalCount: number; capabilities: Record<string, boolean> }
export interface OperationRef { id: string; version: string }
export interface OperationCheck { key: string; label: string; passed: boolean; message: string }
export interface OrderStockContextLine {
  productCode: string; depotNo: number; unitPntr: number;
  available: number; reserved: number; purchaseQuantity: number; unitPrice: number; discounts: number[];
}
export interface OperationEvent { id: string; action: string; fromStatus: string | null; toStatus: string | null; userName: string; occurredAt: string; reason: string | null }
export interface OperationOrder {
  orderSeries: string; orderNumber: number; customerCode: string; customerTitle: string | null;
  orderDate: string; stage: string; urgent: boolean; orderedQuantity: number;
  approvedQuantity: number; plannedQuantity: number; boxedQuantity: number;
  deliveredQuantity: number; closedQuantity: number; remainingQuantity: number;
}
export interface OperationOrderDetail {
  order: OperationOrder;
  lines: { id: string; productCode: string; productName: string | null; quantity: number; reservedQuantity: number; plannedQuantity: number; boxedQuantity: number; deliveredQuantity: number; remainingQuantity: number; status: string }[];
  documents: { id: string; kind: string; number: string; status: string; date: string }[];
  events: OperationEvent[];
}
export type FulfillmentMode = "warehouse" | "dropship" | "transit" | "purchase";
export interface FulfillmentOptions {
  capabilities: Record<FulfillmentMode, boolean>;
  warehouses: { no: number; name: string }[];
  suppliers: { code: string; name: string }[];
}
export type SalesDocumentKind = "dispatch" | "invoice";
export interface SalesDocumentRow {
  id: string; version: string; documentNumber: string; kind: SalesDocumentKind;
  date: string; customerCode: string; customerTitle: string | null; orderReference: string;
  total: number; currency: string; status: string; electronicStatus: string; error: string | null;
  canCancel: boolean; canLink: boolean;
}
export interface DocumentSourceLine extends OperationRef {
  productCode: string; productName: string | null; availableQuantity: number; unitName: string;
  unitPrice: number; discounts: number[]; taxPercent: number; orderLineId: string;
}
export interface DocumentSource {
  id: string; version: string; label: string; customerCode: string; customerTitle: string | null;
  currency: string; address: string; checks: OperationCheck[]; lines: DocumentSourceLine[];
  capabilities: { create: boolean }; warning: string | null;
  /**
   * Bu kaynaktan kesilebilecek belge türleri (madde 16): kutulanan plan için irsaliye Bitir'de
   * otomatik kesildiğinden kaynak o irsaliyedir ve yalnız `invoice` gelir; yerinden/transit gibi
   * irsaliyesi olmayan kaynaklar `dispatch` da alabilir. Gelmezse iki tür de açık kalır.
   */
  allowedKinds?: SalesDocumentKind[];
}
export interface DocumentDraftLine extends OperationRef { quantity: number; unitPrice: number; discounts: number[]; taxPercent: number }
export interface DocumentDraft {
  sourceId: string; sourceVersion: string; kind: SalesDocumentKind; series: string;
  documentDate: string; dueDate: string | null; electronicType: "automatic" | "eInvoice" | "eArchive" | "eDispatch";
  note: string; lines: DocumentDraftLine[]; acknowledgeMargin: boolean; requestId: string;
}
export interface GoodsReceiptOrder {
  id: string; version: string; reference: string; supplierCode: string; supplierTitle: string | null;
  deliveryDate: string | null; remainingQuantity: number;
}
export interface GoodsReceiptDetail {
  order: GoodsReceiptOrder; canReceive: boolean;
  warehouses: { no: number; name: string }[];
  lines: (OperationRef & { productCode: string; productName: string | null; barcode: string | null; remainingQuantity: number; unitName: string; depotNo: number })[];
}
export type OrderReportKind = "orders" | "pending" | "delivery" | "cost" | "shortages";
export const ORDER_REPORTS: { key: OrderReportKind; label: string }[] = [
  { key: "orders", label: "Sipariş Raporu" }, { key: "pending", label: "Bekleyen Siparişler" },
  { key: "delivery", label: "Teslim Durumu" }, { key: "cost", label: "Sipariş / Satış Maliyeti" },
  { key: "shortages", label: "Toplu Noksanlık" },
];
export interface OrderReportRow {
  id: string; orderReference: string; customerCode: string; customerTitle: string | null;
  productCode: string; productName: string | null; warehouseName: string | null;
  quantity: number; deliveredQuantity: number; remainingQuantity: number;
  availableStock: number | null; shortageQuantity: number | null;
  netAmount: number | null; costAmount: number | null; currency: string | null; status: string;
}
export interface PriceDifferenceRequest {
  id: string; version: string; invoiceReference: string; customerTitle: string; productCode: string;
  quantity: number; oldPrice: number; newPrice: number; currency: string; reason: string;
  status: string; requestedBy: string; requestedAt: string; canApprove: boolean; canInvoice: boolean;
}
export interface PrintDocument {
  title: string; reference: string; date: string;
  fields: { label: string; value: string }[];
  columns: { key: string; label: string }[]; rows: Record<string, string | number | null>[];
  notes: string[];
}

export const operationStatus = (err: unknown) =>
  (err as { statusCode?: number; status?: number } | null)?.statusCode
  ?? (err as { status?: number } | null)?.status ?? 0;

export const operationError = (err: unknown) => operationStatus(err) === 404
  ? "Bu işlem henüz devreye alınmadı."
  : operationStatus(err) === 409
    ? "Kayıt veya miktarlar değişti. Güncel bilgileri yükleyip tekrar kontrol edin."
    : err instanceof Error ? err.message : "İşlem tamamlanamadı.";

export function documentDraftIssue(draft: DocumentDraft, source: DocumentSource | null): string | null {
  if (!source || !source.capabilities.create) return "Belge oluşturma yetkisi veya kaynak kontrolü hazır değil.";
  if (source.checks.length === 0 || source.checks.some((check) => !check.passed)) return "Belge kontrolleri tamamlanmalı.";
  if (source.id !== draft.sourceId || source.version !== draft.sourceVersion) return "Belge kaynağı değişti. Yeniden yükleyin.";
  if (!draft.series.trim()) return "Evrak serisi girin.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.documentDate)) return "Belge tarihi seçin.";
  if (draft.dueDate && draft.dueDate < draft.documentDate) return "Vade belge tarihinden önce olamaz.";
  if (draft.kind === "invoice" && draft.electronicType === "eDispatch") return "Fatura için e-Fatura, e-Arşiv veya otomatik seçin.";
  if (draft.kind === "dispatch" && !["automatic", "eDispatch"].includes(draft.electronicType)) return "İrsaliye için e-İrsaliye veya otomatik seçin.";
  if (!draft.lines.length) return "Belgeye en az bir satır ekleyin.";
  const seen = new Set<string>();
  for (const line of draft.lines) {
    const original = source.lines.find((item) => item.id === line.id);
    if (seen.has(line.id) || !original || original.version !== line.version) return "Belge satırı geçersiz veya değişmiş.";
    seen.add(line.id);
    if (!Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > original.availableQuantity) return "Belge miktarı sıfırdan büyük olmalı ve belgelenebilir miktarı aşmamalı.";
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) return "Birim fiyat negatif olamaz.";
    if (!Number.isFinite(line.taxPercent) || line.taxPercent < 0 || line.taxPercent > 100) return "KDV oranı geçersiz.";
    if (line.discounts.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) return "İskonto %0–100 arasında olmalı.";
  }
  if (source.warning && !draft.acknowledgeMargin) return "Kâr / zarar uyarısını onaylayın.";
  return null;
}

export const documentDraftTotals = (lines: DocumentDraftLine[]) => summarize(lines.map((line) => ({
  quantity: line.quantity, unitPrice: line.unitPrice, discounts: line.discounts, taxRatePercent: line.taxPercent,
})));

export function quantitySelectionIssue(lines: { id: string; quantity: number; maximum: number }[]): string | null {
  if (!lines.length) return "En az bir satır seçin.";
  if (new Set(lines.map((line) => line.id)).size !== lines.length) return "Aynı satır birden fazla seçilemez.";
  return lines.some((line) => !Number.isFinite(line.quantity) || !Number.isFinite(line.maximum)
    || line.quantity <= 0 || line.quantity > line.maximum)
    ? "Miktar sıfırdan büyük olmalı ve kalan miktarı aşmamalı." : null;
}

/** Excel formül enjeksiyonunu engeller; dışa aktarma yalnız ekranda yüklenen kayıtları içerir. */
export function operationCsv(columns: { label: string; key: string }[], rows: Record<string, unknown>[]): string {
  const cell = (value: unknown) => {
    const raw = String(value ?? "");
    const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + [columns.map((column) => cell(column.label)).join(";"),
    ...rows.map((row) => columns.map((column) => cell(row[column.key])).join(";"))].join("\r\n");
}
