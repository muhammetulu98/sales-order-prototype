// Ekran 26 · Satış Sipariş Aktarma — panodan yapıştırılan satırları ayrıştırır. Kolon düzeni
// legacy FormSiparisAktarma ile birebir (A–W, tab ile ayrılmış); ilk 16 kolon zorunlu, kalanı
// isteğe bağlı. Ürün/cari çözümü sunucuda yapılır; burada yalnız metin → alan eşlemesi var.
import { parseDecimal } from "./money";

export const IMPORT_COLUMNS = [
  "A: Sipariş No",
  "B: Cari Kod",
  "C: Cari İsmi",
  "D: Barkod",
  "E: Üretici Kodu / Stok Kodu",
  "F: Üretici Stok Adı",
  "G: Miktar",
  "H: Birim",
  "I: Fiyat",
  "J: İsk 1",
  "K: İsk 2",
  "L: İsk 3",
  "M: İsk 4",
  "N: Stok Açıklama",
  "O: Ödeme Planı",
  "P: Üst Açıklama 1",
  "Q: Üst Açıklama 4",
  "R: Üst Açıklama 5",
  "S: Üst Açıklama 9",
  "T: İskontolar Listeden (1/E)",
  "U: Satıştan SAS Tipi",
  "V: Özel SAS",
  "W: Etiket",
] as const;

export const MIN_COLUMNS = 16;

export interface PastedOrderLine {
  rowNo: number;
  documentNo: string;
  customerCode: string;
  customerName: string;
  barcode: string | null;
  productCode: string | null;
  productName: string;
  quantity: number;
  unitName: string | null;
  unitPrice: number;
  discount1: number | null;
  discount2: number | null;
  discount3: number | null;
  discount4: number | null;
  note: string | null;
  paymentPlanNo: number | null;
  headerNote1: string | null;
  headerNote4: string | null;
  headerNote5: string | null;
  headerNote9: string | null;
  discountsFromList: boolean;
}

export interface PasteError {
  rowNo: number;
  message: string;
}

const text = (value: string | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length === 0 ? null : trimmed;
};

const percent = (value: string | undefined): number | null => {
  const parsed = parseDecimal(value);
  return parsed == null ? null : parsed;
};

/**
 * Boş satırlar atlanır; 16'dan az kolonlu ya da miktarı / fiyatı okunamayan (≤ 0) satır hata
 * listesine düşer, sonuca girmez — 0'a çevrilip sessizce sipariş olmaz (sunucu da fiyat ≤ 0'ı reddeder).
 */
export const parsePastedOrderLines = (
  raw: string,
): { lines: PastedOrderLine[]; errors: PasteError[] } => {
  const lines: PastedOrderLine[] = [];
  const errors: PasteError[] = [];
  let rowNo = 0;
  for (const rawLine of raw.split(/\r?\n/)) {
    rowNo++;
    if (rawLine.trim().length === 0) continue;
    const cols = rawLine.split("\t");
    if (cols.length < MIN_COLUMNS) {
      errors.push({ rowNo, message: `${cols.length} kolon var, en az ${MIN_COLUMNS} gerekli.` });
      continue;
    }
    const quantity = parseDecimal(cols[6]);
    const unitPrice = parseDecimal(cols[8]);
    if (quantity == null || quantity <= 0 || unitPrice == null || unitPrice <= 0) {
      errors.push({
        rowNo,
        message: quantity == null || quantity <= 0
          ? `Miktar okunamadı: "${(cols[6] ?? "").trim()}".`
          : `Fiyat okunamadı: "${(cols[8] ?? "").trim()}".`,
      });
      continue;
    }
    const fromList = (cols[19] ?? "").trim();
    lines.push({
      rowNo,
      documentNo: (cols[0] ?? "").trim(),
      customerCode: (cols[1] ?? "").trim(),
      customerName: (cols[2] ?? "").trim(),
      barcode: text(cols[3]),
      productCode: text(cols[4]),
      productName: (cols[5] ?? "").trim(),
      quantity,
      unitName: text(cols[7]),
      unitPrice,
      discount1: percent(cols[9]),
      discount2: percent(cols[10]),
      discount3: percent(cols[11]),
      discount4: percent(cols[12]),
      note: text(cols[13]),
      paymentPlanNo: parseDecimal(cols[14]) == null ? null : Math.trunc(parseDecimal(cols[14])!),
      headerNote1: text(cols[15]),
      headerNote4: text(cols[16]),
      headerNote5: text(cols[17]),
      headerNote9: text(cols[18]),
      discountsFromList: fromList === "1" || fromList.toUpperCase() === "E",
    });
  }
  return { lines, errors };
};
