// Tedarikçi bazlı satınalma şartları (vade/iskonto/prim/nakliye/sözleşme) + şartın ERP fiyat
// satırları. Backend: Api/Endpoints/SupplierPurchaseConditionEndpoints.cs (başlık) ve
// Api/Endpoints/SupplierPurchaseConditionLineEndpoints.cs (satırlar).
//
// Satırlar başlıkla birlikte gelmez: bir şartta binlerce satır olabildiği için sayfalı okunur,
// öbek hâlinde yazılır ve tekil silinir.

export type SupplierConditionScope = "all" | "fair" | "history";

export type PurchaseTermType = "Days" | "FixedDate";
export type PurchaseConditionCoverage = "AllProducts" | "Brands" | "SpecificProducts";
export type BonusPeriod = "Monthly" | "Quarterly" | "Yearly";

/** Mikro senkron durumu — satır rozetini besler. */
export type ErpSyncStatus = "None" | "Pending" | "Completed" | "Failed";

/** Bir ürünün tanımlı satış birimleri; defterdeki birim seçicisini besler. */
export interface SalesUnitOption {
  unitNo: number;
  name: string;
  factor: number;
}

export interface SupplierConditionBrand {
  brandCode: string;
  brandName: string;
}

export interface SupplierConditionNote {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface SupplierCondition {
  id: string;
  supplierCode: string;
  supplierName: string;
  paymentTermType: PurchaseTermType;
  paymentTermDays: number | null;
  paymentTermFixedDate: string | null;
  coverage: PurchaseConditionCoverage;
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
  projectCode: string | null;
  projectName: string | null;
  depotNo: number | null;
  validFrom: string;
  validTo: string;
  isOpenEnded: boolean;
  isActive: boolean;
  isFairCondition: boolean;
  /**
   * Sözleşmenin sabit satış şartı: fiyat listesi ve iskonto kodu açılışta bir kez seçilir,
   * sonra değişmez; eklenen her satır bunları kullanır. Liste yoksa satış tarafı yazılmaz.
   */
  salesListNo: number | null;
  salesDiscountCode: string | null;
  /** null = satış elle girilir; 0 = Alış = Satış; X = satış = alış brüt × (1 + X/100). */
  salesMarkupPercent: number | null;
  contractFileUrl: string | null;
  contractFileName: string | null;
  brands: SupplierConditionBrand[];
  lineCount: number;
  notes?: SupplierConditionNote[] | null;
}

/** ERP'ye yazılan fiyat satırı (sunucudan okunan hâli). */
export interface SupplierConditionLine {
  stockCode: string;
  stockName: string;
  grossPrice: number;
  currencyCode: number;
  discount1Percent: number | null;
  discount2Percent: number | null;
  discount3Percent: number | null;
  discount4Percent: number | null;
  discount5Percent: number | null;
  discount6Percent: number | null;
  deliveryDays: number | null;
  mikroConditionGuid: string | null;
  erpSyncStatus: ErpSyncStatus;
  erpSyncError: string | null;
  /**
   * Defter tedarikçinin TÜM ürünlerini listeler; bu bayrak ürünün kaydedilmiş bir şart satırı
   * olup olmadığını söyler. false ise satır boş (sıfır fiyatlı) gelir.
   */
  hasLine: boolean;
  /** V_B2B_PRODUCT_MASTER'dan gelen ürün görseli; master'da olmayan üründe null. */
  imageUrl: string | null;
  /**
   * Değerler bu şart üzerinden değil, ERP'de zaten yürürlükte olan bir satınalma şartından
   * geliyor. Düzenlenip kaydedilirse o ERP kaydı devralınır (yenisi açılır, eski kapanır).
   */
  fromErp: boolean;
  /** ERP'deki şartın başlangıç tarihi; yalnız fromErp ise dolu. */
  erpStartsOn: string | null;
  /** Gösterilen ERP şartının evrak serisi / sırası / evrak tarihi; ERP kaydı yoksa null. */
  documentSeries: string | null;
  documentNumber: number | null;
  documentDate: string | null;
  /** Gösterilen ERP şartının başlangıcı ve bitişi (süresizse null). */
  startsOn: string | null;
  endsOn: string | null;
  /**
   * Active = ERP'de yürürlükte; Expired = son şart kapanmış (defterde "Pasif", değerler
   * yalnız gösterim, kaydedilirse yeni şart açılır); null = bu üründe ERP kaydı yok.
   */
  erpStatus: "Active" | "Expired" | null;
  unit: string | null;
  brandName: string | null;
  categoryName: string | null;
  barcode: string | null;
  /** Seçilen satış fiyat listesindeki fiyat ve iskonto kodu; liste seçilmediyse null. */
  salesListPrice: number | null;
  salesDiscountCode: string | null;
  /**
   * İskonto kodunun genel müşteri grubundaki (T1, ödeme planı 1) 1. kademe iskonto yüzdesi.
   * Satış fiyatının net karşılığı ve marj bundan hesaplanır; kod/matris karşılığı yoksa null.
   */
  salesDiscount1Percent: number | null;
  /** İskonto kodunun matristeki adı; "…••NET••" gibi adlar %0'ı açıklar. */
  salesDiscountName: string | null;
  /** Fiyatın girildiği birim (1-4); kayıt yoksa null (1 varsayılır). */
  salesUnitNo: number | null;
  /** Ürünün tanımlı satış birimleri; birden fazlaysa defterde seçici gösterilir. */
  salesUnits: SalesUnitOption[];
  /** Satış fiyatının ERP'ye aktarım durumu. */
  salesSyncStatus: ErpSyncStatus;
  /**
   * Yapıştırmada girilen ham kod (stok kodu, multi kod ya da barkod olabilir) — eşleşme
   * aramaya konu değilse stockCode ile aynıdır. Önizleme satırını kullanıcının yapıştırdığı
   * satırla eşlemek için kullanılır (bkz. PurchaseConditionPastePanel).
   */
  matchedCode: string;
}

/** Mikro'da yürürlükte satınalma şartı olan tedarikçi (bizde başlığı olmasa da). */
export interface ErpSupplier {
  supplierCode: string;
  supplierName: string;
  activeLineCount: number;
  lastDocumentDate: string | null;
  /** Bizdeki açık genel başlık; yoksa null — ensureForSupplier ile açılır. */
  conditionId: string | null;
}

/** Formdan gönderilen satır — kimlik ve senkron alanları taşımaz. */
export interface SupplierConditionLineInput {
  stockCode: string;
  grossPrice: number;
  currencyCode: number;
  discount1Percent: number | null;
  discount2Percent: number | null;
  discount3Percent: number | null;
  discount4Percent: number | null;
  discount5Percent: number | null;
  discount6Percent: number | null;
  deliveryDays: number | null;
  /**
   * Seçili satış listesine yazılacak fiyat; null/verilmemişse satış tarafı bu satırda
   * değişmez. Excel içe aktarma ve onay akışlarının satış kavramı olmadığı için opsiyonel.
   */
  salesPrice?: number | null;
  salesDiscountCode?: string | null;
  /** Satış fiyatının girildiği birim (1-4); verilmezse 1. birim varsayılır. */
  salesUnitNo?: number | null;
}

/** Excel şablonundan okunan tek sayfa — başlıklar + ham satırlar. */
export interface ImportedSheet {
  headers: string[];
  rows: string[][];
}

export interface SalesPriceImportResult {
  /** Fiyatı gerçekten değişen ürün sayısı; değişmeyen satır yazılmaz. */
  savedCount: number;
  issues: string[];
  affectedStockCodes: string[];
}

export interface SupplierConditionExcelImportResult {
  createdProductCount: number;
  savedLineCount: number;
  issues: string[];
  /** Açılan/güncellenen ürün kodları — defter bunlara daraltılır. */
  affectedStockCodes: string[];
}

/** Bir ürünün bu tedarikçideki ERP şart zinciri — tezgâhın müfettiş bölümü. */
export interface SupplierConditionErpHistoryEntry {
  sasGuid: string;
  startsOn: string | null;
  endsOn: string | null;
  isOpenEnded: boolean;
  isCancelled: boolean;
  grossPrice: number;
  currencyCode: number | null;
  discount1Percent: number;
  discount2Percent: number;
  discount3Percent: number;
  discount4Percent: number;
  discount5Percent: number;
  discount6Percent: number;
  documentSeries: string | null;
  syncStatus: ErpSyncStatus;
  syncError: string | null;
}

export interface SupplierConditionUpsertInput {
  supplierCode: string;
  paymentTermType: PurchaseTermType;
  paymentTermDays: number | null;
  paymentTermFixedDate: string | null;
  coverage: PurchaseConditionCoverage;
  brandCodes: string[];
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
  projectCode: string | null;
  depotNo: number | null;
  validFrom: string;
  isActive: boolean;
  isFairCondition: boolean;
  /** Yalnız oluştururken alınır; sunucu düzenlemede yok sayar (sabit şart). */
  salesListNo: number | null;
  salesDiscountCode: string | null;
  salesMarkupPercent: number | null;
}

interface PagedApiResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type SupplierDocumentKind =
  | "Other"
  | "PurchaseConditionImport"
  | "SalesPriceImport"
  | "Contract";

/**
 * Tedarikçiye yüklenen dosya arşivi satırı. `url` herkese açık bir Backblaze adresidir ama
 * dosya adı yalnız GUID olduğu için tahmin edilemez.
 */
export interface SupplierDocument {
  id: string;
  kind: SupplierDocumentKind;
  fileName: string;
  url: string;
  sizeBytes: number;
  note: string;
  uploadedByName: string;
  createdAt: string;
}

/** Sunucunun tek istekte kabul ettiği satır sayısı (backend MaxLinesPerWrite ile aynı). */
export const CONDITION_LINE_WRITE_CHUNK = 200;

export const useSupplierPurchaseConditions = () => {
  const api = useApi();
  const base = "/api/v1/supplier-purchase-conditions";
  const at = (id: string) => `${base}/${encodeURIComponent(id)}`;

  const queryPage = async (params: {
    scope?: SupplierConditionScope;
    search?: string;
    page?: number;
    pageSize?: number;
  }) =>
    await api.request<PagedApiResult<SupplierCondition>>(base, {
      params: {
        scope: params.scope,
        search: params.search || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 15,
      },
    });

  const get = async (id: string) => await api.request<SupplierCondition>(at(id));

  const create = async (input: SupplierConditionUpsertInput) =>
    await api.request<SupplierCondition>(base, { method: "POST", body: input });

  const update = async (id: string, input: SupplierConditionUpsertInput) =>
    await api.request<SupplierCondition>(at(id), { method: "PUT", body: input });

  const remove = async (id: string) => await api.request(at(id), { method: "DELETE" });

  /** ERP'de yürürlükte şartı olan tedarikçiler — satınalmacı buradan tedarikçiye girer. */
  const erpSuppliers = async (params: { search?: string; page?: number; pageSize?: number }) =>
    await api.request<PagedApiResult<ErpSupplier>>(`${base}/erp-suppliers`, {
      params: {
        search: params.search || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 15,
      },
    });

  /** Satış iskonto kodu seçici: T1/genel grup matrisinden kod + açıklama + oran (arama destekli). */
  const discountCodes = async (search?: string) =>
    await api.request<{ value: string; code: string; name: string; percent: number }[]>(
      `${base}/discount-codes`,
      { params: { search: search || undefined } },
    );

  /** Tedarikçinin açık başlığını döner, yoksa asgari bir başlık açar (ERP şartı yaratmaz). */
  const ensureForSupplier = async (supplierCode: string) =>
    await api.request<{ id: string; created: boolean }>(`${base}/ensure`, {
      method: "POST",
      body: { supplierCode },
    });

  /**
   * Defteri yapıştırılan ürün listesine daraltır. Kod listesi query string'e sığmadığı için
   * POST; sonuç sözleşmesi lines() ile birebir aynı.
   */
  const linesQuery = async (
    id: string,
    params: { search?: string; page: number; pageSize: number; stockCodes: string[]; salesListNo?: number | null },
  ) =>
    await api.request<PagedApiResult<SupplierConditionLine>>(`${at(id)}/lines/query`, {
      method: "POST",
      body: {
        search: params.search ?? null,
        page: params.page,
        pageSize: params.pageSize,
        stockCodes: params.stockCodes,
        salesListNo: params.salesListNo ?? null,
      },
    });

  // ----- Satırlar -----

  const lines = async (
    id: string,
    params: { search?: string; page?: number; pageSize?: number; salesListNo?: number | null } = {},
  ) =>
    await api.request<PagedApiResult<SupplierConditionLine>>(`${at(id)}/lines`, {
      params: {
        search: params.search || undefined,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 50,
        salesListNo: params.salesListNo ?? undefined,
      },
    });

  /**
   * Satırları yazar. Sunucu tek istekte en fazla CONDITION_LINE_WRITE_CHUNK satır kabul
   * ettiği için liste burada öbeklenir — çağıran tarafın bunu bilmesi gerekmez.
   */
  const saveLines = async (
    id: string,
    input: SupplierConditionLineInput[],
    salesListNo: number | null = null,
  ) => {
    const saved: SupplierConditionLine[] = [];
    for (let start = 0; start < input.length; start += CONDITION_LINE_WRITE_CHUNK) {
      const chunk = input.slice(start, start + CONDITION_LINE_WRITE_CHUNK);
      // Liste seçimi istek başına değil kaydetme oturumu başına sabittir; her öbek aynı
      // listeyle gider.
      const result = await api.request<SupplierConditionLine[]>(`${at(id)}/lines`, {
        method: "PUT",
        body: { lines: chunk, salesListNo },
      });
      saved.push(...result);
    }
    return saved;
  };

  const removeLine = async (id: string, stockCode: string) =>
    await api.request(`${at(id)}/lines/${encodeURIComponent(stockCode)}`, { method: "DELETE" });

  /**
   * "Yapıştır"ın yerini alan Excel importu: Ürünler sayfası eksik stok kartlarını açar,
   * İskontolar sayfası stok kodu (ya da az önce açılan ürünün üretici kodu) + brüt fiyat +
   * İsk1-4 ile satırları hemen kaydeder — ayrı bir "Kaydet" gerekmez.
   */
  const importExcel = async (
    id: string,
    sheets: { productSheet: ImportedSheet; discountSheet: ImportedSheet },
  ) =>
    await api.request<SupplierConditionExcelImportResult>(`${at(id)}/lines/import-excel`, {
      method: "POST",
      body: { productSheet: sheets.productSheet, discountSheet: sheets.discountSheet },
    });

  /**
   * Excel'den toplu SATIŞ fiyatı. Satınalma şartına dokunmaz — ayrı uç, ayrı dosya.
   * Birim gönderilmez: sunucu o ürünün bu listedeki kayıtlı giriş birimini kullanır.
   */
  const importSalesPrices = async (
    id: string,
    salesListNo: number,
    rows: { stockCode: string; salesPrice: number }[],
  ) =>
    await api.request<SalesPriceImportResult>(`${at(id)}/lines/import-sales-prices`, {
      method: "POST",
      body: { salesListNo, rows },
    });

  /** Yalnız ERP'de duran yürürlükteki şartı bugünden kapatır (eski şart temizliği). */
  const closeErpLine = async (id: string, stockCode: string) =>
    await api.request<number>(`${at(id)}/lines/${encodeURIComponent(stockCode)}/close-erp`, { method: "POST" });

  const lineErpHistory = async (id: string, stockCode: string) =>
    await api.request<SupplierConditionErpHistoryEntry[]>(
      `${at(id)}/lines/${encodeURIComponent(stockCode)}/erp-history`,
    );

  // ----- Ekler -----

  const addNote = async (id: string, message: string) =>
    await api.request<SupplierConditionNote>(`${at(id)}/notes`, { method: "POST", body: { message } });

  const uploadContract = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    return await api.request<{ url: string; fileName: string }>(`${at(id)}/contract`, {
      method: "POST",
      body: formData,
    });
  };

  const deleteContract = async (id: string) =>
    await api.request(`${at(id)}/contract`, { method: "DELETE" });

  // ----- Dosya arşivi (tedarikçi bazlı) -----

  const documents = async (id: string) =>
    await api.request<SupplierDocument[]>(`${at(id)}/documents`);

  const uploadDocument = async (id: string, file: File, kind: SupplierDocumentKind) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("kind", kind);
    return await api.request<SupplierDocument>(`${at(id)}/documents`, {
      method: "POST",
      body: formData,
    });
  };

  const updateDocumentNote = async (id: string, documentId: string, note: string) =>
    await api.request(`${at(id)}/documents/${encodeURIComponent(documentId)}/note`, {
      method: "PUT",
      body: { note },
    });

  const auditUrl = (id: string) => `${at(id)}/audit`;

  const downloadContractTemplate = async () => {
    const blob = await api.request<Blob>(`${base}/contract-template`, { responseType: "blob", raw: true, silentError: true });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "satinalma-sozlesmesi-sablonu.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    queryPage,
    get,
    create,
    update,
    remove,
    erpSuppliers,
    discountCodes,
    ensureForSupplier,
    lines,
    linesQuery,
    saveLines,
    removeLine,
    importExcel,
    importSalesPrices,
    closeErpLine,
    lineErpHistory,
    addNote,
    uploadContract,
    deleteContract,
    documents,
    uploadDocument,
    updateDocumentNote,
    auditUrl,
    downloadContractTemplate,
  };
};
