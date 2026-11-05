import type { ErpOrderApproval } from "~/composables/useErpOrderApprovals";
import { formatMoney as money } from "./money";
import { dayDiff, limitState } from "./orderApprovalCalc";

// Satış Sipariş Onaylama — iki tablonun sütun tanımları, hücre/sıralama değerleri ve
// kullanıcının sütun düzeninin (sıra + görünürlük) tarayıcıda saklanması.

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  align?: "right";
  mono?: boolean;
}

export const ORDER_COLUMNS = (): ColumnDef[] => [
  { key: "no", label: "Seri-Sıra", visible: true, mono: true },
  { key: "orderDate", label: "Sipariş Tarihi", visible: true, mono: true },
  { key: "customerCode", label: "Cari Kod", visible: false, mono: true },
  { key: "customerTitle", label: "Cari Unvan", visible: true },
  { key: "projectCode", label: "Proje", visible: true, mono: true },
  { key: "deliveryType", label: "Teslim Türü", visible: true },
  { key: "deliveryDate", label: "Teslim Tarihi", visible: true, mono: true },
  { key: "representativeName", label: "Temsilci", visible: true },
  { key: "salesRepName", label: "Plasiyer", visible: false },
  { key: "province", label: "İl", visible: true },
  { key: "district", label: "İlçe", visible: false },
  { key: "collectionType", label: "Tahsilat", visible: false },
  { key: "lineCount", label: "Satır", visible: true, align: "right", mono: true },
  { key: "netTotal", label: "Net Tutar", visible: true, align: "right", mono: true },
  { key: "note0", label: "Evrak Açıklama 1", visible: true },
  { key: "note8", label: "Evrak Açıklama 9", visible: true },
  { key: "createdByName", label: "Oluşturan Kullanıcı", visible: false },
  { key: "createdAt", label: "Oluşturma Zamanı", visible: false, mono: true },
  { key: "updatedByName", label: "Son Değiştiren", visible: false },
  { key: "updatedAt", label: "Son Değişiklik Zamanı", visible: false, mono: true },
  { key: "approvedByName", label: "Onaylayan", visible: false },
  { key: "approvedAt", label: "Onay Zamanı", visible: false, mono: true },
  { key: "waitingDays", label: "Bekleme (gün)", visible: false, align: "right", mono: true },
  { key: "daysToDelivery", label: "Teslime Kalan (gün)", visible: false, align: "right", mono: true },
  { key: "channel", label: "Satış Kanalı", visible: false },
  { key: "orderType", label: "Sipariş Tipi", visible: false },
  { key: "region", label: "Bölge", visible: false },
  { key: "customerGroup", label: "Cari Grubu", visible: false },
  { key: "priceListName", label: "Fiyat Listesi", visible: false },
  { key: "paymentDays", label: "Ödeme Vadesi (gün)", visible: false, align: "right", mono: true },
  { key: "currency", label: "Para Birimi", visible: false },
  { key: "totalQuantity", label: "Toplam Miktar", visible: false, align: "right", mono: true },
  { key: "grossTotal", label: "Ham Tutar", visible: false, align: "right", mono: true },
  { key: "discountTotal", label: "İskonto Tutarı", visible: false, align: "right", mono: true },
  { key: "exVatTotal", label: "KDV Hariç Tutar", visible: false, align: "right", mono: true },
  { key: "vatTotal", label: "KDV Tutarı", visible: false, align: "right", mono: true },
  { key: "creditLimit", label: "Cari Limiti", visible: false, align: "right", mono: true },
  { key: "creditRisk", label: "Cari Riski", visible: false, align: "right", mono: true },
  { key: "remainingLimit", label: "Kalan Limit", visible: false, align: "right", mono: true },
  { key: "limitUsage", label: "Limit Kullanımı %", visible: false, align: "right", mono: true },
];

export const LINE_COLUMNS = (): ColumnDef[] => [
  { key: "product", label: "Stok", visible: true },
  { key: "quantity", label: "Miktar", visible: true, align: "right" },
  { key: "unit", label: "Birim", visible: true },
  { key: "listPrice", label: "Liste Fiyatı", visible: true, align: "right", mono: true },
  { key: "unitPrice", label: "Birim Fiyat", visible: true, align: "right", mono: true },
  { key: "discount0", label: "İsk 1", visible: true, align: "right" },
  { key: "discount1", label: "İsk 2", visible: true, align: "right" },
  { key: "discount2", label: "İsk 3", visible: true, align: "right" },
  { key: "discount3", label: "İsk 4", visible: true, align: "right" },
  { key: "vatRate", label: "KDV", visible: true, align: "right", mono: true },
  { key: "netUnit", label: "Net B. Fiyat (KDV D.)", visible: true, align: "right" },
  { key: "net", label: "Net Tutar", visible: true, align: "right", mono: true },
  { key: "note", label: "Satır Açıklaması", visible: true },
  { key: "productCode", label: "Stok Kodu", visible: false, mono: true },
  { key: "discountRate", label: "Toplam İskonto %", visible: false, align: "right", mono: true },
  { key: "gross", label: "Ham Tutar", visible: false, align: "right", mono: true },
  { key: "exVat", label: "KDV Hariç Tutar", visible: false, align: "right", mono: true },
  { key: "vat", label: "KDV Tutarı", visible: false, align: "right", mono: true },
  { key: "dueDate", label: "Vade", visible: true, mono: true },
];

const number = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
const day = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join(".") : "—");
const stamp = (iso: string | null) => (iso ? `${day(iso)} ${iso.slice(11, 16)}`.trim() : "—");

/** Listede gösterilecek metin (düzenlenebilir hücreler — teslim türü, açıklamalar — şablonda). */
export const orderCellText = (order: ErpOrderApproval, key: string, today: string): string => {
  const limit = limitState(order.creditLimit, order.creditRisk, order.netTotal);
  switch (key) {
    case "no": return `${order.orderSeries}-${order.orderNumber}`;
    case "orderDate": return day(order.orderDate);
    case "deliveryDate": return day(order.deliveryDate);
    case "lineCount": return String(order.lineCount);
    case "createdAt": return stamp(order.createdAt);
    case "updatedAt": return stamp(order.updatedAt);
    case "approvedAt": return stamp(order.approvedAt);
    case "waitingDays": return String(dayDiff(today, (order.createdAt ?? order.orderDate ?? today).slice(0, 10)));
    case "daysToDelivery": return order.deliveryDate ? String(dayDiff(order.deliveryDate, today)) : "—";
    case "paymentDays": return order.paymentDays ? String(order.paymentDays) : order.paymentDays === 0 ? "Peşin" : "—";
    case "totalQuantity": return number(order.totalQuantity);
    case "netTotal":
    case "grossTotal":
    case "discountTotal":
    case "exVatTotal":
    case "vatTotal":
    case "creditLimit":
    case "creditRisk":
      return money(order[key]);
    case "remainingLimit": return money(limit.remaining);
    case "limitUsage": return limit.usagePercent === null ? "—" : `%${number(limit.usagePercent)}`;
    default: {
      const value = (order as unknown as Record<string, unknown>)[key];
      return value === null || value === undefined || value === "" ? "—" : String(value);
    }
  }
};

/** Sıralama değeri: sayılar sayı, tarih ve metinler metin olarak karşılaştırılır. */
export const orderSortValue = (order: ErpOrderApproval, key: string, today: string): string | number => {
  const limit = limitState(order.creditLimit, order.creditRisk, order.netTotal);
  switch (key) {
    case "no": return `${order.orderSeries}-${String(order.orderNumber).padStart(8, "0")}`;
    case "lineCount": return order.lineCount;
    case "waitingDays": return dayDiff(today, (order.createdAt ?? order.orderDate ?? today).slice(0, 10));
    case "daysToDelivery": return order.deliveryDate ? dayDiff(order.deliveryDate, today) : Number.POSITIVE_INFINITY;
    case "remainingLimit": return limit.remaining ?? Number.NEGATIVE_INFINITY;
    case "limitUsage": return limit.usagePercent ?? -1;
    default: {
      if (key.startsWith("note")) return order.notes[Number(key.slice(4))] ?? "";
      const value = (order as unknown as Record<string, unknown>)[key];
      return typeof value === "number" ? value : String(value ?? "");
    }
  }
};

export const compareSortValues = (a: string | number, b: string | number) =>
  typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "tr", { numeric: true });

/**
 * Kayıtlı sıra ve görünürlüğü uygular; kayıtta olmayan (sonradan eklenen) sütunlar varsayılan
 * görünürlükleriyle sona eklenir, kayıtta olup artık tanımlı olmayanlar atlanır.
 */
export const applySavedLayout = (columns: ColumnDef[], saved: readonly (readonly [string, boolean])[] | null | undefined) => {
  if (!saved?.length) return columns;
  const result: ColumnDef[] = [];
  for (const [key, visible] of saved) {
    const column = columns.find((candidate) => candidate.key === key);
    if (column && !result.includes(column)) result.push({ ...column, visible });
  }
  for (const column of columns) if (!result.some((item) => item.key === column.key)) result.push(column);
  return result;
};

export const layoutOf = (columns: readonly ColumnDef[]) => columns.map((column) => [column.key, column.visible] as const);

export const moveColumn = <T>(list: readonly T[], from: number, to: number) => {
  if (from === to || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};
