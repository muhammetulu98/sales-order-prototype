import type { ErpOrderApproval, ErpOrderApprovalLine } from "~/composables/useErpOrderApprovals";
import { formatDate } from "./dates";
import { formatMoney, formatQuantity } from "./money";
import { lineTotalInclVat, lineNetUnit, sumBy } from "./orderApprovalCalc";

// Satış Sipariş Onaylama → PDF: A4 yatay sipariş çıktısı, tarayıcının yazdır penceresiyle
// PDF olarak kaydedilir (cari ekstresiyle aynı yöntem).

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const discountText = (discounts: readonly number[]) =>
  discounts.filter(Boolean).map((value) => `%${formatQuantity(value)}`).join(" + ") || "—";

export const buildOrderPrintHtml = (
  order: ErpOrderApproval,
  lines: readonly ErpOrderApprovalLine[],
  shippingAddressName: string | null,
) => {
  const unitName = (line: ErpOrderApprovalLine) => line.units.find((unit) => unit.slot === line.unitSlot)?.name ?? "";
  const rows = lines
    .map(
      (line, index) => `<tr>
        <td>${index + 1}</td>
        <td><b>${escapeHtml(line.productName ?? line.productCode)}</b><div class="sub">${escapeHtml(line.productCode)}</div></td>
        <td class="r">${escapeHtml(formatQuantity(line.quantity))}</td>
        <td>${escapeHtml(unitName(line))}</td>
        <td class="r">${escapeHtml(formatMoney(line.unitPrice))}</td>
        <td>${escapeHtml(discountText(line.discounts))}</td>
        <td class="r">%${escapeHtml(line.vatRate)}</td>
        <td class="r">${escapeHtml(formatMoney(lineNetUnit(line)))}</td>
        <td class="r"><b>${escapeHtml(formatMoney(lineTotalInclVat(line)))}</b></td>
      </tr>${line.note ? `<tr class="note"><td></td><td colspan="8">Not: ${escapeHtml(line.note)}</td></tr>` : ""}`,
    )
    .join("");
  const notes = order.notes
    .map((text, index) => ({ no: index + 1, text: text.trim() }))
    .filter((item) => item.text)
    .map((item) => `<div><span>${item.no}.</span> ${escapeHtml(item.text)}</div>`)
    .join("");
  const place = [order.province, order.district].filter(Boolean).join(" / ");
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8" />
<title>Satis-Siparisi-${escapeHtml(order.orderSeries)}-${escapeHtml(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; color: #1a1a1a; font: 11px/1.4 Arial, Helvetica, sans-serif; }
  header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 12px; }
  h1 { margin: 0; font-size: 18px; } .no { font: 600 14px monospace; } .muted { color: #666; }
  .grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr; gap: 8px 16px; margin-bottom: 12px; }
  .grid span { display: block; color: #666; font-size: 10px; } .grid em { display: block; color: #666; font-style: normal; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #efefef; text-align: left; } th, td { border: 1px solid #d4d4d4; padding: 4px 6px; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .sub { color: #666; font-size: 10px; } tr.note td { color: #555; font-style: italic; border-top: none; }
  tfoot td { background: #efefef; font-weight: 700; }
  .notes { margin-top: 12px; } .notes h2 { font-size: 12px; margin: 0 0 4px; } .notes span { color: #666; }
  @page { size: A4 landscape; margin: 10mm; } @media print { body { padding: 0; } }
</style></head><body>
<header><div><h1>Satış Siparişi</h1><div class="no">${escapeHtml(order.orderSeries)}-${escapeHtml(order.orderNumber)}</div></div>
<div class="muted">Yazdırma: ${escapeHtml(new Date().toLocaleDateString("tr-TR"))}</div></header>
<section class="grid">
  <div><span>Cari</span><b>${escapeHtml(order.customerTitle ?? order.customerCode)}</b><em>${escapeHtml(order.customerCode)}${place ? ` · ${escapeHtml(place)}` : ""}${shippingAddressName ? ` · ${escapeHtml(shippingAddressName)}` : ""}</em></div>
  <div><span>Sipariş tarihi</span><b>${escapeHtml(formatDate(order.orderDate))}</b></div>
  <div><span>Teslim</span><b>${escapeHtml(formatDate(order.deliveryDate))}</b><em>${escapeHtml(order.deliveryType ?? "")}</em></div>
  <div><span>Temsilci</span><b>${escapeHtml(order.representativeName ?? "—")}</b><em>Plasiyer: ${escapeHtml(order.salesRepName ?? "—")}</em></div>
  <div><span>Tahsilat</span><b>${escapeHtml(order.collectionType ?? "—")}</b></div>
  <div><span>Proje kodu</span><b>${escapeHtml(order.projectCode ?? "—")}</b></div>
</section>
<table>
  <thead><tr><th>#</th><th>Stok</th><th class="r">Miktar</th><th>Birim</th><th class="r">Birim Fiyat</th><th>İskonto</th><th class="r">KDV</th><th class="r">Net B. Fiyat (KDV D.)</th><th class="r">Net Tutar</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="8" class="r">Net Tutar (KDV dahil)</td><td class="r">${escapeHtml(formatMoney(sumBy(lines, lineTotalInclVat)))}</td></tr></tfoot>
</table>
${notes ? `<section class="notes"><h2>Evrak Açıklamaları</h2>${notes}</section>` : ""}
</body></html>`;
};

/** Yeni pencerede yazdırma diyaloğunu açar; açılamazsa (pop-up engeli) false. */
export const openPrintWindow = (html: string) => {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  const trigger = () => {
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.readyState === "complete") setTimeout(trigger, 250);
  else printWindow.addEventListener("load", () => setTimeout(trigger, 250), { once: true });
  return true;
};
