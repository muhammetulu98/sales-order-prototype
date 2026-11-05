import ExcelJS from "exceljs";
import type {
  ErpEInvoice,
  ErpEInvoiceDirection,
  ErpEInvoiceDocumentType,
  ErpEInvoiceStatus,
} from "~/composables/useErpCustomers";
import { formatDate } from "./dates";

// Cari kartı → e-Fatura sekmesi: etiketler, süzme ve seçili kayıtların Excel'i.
// B2B karşılığı pages/customers/[code].vue efatura sekmesi (useEFaturaIslemleri).

export const E_INVOICE_DOCUMENT_TYPE_LABELS: Record<ErpEInvoiceDocumentType, string> = {
  eInvoice: "e-Fatura",
  eArchive: "e-Arşiv",
  eDispatch: "e-İrsaliye",
};

export const E_INVOICE_STATUS_LABELS: Record<ErpEInvoiceStatus, string> = {
  pending: "Bekliyor",
  sent: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  cancelled: "İptal",
  failed: "Hatalı",
};

export type EInvoiceBadgeVariant = "pending" | "secondary" | "delivered" | "destructive";

export const eInvoiceStatusVariant = (status: ErpEInvoiceStatus): EInvoiceBadgeVariant => {
  if (status === "pending") return "pending";
  if (status === "accepted") return "delivered";
  if (status === "rejected" || status === "failed" || status === "cancelled") return "destructive";
  return "secondary";
};

export const eInvoiceKey = (invoice: Pick<ErpEInvoice, "documentSeries" | "documentSequence">) =>
  `${invoice.documentSeries}-${invoice.documentSequence}`;

export interface EInvoiceFilter {
  direction: ErpEInvoiceDirection;
  search?: string;
  startDate?: string | null;
  endDate?: string | null;
}

/** Filtre tarihi: fatura tarihi, yoksa oluşturma tarihi. */
const filterDay = (invoice: ErpEInvoice) => (invoice.invoiceDate ?? invoice.createdAt ?? "").slice(0, 10);

export const filterEInvoices = (invoices: readonly ErpEInvoice[], filter: EInvoiceFilter) => {
  const query = (filter.search ?? "").trim().toLocaleLowerCase("tr");
  return invoices
    .filter((invoice) => invoice.direction === filter.direction)
    .filter((invoice) => {
      const day = filterDay(invoice);
      if (filter.startDate && (!day || day < filter.startDate)) return false;
      if (filter.endDate && (!day || day > filter.endDate)) return false;
      if (!query) return true;
      return [eInvoiceKey(invoice), invoice.invoiceNumber, invoice.ettn]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("tr").includes(query));
    })
    .sort((a, b) => filterDay(b).localeCompare(filterDay(a)));
};

export const countByDirection = (invoices: readonly ErpEInvoice[]) => ({
  outgoing: invoices.filter((invoice) => invoice.direction === "outgoing").length,
  incoming: invoices.filter((invoice) => invoice.direction === "incoming").length,
});

export const buildEInvoiceWorkbookBuffer = async (
  customer: { code: string; title: string | null },
  invoices: readonly ErpEInvoice[],
): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("e-Faturalar");
  sheet.columns = [{ width: 16 }, { width: 22 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 8 }, { width: 14 }, { width: 38 }];
  sheet.addRow([customer.title ?? customer.code]).font = { bold: true };
  sheet.addRow([customer.code]);
  sheet.addRow([]);
  const header = sheet.addRow(["Evrak", "Fatura No", "Tip", "Fatura Tarihi", "Oluşturma", "Gönderim", "Tutar", "Döviz", "Durum", "ETTN"]);
  header.font = { bold: true };
  for (const invoice of invoices) {
    const row = sheet.addRow([
      eInvoiceKey(invoice),
      invoice.invoiceNumber ?? "",
      E_INVOICE_DOCUMENT_TYPE_LABELS[invoice.documentType],
      invoice.invoiceDate ? formatDate(invoice.invoiceDate) : "",
      invoice.createdAt ? formatDate(invoice.createdAt) : "",
      invoice.sentAt ? formatDate(invoice.sentAt) : "",
      invoice.amount,
      invoice.currency,
      E_INVOICE_STATUS_LABELS[invoice.status],
      invoice.ettn ?? "",
    ]);
    row.getCell(7).numFmt = "#,##0.00";
  }
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};
