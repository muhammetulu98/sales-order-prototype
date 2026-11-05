import ExcelJS from "exceljs";
import { formatDate } from "./dates";
import { formatMoney, formatQuantity } from "./money";
import {
  documentNumber,
  fullDocumentTypeLabel,
  statementFileBaseName,
  type Statement,
  type StatementRow,
} from "./customerStatement";

// Cari ekstresi dışa aktarımı. "Detaylı" seçenekte her evrağın stok kalemleri evrak satırının
// hemen altına aynı sayfada yazılır (B2B'de ayrı sayfa denendi, gözden kaçıyordu).

export interface StatementExportContext {
  customer: { code: string; title: string | null };
  statement: Statement;
  /** Başlıkta görünen filtre özeti, ör. ["Tarih: 01.01.2026 – 31.03.2026", "Tip: Fatura"]. */
  filterSummary: string[];
  detailed: boolean;
}

const HEADERS = ["Tarih", "Evrak", "Belge", "Tip", "Cinsi", "Açıklama", "Vade", "Borç", "Alacak", "Bakiye"];
const STOCK_HEADERS = ["Stok Kodu", "Stok Adı", "Miktar", "Birim", "B.Fiyat", "İsk 1", "İsk 2", "İsk 3", "İsk 4", "Net B.Fiyat", "Net Tutar"];

const MONEY_FORMAT = "#,##0.00";

const title = (context: StatementExportContext) => (context.detailed ? "Detaylı Cari Ekstre" : "Cari Ekstre");

const dateCell = (value: string | null) => (value ? formatDate(value) : "");

export const buildStatementWorkbookBuffer = async (context: StatementExportContext): Promise<ArrayBuffer> => {
  const { customer, statement } = context;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ekstre");
  sheet.columns = [
    { width: 12 }, { width: 16 }, { width: 16 }, { width: 24 }, { width: 18 },
    { width: 40 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 },
  ];

  sheet.addRow([title(context)]).font = { bold: true, size: 14 };
  sheet.addRow([customer.title ?? customer.code]).font = { bold: true };
  sheet.addRow([customer.code]);
  for (const line of context.filterSummary) sheet.addRow([line]);
  sheet.addRow([`Hareket sayısı: ${statement.transactionCount}`]);
  sheet.addRow([]);

  const header = sheet.addRow(HEADERS);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDED" } };
  });

  for (const row of statement.rows) {
    const line = sheet.addRow([
      dateCell(row.transactionDate),
      documentNumber(row) ?? "",
      row.referenceNo ?? "",
      fullDocumentTypeLabel(row),
      row.typeName ?? "",
      row.description ?? "",
      dateCell(row.dueDate),
      row.debit || null,
      row.credit || null,
      row.runningBalance,
    ]);
    for (const index of [8, 9, 10]) line.getCell(index).numFmt = MONEY_FORMAT;
    if (row.isOpening) line.font = { italic: true };

    if (context.detailed && row.stockLines.length) {
      const stockHeader = sheet.addRow(["", ...STOCK_HEADERS]);
      stockHeader.font = { bold: true, size: 9, color: { argb: "FF666666" } };
      for (const stock of row.stockLines) {
        const stockLine = sheet.addRow([
          "",
          stock.stockCode,
          stock.stockName ?? "",
          stock.quantity,
          stock.unitName ?? "",
          stock.unitPrice,
          stock.discount1 || null,
          stock.discount2 || null,
          stock.discount3 || null,
          stock.discount4 || null,
          stock.netUnitPrice,
          stock.netAmount,
        ]);
        stockLine.font = { size: 9 };
        for (const index of [6, 7, 8, 9, 10, 11, 12]) stockLine.getCell(index).numFmt = MONEY_FORMAT;
      }
    }
  }

  const total = sheet.addRow(["Dönem Toplamı", "", "", "", "", "", "", statement.totalDebit, statement.totalCredit, statement.closingBalance]);
  total.font = { bold: true };
  for (const index of [8, 9, 10]) total.getCell(index).numFmt = MONEY_FORMAT;

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};

const triggerBrowserDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadXlsxBuffer = (buffer: ArrayBuffer, fileName: string) => {
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBrowserDownload(blob, fileName);
};

export const downloadStatementWorkbook = async (context: StatementExportContext) => {
  downloadXlsxBuffer(
    await buildStatementWorkbookBuffer(context),
    `${statementFileBaseName(context.customer, context.detailed)}.xlsx`,
  );
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (value: number | null) => (value ? formatMoney(value) : "—");

const stockLinesHtml = (row: StatementRow) => {
  const lines = row.stockLines
    .map(
      (stock) => `<tr>
        <td>${escapeHtml(stock.stockCode)}</td>
        <td>${escapeHtml(stock.stockName ?? "—")}</td>
        <td class="num">${escapeHtml(`${formatQuantity(stock.quantity)} ${stock.unitName ?? ""}`.trim())}</td>
        <td class="num">${escapeHtml(formatMoney(stock.unitPrice))}</td>
        <td class="num">${escapeHtml(money(stock.discount1))}</td>
        <td class="num">${escapeHtml(money(stock.discount2))}</td>
        <td class="num">${escapeHtml(money(stock.discount3))}</td>
        <td class="num">${escapeHtml(money(stock.discount4))}</td>
        <td class="num">${escapeHtml(formatMoney(stock.netUnitPrice))}</td>
        <td class="num">${escapeHtml(formatMoney(stock.netAmount))}</td>
      </tr>`,
    )
    .join("");
  return `<tr class="stock-row"><td colspan="10"><table class="stock">
    <thead><tr><th>Stok Kodu</th><th>Stok Adı</th><th class="num">Miktar</th><th class="num">B.Fiyat</th>
    <th class="num">İsk 1</th><th class="num">İsk 2</th><th class="num">İsk 3</th><th class="num">İsk 4</th>
    <th class="num">Net B.Fiyat</th><th class="num">Net Tutar</th></tr></thead>
    <tbody>${lines}</tbody></table></td></tr>`;
};

/** Yazdırma penceresinin HTML'i (tarayıcının "PDF olarak kaydet"i ile PDF'e döner). */
export const buildStatementPrintHtml = (context: StatementExportContext) => {
  const { customer, statement } = context;
  const rows = statement.rows
    .map(
      (row) => `<tr${row.isOpening ? ' class="opening"' : ""}>
        <td>${escapeHtml(dateCell(row.transactionDate))}</td>
        <td>${escapeHtml(documentNumber(row) ?? "—")}</td>
        <td>${escapeHtml(row.referenceNo ?? "—")}</td>
        <td>${escapeHtml(fullDocumentTypeLabel(row))}</td>
        <td>${escapeHtml(row.typeName ?? "—")}</td>
        <td>${escapeHtml(row.description ?? "—")}</td>
        <td>${escapeHtml(dateCell(row.dueDate) || "—")}</td>
        <td class="num">${escapeHtml(money(row.debit))}</td>
        <td class="num">${escapeHtml(money(row.credit))}</td>
        <td class="num">${escapeHtml(formatMoney(row.runningBalance))}</td>
      </tr>${context.detailed && row.stockLines.length ? stockLinesHtml(row) : ""}`,
    )
    .join("");

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(`${title(context)} - ${customer.title ?? customer.code}`)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; color: #1a1a1a; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
  header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d4d4d4; padding-bottom: 12px; margin-bottom: 14px; }
  h1 { margin: 0 0 6px; font-size: 18px; }
  .muted { color: #666; }
  .meta { text-align: right; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #efefef; font-weight: 700; text-align: left; }
  th, td { border: 1px solid #d4d4d4; padding: 5px 6px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr.opening td { font-style: italic; background: #f7f7f7; }
  tfoot td { background: #efefef; font-weight: 700; }
  .stock-row > td { border-top: none; padding: 0 6px 8px 24px; }
  table.stock { font-size: 10px; }
  table.stock th { background: #f5f5f5; color: #666; font-weight: 600; }
  table.stock th, table.stock td { border-color: #e5e5e5; padding: 3px 5px; }
  @page { size: A4 landscape; margin: 10mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<header>
  <div>
    <h1>${escapeHtml(title(context))}</h1>
    <div><strong>${escapeHtml(customer.title ?? customer.code)}</strong></div>
    <div class="muted">${escapeHtml(customer.code)}</div>
  </div>
  <div class="meta muted">
    ${context.filterSummary.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
    <div>Hareket sayısı: ${escapeHtml(statement.transactionCount)}</div>
  </div>
</header>
<table>
  <thead><tr>${HEADERS.map((label, index) => `<th${index >= 7 ? ' class="num"' : ""}>${label}</th>`).join("")}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr>
    <td colspan="7">Dönem Toplamı</td>
    <td class="num">${escapeHtml(formatMoney(statement.totalDebit))}</td>
    <td class="num">${escapeHtml(formatMoney(statement.totalCredit))}</td>
    <td class="num">${escapeHtml(formatMoney(statement.closingBalance))}</td>
  </tr></tfoot>
</table>
</body>
</html>`;
};

/** Yeni pencerede yazdırma diyaloğunu açar. Açılamazsa (pop-up engeli) false döner. */
export const printStatement = (context: StatementExportContext) => {
  const printWindow = window.open("", "_blank", "width=1100,height=900");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(buildStatementPrintHtml(context));
  printWindow.document.close();
  const trigger = () => {
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.readyState === "complete") setTimeout(trigger, 250);
  else printWindow.addEventListener("load", () => setTimeout(trigger, 250), { once: true });
  return true;
};
