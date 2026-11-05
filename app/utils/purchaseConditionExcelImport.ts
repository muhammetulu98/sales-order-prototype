import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { useApi } from "~/composables/useApi";
import type { ImportedSheet } from "~/composables/useSupplierPurchaseConditions";

// "Yapıştır" metin akışının yerini alan Excel şablonu — iki sayfa. Başlıklar backend'de
// (Api/Endpoints/StockImportEndpoints.cs stok sayfası alias'ları, SupplierPurchaseConditionLineEndpoints.cs
// iskonto sayfası alias'ları) Türkçe karakter/boşluk normalize edilerek eşleştirilir; sütun
// SIRASI önemli değildir, başlık METNİ önemlidir.

const PRODUCT_SHEET_NAME = "Ürünler";
const DISCOUNT_SHEET_NAME = "İskontolar";

// TimonERPNew'in "Toplu Stok Açma" (FormTopluStokAcma) yapıştır formatıyla aynı alan kümesi —
// tedarikçiden gelen Excel listeleri genelde zaten bu sıradadır. Birim bazlı barkod, koli
// ölçüleri ve prim kodu ERP'de var ama bizim ürün modelimizde yok; kapsam dışı bırakıldı.
const PRODUCT_HEADERS = [
  "Stok Adı",
  "Üretici Kodu",
  "Marka Kodu",
  "KDV Oranı",
  "Varsayılan Birim",
  "Barkod",
  "Kategori Kodu",
  "2. Birim",
  "2. Birim Çarpanı",
  "3. Birim",
  "3. Birim Çarpanı",
  "4. Birim",
  "4. Birim Çarpanı",
  "Ürün Sorumlusu Kodu",
  "Sektör Kodu",
  "Model Kodu",
  "Ambalaj Kodu",
  "Reyon Kodu",
];

// "Stok Adı" ve "Üretici Kodu" bu sayfada elle girilmez — aşağıda Ürünler sayfasının AYNI
// satırını yansıtan formülle doldurulur (kullanıcı satır sırasını bozamaz, yalnız fiyat/iskonto
// girer). Zaten sistemde var olan bir ürüne iskonto tanımlarken "Stok Kodu" sütununa gerçek kod
// yazılır — o durumda ilk iki sütun boş kalabilir.
const DISCOUNT_HEADERS = [
  "Stok Adı",
  "Üretici Kodu",
  "Stok Kodu",
  "Alış Fiyatı",
  "İskonto 1",
  "İskonto 2",
  "İskonto 3",
  "İskonto 4",
];

/** Ürünler sayfasına açılacak ürün sayısı kadar hazır satır — kullanıcı gerekirse aşağı çeker. */
const MIRRORED_ROW_COUNT = 200;

const CODE_SHEET_NAME = "Kodlar";

// Ürünler sayfasının son 5 sütunu, sistemde zaten var olan lookup uçlarından besleniyor —
// serbest metin yerine açılır liste. "header" PRODUCT_HEADERS'taki başlıkla birebir eşleşmeli
// (sütun konumu oradan bulunur).
const DROPDOWN_FIELDS: { header: string; endpoint: string; valueKey: string }[] = [
  { header: "Ürün Sorumlusu Kodu", endpoint: "/api/v1/lookup/urun-sorumlulari", valueKey: "value" },
  { header: "Sektör Kodu", endpoint: "/api/v1/lookup/sektorler", valueKey: "sekKod" },
  { header: "Model Kodu", endpoint: "/api/v1/lookup/stok-modelleri", valueKey: "value" },
  { header: "Ambalaj Kodu", endpoint: "/api/v1/lookup/ambalaj-kodlari", valueKey: "value" },
  { header: "Reyon Kodu", endpoint: "/api/v1/lookup/reyon-kodlari", valueKey: "value" },
];

const columnLetter = (oneBasedIndex: number) => {
  let n = oneBasedIndex;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

const fetchDropdownCodeLists = async (): Promise<{ header: string; values: string[] }[]> => {
  const api = useApi();
  const results = await Promise.all(
    DROPDOWN_FIELDS.map((field) =>
      api
        .request<Record<string, unknown>[]>(field.endpoint)
        .catch(() => [] as Record<string, unknown>[]),
    ),
  );
  return DROPDOWN_FIELDS.map((field, index) => {
    const values = [
      ...new Set(
        (results[index] ?? [])
          .map((row) => String(row[field.valueKey] ?? "").trim())
          .filter((value) => value !== ""),
      ),
    ].sort();
    return { header: field.header, values };
  });
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

/** Boş şablonu indirir: "Stok Adı" zorunlu, geri kalan sütunlar opsiyoneldir. */
export const downloadPurchaseConditionImportTemplate = async () => {
  const codeLists = await fetchDropdownCodeLists();

  const workbook = new ExcelJS.Workbook();

  const productSheet = workbook.addWorksheet(PRODUCT_SHEET_NAME);
  productSheet.addRow(PRODUCT_HEADERS);
  productSheet.columns = PRODUCT_HEADERS.map(() => ({ width: 16 }));

  const discountSheet = workbook.addWorksheet(DISCOUNT_SHEET_NAME);
  discountSheet.addRow(DISCOUNT_HEADERS);
  discountSheet.columns = DISCOUNT_HEADERS.map(() => ({ width: 16 }));
  // Ürünler sayfasında yeni açılan ürüne iskonto tanımlarken kullanıcı bu iki sütuna dokunmaz —
  // hangi satırı doldurduğunu görsün diye Ürünler!A/B'yi aynı satır numarasıyla yansıtır. Boş
  // kaynak hücreye referans veren formül Excel'de "0" döner (kafa karıştırıcı), IF ile boşsa
  // boş string döndürülür. Zaten var olan bir ürünü fiyatlıyorsa "Stok Kodu" sütununa gerçek
  // kodu yazar (bkz. backend ParseDiscountSheet: Stok Kodu > Üretici Kodu önceliği).
  for (let row = 2; row <= MIRRORED_ROW_COUNT + 1; row++) {
    discountSheet.getCell(`A${row}`).value = {
      formula: `IF('${PRODUCT_SHEET_NAME}'!A${row}="","",'${PRODUCT_SHEET_NAME}'!A${row})`,
    };
    discountSheet.getCell(`B${row}`).value = {
      formula: `IF('${PRODUCT_SHEET_NAME}'!B${row}="","",'${PRODUCT_SHEET_NAME}'!B${row})`,
    };
  }

  // Açılır listelerin kaynağı — kullanıcı görmesin diye gizli sekme, sadece veri doğrulama
  // formülleri buraya referans verir.
  const codeSheet = workbook.addWorksheet(CODE_SHEET_NAME, { state: "veryHidden" });
  codeLists.forEach((list, index) => {
    const letter = columnLetter(index + 1);
    codeSheet.getCell(`${letter}1`).value = list.header;
    list.values.forEach((value, rowIndex) => {
      codeSheet.getCell(`${letter}${rowIndex + 2}`).value = value;
    });
  });

  codeLists.forEach((list, index) => {
    if (list.values.length === 0) return;
    const productColumn = columnLetter(PRODUCT_HEADERS.indexOf(list.header) + 1);
    const codeColumn = columnLetter(index + 1);
    const range = `${CODE_SHEET_NAME}!$${codeColumn}$2:$${codeColumn}$${list.values.length + 1}`;
    for (let row = 2; row <= MIRRORED_ROW_COUNT + 1; row++) {
      productSheet.getCell(`${productColumn}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [range],
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBrowserDownload(blob, "satinalma-urun-iskonto-sablonu.xlsx");
};

const sheetToImported = (sheet: XLSX.WorkSheet | undefined): ImportedSheet => {
  if (!sheet) return { headers: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  const [headerRow, ...bodyRows] = matrix;
  const headers = (headerRow ?? []).map((cell) => (cell ?? "").toString().trim());
  const rows = bodyRows
    .map((row) => headers.map((_, i) => (row[i] ?? "").toString().trim()))
    .filter((row) => row.some((cell) => cell !== ""));

  return { headers, rows };
};

export const parsePurchaseConditionImportWorkbook = (
  buffer: ArrayBuffer,
): { productSheet: ImportedSheet; discountSheet: ImportedSheet } => {
  const workbook = XLSX.read(buffer, { type: "array" });
  return {
    productSheet: sheetToImported(workbook.Sheets[PRODUCT_SHEET_NAME]),
    discountSheet: sheetToImported(workbook.Sheets[DISCOUNT_SHEET_NAME]),
  };
};

/** Dışa aktarımda bir satır — defterin o anki hâlinden beslenir. */
export interface PriceExportRow {
  stockCode: string;
  stockName: string;
  /** 0 ya da daha küçükse fiyat hücresi BOŞ yazılır (bkz. aşağıdaki not). */
  grossPrice: number;
  discounts: (number | null)[];
}

/**
 * Defteri "İskontolar" sayfasının şablonla birebir aynı düzeninde dışa aktarır: kullanıcı fiyat
 * sütununu değiştirip aynı dosyayı geri yükler. Yükleme tarafında hiçbir şey değişmez — parser
 * ve backend bu şekli zaten okuyor ("Stok Kodu" dolu olduğu için üretici kodu eşleşmesine gerek
 * kalmaz).
 *
 * Fiyatı olmayan ürün (ne bizim satırımız ne ERP şartı) BOŞ fiyatla iner; 0 yazmak, geri
 * yüklendiğinde ürüne sıfır fiyatlı bir şart açardı. Backend fiyat ve iskonto hücrelerinin hepsi
 * boş olan satırı sessizce atlar, yani dokunulmayan satır geri yüklemede işlem görmez.
 *
 * İskonto 5-6 sütunu yok: şablonda da yok ve canlıda 4,4 milyon şart satırının HİÇBİRİNDE
 * dolu değil.
 */
export const downloadPurchaseConditionPriceWorkbook = async (
  rows: PriceExportRow[],
  supplierCode: string,
) => {
  const workbook = new ExcelJS.Workbook();

  // Boş "Ürünler" sayfası: aynı dosyayla yeni ürün de açılabilsin diye şablonla aynı sayfa
  // kümesi korunur.
  const productSheet = workbook.addWorksheet(PRODUCT_SHEET_NAME);
  productSheet.addRow(PRODUCT_HEADERS);
  productSheet.columns = PRODUCT_HEADERS.map(() => ({ width: 16 }));

  const discountSheet = workbook.addWorksheet(DISCOUNT_SHEET_NAME);
  discountSheet.addRow(DISCOUNT_HEADERS);
  discountSheet.columns = DISCOUNT_HEADERS.map(() => ({ width: 16 }));

  for (const row of rows) {
    const priced = row.grossPrice > 0;
    discountSheet.addRow([
      row.stockName,
      "", // Üretici Kodu: stok kodu dolu olduğu için kullanılmaz.
      row.stockCode,
      priced ? row.grossPrice : "",
      ...[0, 1, 2, 3].map((i) => (priced ? (row.discounts[i] ?? "") : "")),
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBrowserDownload(blob, `satinalma-fiyat-${supplierCode}.xlsx`);
};
