import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { parseDecimal } from "./money";

// Satış fiyatı toplu güncelleme dosyası. Satınalma şablonundan (purchaseConditionExcelImport.ts)
// BİLEREK ayrı: o dosya alış şartı yazar, bu dosya yalnız satış fiyatına dokunur. Tek bir dosya
// seçiciye yanlış dosyayı verdiğinde sessizce öbür tarafa yazmasın diye ayrıldılar.

const SHEET_NAME = "Satış Fiyatları";

/** Fiyat listesi kimliği burada taşınır; kullanıcının göreceği bir şey değil. */
const LIST_SHEET_NAME = "Liste";

// Yalnız "Yeni Satış Fiyatı" doldurulur. Diğerleri karar vermek için bilgi sütunudur; içe
// aktarımda OKUNMAZ — birim bile sunucuda kayıtlı satırdan çözülür (bkz. API
// ResolveStoredSalesUnitsAsync), çünkü değiştirilmiş bir birim aynı sayıyı bambaşka bir fiyata
// çevirir ve bunu fark etmek imkânsızdır.
const HEADERS = [
  "Stok Kodu",
  "Stok Adı",
  "Birim",
  "Alış Net",
  "Mevcut Satış Fiyatı",
  "Marj %",
  "Yeni Satış Fiyatı",
];

const STOCK_CODE_INDEX = 0;
const NEW_PRICE_INDEX = 6;

export interface SalesPriceExportRow {
  stockCode: string;
  stockName: string;
  /** Fiyatın girildiği birimin adı; yalnız gösterim. */
  unitName: string | null;
  purchaseNet: number | null;
  salesPrice: number | null;
  marginPercent: number | null;
}

export interface ParsedSalesPriceWorkbook {
  /** Dosyanın indirildiği fiyat listesi; eski/elde yapılmış dosyalarda null olabilir. */
  listNo: number | null;
  rows: { stockCode: string; salesPrice: number }[];
  /** Fiyatı doldurulmamış, yani dokunulmamış satır sayısı. */
  untouchedCount: number;
  /**
   * Dosya indirilirken defterde OLAN ama geri yüklenen dosyada OLMAYAN ürünler — kullanıcı
   * satırı silmiştir. Tedarikçinin güncel listesinde yoksa o ürün artık üretilmiyor demektir
   * ("donuk ürün"). Kapsam gizli sayfada taşınmıyorsa (elde yapılmış dosya) boş döner: eksik
   * satırı "silinmiş" saymak, kullanıcının yalnızca bir alt kümeyi yüklemesiyle ayırt edilemez.
   */
  removedProducts: { stockCode: string; stockName: string }[];
}

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

/** Dosyayı üretir; indirme adımından ayrı tutuldu ki gidiş-dönüş test edilebilsin. */
export const buildSalesPriceWorkbookBuffer = async (
  rows: SalesPriceExportRow[],
  list: { no: number; name: string },
): Promise<ArrayBuffer> => {
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet(SHEET_NAME);
  sheet.addRow(HEADERS);
  sheet.columns = [{ width: 18 }, { width: 42 }, { width: 10 }, { width: 14 }, { width: 18 }, { width: 10 }, { width: 18 }];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const added = sheet.addRow([
      row.stockCode,
      row.stockName,
      row.unitName ?? "",
      row.purchaseNet ?? "",
      row.salesPrice ?? "",
      row.marginPercent == null ? "" : Number(row.marginPercent.toFixed(1)),
      null, // Yeni Satış Fiyatı — boş bırakılan satır işlem görmez.
    ]);

    // Sayfa korumaya alınınca her hücre varsayılan olarak kilitli olur; yalnız bu sütunun kilidi
    // açılır. Bilgi sütunları kazara değiştirilemez, kopyalanabilir.
    const input = added.getCell(NEW_PRICE_INDEX + 1);
    input.protection = { locked: false };
    input.numFmt = "#,##0.00";
    input.dataValidation = {
      type: "decimal",
      operator: "greaterThan",
      formulae: [0],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Geçersiz fiyat",
      error: "Satış fiyatı sıfırdan büyük bir sayı olmalıdır. Değiştirmeyecekseniz boş bırakın.",
    };
  }

  // Başlık satırına filtre: tedarikçinin listesiyle karşılaştırırken 2.000 satır elle taranmaz.
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: HEADERS.length } };

  // Parola YOK: amaç güvenlik değil, yanlış hücreye yazmayı önlemek. Hücreler kilitli ama SATIR
  // SİLME ve EKLEME serbest — kullanıcı tedarikçinin güncel listesinde olmayan ürünleri buradan
  // çıkarıyor (artık üretilmeyen ürün). Kilit yalnız "yanlış hücreye yazma"yı engeller.
  await sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: true,
    formatRows: true,
    insertRows: true,
    deleteRows: true,
    sort: true,
    autoFilter: true,
  });

  // Gizli sayfa: dosyanın hangi listeden indirildiği. Yüklemede ekrandaki seçimle karşılaştırılır,
  // böylece Temmuz listesinden inen bir dosya ana listeye sessizce yazılamaz.
  const listSheet = workbook.addWorksheet(LIST_SHEET_NAME, { state: "veryHidden" });
  listSheet.getCell("A1").value = list.no;
  listSheet.getCell("B1").value = list.name;
  // Kapsam: dosya hangi ürünlerle indirildi. Yüklemede "indirilenler − dosyada kalanlar" =
  // kullanıcının sildiği ürünler. Bu liste olmadan silme ile kısmi yükleme ayırt edilemez.
  rows.forEach((row, index) => {
    listSheet.getCell(`A${index + 3}`).value = row.stockCode;
    // Ad da taşınır: silinen ürünü kullanıcıya onaylatırken kod yerine adını göstermek gerekiyor.
    listSheet.getCell(`B${index + 3}`).value = row.stockName;
  });

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
};

export const downloadSalesPriceWorkbook = async (
  rows: SalesPriceExportRow[],
  list: { no: number; name: string },
) => {
  const buffer = await buildSalesPriceWorkbookBuffer(rows, list);
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBrowserDownload(blob, `satis-fiyati-liste-${list.no}.xlsx`);
};


export const parseSalesPriceWorkbook = (buffer: ArrayBuffer): ParsedSalesPriceWorkbook => {
  const workbook = XLSX.read(buffer, { type: "array" });

  const listCell = workbook.Sheets[LIST_SHEET_NAME]?.["A1"]?.v;
  const listNo = typeof listCell === "number" ? listCell : parseDecimal(listCell == null ? undefined : String(listCell));

  // Kapsam A3'ten aşağı; A1/A2 liste kimliği.
  const listSheet = workbook.Sheets[LIST_SHEET_NAME];
  const scope: { stockCode: string; stockName: string }[] = [];
  if (listSheet)
    for (let row = 3; ; row++) {
      const code = (listSheet[`A${row}`]?.v ?? "").toString().trim();
      if (code === "") break;
      scope.push({ stockCode: code, stockName: (listSheet[`B${row}`]?.v ?? "").toString().trim() });
    }

  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) return { listNo, rows: [], untouchedCount: 0, removedProducts: [] };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  const rows: { stockCode: string; salesPrice: number }[] = [];
  const present = new Set<string>();
  let untouchedCount = 0;

  for (const raw of matrix.slice(1)) {
    const stockCode = (raw[STOCK_CODE_INDEX] ?? "").toString().trim();
    if (stockCode === "") continue;
    present.add(stockCode);

    const salesPrice = parseDecimal(raw[NEW_PRICE_INDEX] == null ? undefined : String(raw[NEW_PRICE_INDEX]));
    if (salesPrice == null) {
      untouchedCount++;
      continue;
    }
    rows.push({ stockCode, salesPrice });
  }

  return {
    listNo,
    rows,
    untouchedCount,
    removedProducts: scope.filter((item) => !present.has(item.stockCode)),
  };
};
