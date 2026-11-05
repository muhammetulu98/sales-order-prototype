import * as XLSX from "xlsx";
import type { BonusPeriod, PurchaseTermType } from "~/composables/useSupplierPurchaseConditions";
import { localIsoDate } from "./dates";
import { parseDecimal } from "./money";

// Backend Api/Endpoints/SupplierPurchaseConditionEndpoints.cs (BuildContractSheet/
// BuildContractProductsSheet) tarafından üretilen sözleşme şablonunun sabit hücre
// konumlarını okur. İki taraf da aynı planla (bkz. docs/superpowers/plans/
// 2026-09-09-purchase-condition-contract-template.md) değiştirilmeli.

export interface ParsedTemplateHeader {
  supplierCode: string;
  supplierName: string;
  paymentTermType: PurchaseTermType;
  paymentTermDays: number | null;
  paymentTermFixedDate: string | null;
  validFrom: string;
  isActive: boolean;
  purchaseDiscount1Percent: number | null;
  purchaseDiscount2Percent: number | null;
  purchaseDiscount3Percent: number | null;
  purchaseDiscount4Percent: number | null;
  purchaseDiscount5Percent: number | null;
  purchaseDiscount6Percent: number | null;
  campaignDiscountPercent: number | null;
  insertDiscountPercent: number | null;
  shippingIncluded: boolean;
  shippingDiscountPercent: number | null;
  defectiveProductBudgetPercent: number | null;
  hasReturnRight: boolean;
  yearEndBonusPercent: number | null;
  yearEndBonusPeriod: BonusPeriod | null;
  yearEndDiscountPercent: number | null;
  turnoverBonusPercent: number | null;
  turnoverBonusPeriod: BonusPeriod | null;
  staffBonusPercent: number | null;
  staffBonusPeriod: BonusPeriod | null;
  /** Şablondan kaldırıldı (Depo No alanı yok artık); backend her zaman null alır (tüm depolar). */
  depotNo: number | null;
  projectCode: string | null;
}

export interface ParsedTemplateProductRow {
  rowNo: number;
  stockCode: string;
  discount1Percent: number | null;
  discount2Percent: number | null;
  discount3Percent: number | null;
  discount4Percent: number | null;
  discount5Percent: number | null;
  discount6Percent: number | null;
}

export interface ParsedPurchaseConditionTemplate {
  header: ParsedTemplateHeader;
  products: ParsedTemplateProductRow[];
  errors: string[];
}

const textOf = (sheet: XLSX.WorkSheet, cellRef: string): string => {
  const cell = sheet[cellRef] as { w?: string; v?: unknown } | undefined;
  if (!cell) return "";
  return (cell.w ?? cell.v ?? "").toString().trim();
};

const percentOf = (sheet: XLSX.WorkSheet, cellRef: string): number | null => {
  const raw = textOf(sheet, cellRef).replace(/%/g, "");
  return parseDecimal(raw);
};

const boolOf = (sheet: XLSX.WorkSheet, cellRef: string, defaultValue: boolean): boolean => {
  const raw = textOf(sheet, cellRef).toLocaleLowerCase("tr");
  if (!raw) return defaultValue;
  return raw.startsWith("evet") || raw.startsWith("dahil") || raw === "e";
};

const periodOf = (sheet: XLSX.WorkSheet, cellRef: string): BonusPeriod | null => {
  const raw = textOf(sheet, cellRef).toLocaleLowerCase("tr");
  if (raw.startsWith("ayl")) return "Monthly";
  if (raw.startsWith("çeyr") || raw.startsWith("ceyr")) return "Quarterly";
  if (raw.startsWith("yıl") || raw.startsWith("yil")) return "Yearly";
  return null;
};

/**
 * B5 (Tedarikçi) ve B27 (Proje) artık Excel'in kendi içindeki açılır listeden "KOD - AD"
 * biçiminde seçiliyor (bkz. backend BuildLabelLookupSheet). Elle sadece kod girilmesi de
 * desteklenir.
 */
const parseCodeNameCell = (raw: string): { code: string; name: string } => {
  const trimmed = raw.trim();
  const separatorIndex = trimmed.indexOf(" - ");
  if (separatorIndex === -1) return { code: trimmed, name: "" };
  return {
    code: trimmed.slice(0, separatorIndex).trim(),
    name: trimmed.slice(separatorIndex + 3).trim(),
  };
};

/** GG.AA.YYYY -> YYYY-MM-DD (ISO); parse edilemezse null. */
const isoDateOf = (raw: string): string | null => {
  const match = raw.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) return null;
  const [, day = "", month = "", year = ""] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const parsePercentCell = (cells: unknown[], col: number): number | null => {
  const raw = (cells[col] ?? "").toString().trim().replace(/%/g, "");
  return parseDecimal(raw);
};

export const parsePurchaseConditionTemplate = (buffer: ArrayBuffer): ParsedPurchaseConditionTemplate => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const errors: string[] = [];

  const contractSheet = workbook.Sheets["Sözleşme"];
  const productsSheet = workbook.Sheets["Ürünler"];
  if (!contractSheet) errors.push('Şablonda "Sözleşme" sayfası bulunamadı.');

  const supplierCell = contractSheet ? parseCodeNameCell(textOf(contractSheet, "B5")) : { code: "", name: "" };
  const supplierCode = supplierCell.code;
  if (!supplierCode) errors.push("Tedarikçi Kodu (Sözleşme sayfası, B5) boş olamaz.");

  const termTypeRaw = contractSheet ? textOf(contractSheet, "B8").toLocaleLowerCase("tr") : "";
  const paymentTermType: PurchaseTermType = termTypeRaw.startsWith("tarih") ? "FixedDate" : "Days";
  const termValue = contractSheet ? textOf(contractSheet, "D8") : "";
  const paymentTermDays =
    paymentTermType === "Days" && termValue ? Number.parseInt(termValue, 10) || null : null;
  const paymentTermFixedDate = paymentTermType === "FixedDate" ? isoDateOf(termValue) : null;

  const validFromRaw = contractSheet ? textOf(contractSheet, "B9") : "";
  const validFrom = isoDateOf(validFromRaw) ?? localIsoDate();

  const projectCell = contractSheet ? parseCodeNameCell(textOf(contractSheet, "B28")) : { code: "", name: "" };

  const header: ParsedTemplateHeader = {
    supplierCode,
    supplierName: supplierCell.name,
    paymentTermType,
    paymentTermDays,
    paymentTermFixedDate,
    validFrom,
    isActive: contractSheet ? boolOf(contractSheet, "D9", true) : true,
    purchaseDiscount1Percent: contractSheet ? percentOf(contractSheet, "B12") : null,
    purchaseDiscount2Percent: contractSheet ? percentOf(contractSheet, "B13") : null,
    purchaseDiscount3Percent: contractSheet ? percentOf(contractSheet, "B14") : null,
    purchaseDiscount4Percent: contractSheet ? percentOf(contractSheet, "B15") : null,
    // İsk5-6 artık şablonda yok (yalnızca İsk1-4, sol sütunda alt alta).
    purchaseDiscount5Percent: null,
    purchaseDiscount6Percent: null,
    campaignDiscountPercent: contractSheet ? percentOf(contractSheet, "B18") : null,
    insertDiscountPercent: contractSheet ? percentOf(contractSheet, "D18") : null,
    shippingIncluded: contractSheet ? boolOf(contractSheet, "B19", false) : false,
    shippingDiscountPercent: contractSheet ? percentOf(contractSheet, "D19") : null,
    defectiveProductBudgetPercent: contractSheet ? percentOf(contractSheet, "B20") : null,
    hasReturnRight: contractSheet ? boolOf(contractSheet, "D20", false) : false,
    yearEndBonusPercent: contractSheet ? percentOf(contractSheet, "B23") : null,
    yearEndBonusPeriod: contractSheet ? periodOf(contractSheet, "D23") : null,
    yearEndDiscountPercent: contractSheet ? percentOf(contractSheet, "D12") : null,
    turnoverBonusPercent: contractSheet ? percentOf(contractSheet, "B24") : null,
    turnoverBonusPeriod: contractSheet ? periodOf(contractSheet, "D24") : null,
    staffBonusPercent: contractSheet ? percentOf(contractSheet, "B25") : null,
    staffBonusPeriod: contractSheet ? periodOf(contractSheet, "D25") : null,
    // Depo No alanı şablondan kaldırıldı — backend null'u "tüm depolar" olarak yorumluyor.
    depotNo: null,
    projectCode: projectCell.code || null,
  };

  const hasAnyHeaderDiscount = [
    header.purchaseDiscount1Percent,
    header.purchaseDiscount2Percent,
    header.purchaseDiscount3Percent,
    header.purchaseDiscount4Percent,
    header.purchaseDiscount5Percent,
    header.purchaseDiscount6Percent,
  ].some((value) => value !== null);

  const products: ParsedTemplateProductRow[] = [];
  if (productsSheet) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(productsSheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    for (let i = 1; i < matrix.length; i++) {
      const cells = matrix[i] ?? [];
      const stockCode = (cells[0] ?? "").toString().trim();
      if (!stockCode) continue;
      products.push({
        rowNo: i + 1,
        stockCode,
        discount1Percent: parsePercentCell(cells, 1),
        discount2Percent: parsePercentCell(cells, 2),
        discount3Percent: parsePercentCell(cells, 3),
        discount4Percent: parsePercentCell(cells, 4),
        discount5Percent: parsePercentCell(cells, 5),
        discount6Percent: parsePercentCell(cells, 6),
      });
    }
  }

  if (!hasAnyHeaderDiscount && products.length === 0) {
    errors.push(
      "Şablonda uygulanacak hiçbir iskonto yok (Sözleşme sayfasında İsk1-6 boş, Ürünler sayfası da boş).",
    );
  }

  return { header, products, errors };
};
