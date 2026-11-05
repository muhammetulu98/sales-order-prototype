import { isValidBarcode } from "./productCardTabs";

// Stok kartı → İşlemler → "Excel'den barkod aktar": dosya satırlarını denetler.
// Birim, birim adıyla ("Adet") ya da sıra numarasıyla ("1") yazılabilir.

export type BarcodeImportStatus = "ok" | "invalid" | "unknownUnit" | "exists" | "duplicateInFile";

export interface BarcodeImportRow {
  /** Excel satır numarası (başlık 1. satır). */
  line: number;
  unitText: string;
  barcode: string;
  unitSlot: number | null;
  unitName: string | null;
  status: BarcodeImportStatus;
}

export const BARCODE_IMPORT_STATUS_LABELS: Record<BarcodeImportStatus, string> = {
  ok: "Eklenecek",
  invalid: "Geçersiz barkod (8–14 hane, yalnız rakam)",
  unknownUnit: "Birim bulunamadı",
  exists: "Zaten kayıtlı",
  duplicateInFile: "Dosyada tekrar ediyor",
};

export const BARCODE_IMPORT_HEADERS = ["Birim", "Barkod"] as const;

const normalize = (value: string) => value.trim().toLocaleUpperCase("tr");

/**
 * Ham satırlar (başlık hariç) → denetlenmiş satırlar. Boş satırlar atlanır.
 * Excel sayıyı bilimsel gösterime çevirebildiği için barkod hücresi metin olarak okunmalı.
 */
export const validateBarcodeImport = (
  rawRows: readonly (readonly unknown[])[],
  units: readonly { slot: number; name: string }[],
  existingBarcodes: readonly (string | null)[],
): BarcodeImportRow[] => {
  const existing = new Set(existingBarcodes.filter(Boolean) as string[]);
  const seen = new Set<string>();
  const result: BarcodeImportRow[] = [];
  rawRows.forEach((cells, index) => {
    const unitText = String(cells[0] ?? "").trim();
    const barcode = String(cells[1] ?? "").trim();
    if (!unitText && !barcode) return;
    const unit =
      units.find((candidate) => normalize(candidate.name) === normalize(unitText)) ??
      units.find((candidate) => String(candidate.slot) === unitText);
    let status: BarcodeImportStatus = "ok";
    if (!isValidBarcode(barcode)) status = "invalid";
    else if (!unit) status = "unknownUnit";
    else if (existing.has(barcode)) status = "exists";
    else if (seen.has(barcode)) status = "duplicateInFile";
    if (isValidBarcode(barcode)) seen.add(barcode);
    result.push({
      line: index + 2,
      unitText,
      barcode,
      unitSlot: unit?.slot ?? null,
      unitName: unit?.name ?? null,
      status,
    });
  });
  return result;
};
