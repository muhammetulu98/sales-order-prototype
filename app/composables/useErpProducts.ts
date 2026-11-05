// Kesit 6 · ekran 12 (Stok Kartı) + ekran 16 (Toplu Stok Açma) → /api/erp/products.
// Kart şeklinin tek doğru kaynağı ekran 12'dir; toplu açma aynı gövdeyi listeler hâlinde
// gönderir (ErpProductSavePayload[]), ayrı model yok.
//
// KAPSAM: yalnızca senkron kanalının (TimonToMikroStockSyncService) Mikro'ya taşıdığı alanlar.
// Prim kodu, kalite kontrol kodu, GTİP, alım sipariş birimi, birim boyut blokları, stok genel
// adı, çıkış deposu, fuar stok ve alış fiyatı (satın alma şartı) BİLEREK yok — bkz. CUTOVER_UAT.

// Hata metni/durumu ortak: zarfın jenerik message'ı errors[] detayını saklamasın.
import { errorMessage as messageOf, errorStatus as statusOf } from "~/utils/apiEnvelope";

export interface ErpProductUnit {
  slot: number;
  name: string;
  /** Pozitif katsayı; aynada 2–4. slotlar negatif saklanır, dönüşüm sunucuda. */
  factor: number;
  // Birim ölçüleri (Mikro sto_birimN_agirlik/en/boy/yukseklik). Kart formu gönderir ama API
  // henüz saklamıyor/döndürmüyor — BEKLEYEN_API_DEGISIKLIKLERI.md.
  weight?: number | null;
  width?: number | null;
  length?: number | null;
  height?: number | null;
}

export interface ErpProductDepotBalance {
  depotNo: number;
  depotName: string;
  /** Depo kısa kodu / alt satır; yoksa null. */
  depotCode: string | null;
  quantity: number;
}

export interface ErpProduct {
  id: string;
  productGuid: string | null;
  code: string;
  name: string | null;
  shortName: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  mainGroupCode: string | null;
  mainGroupName: string | null;
  subGroupCode: string | null;
  subGroupName: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  brandCode: string | null;
  brandName: string | null;
  modelCode: string | null;
  modelName: string | null;
  sectorCode: string | null;
  sectorName: string | null;
  productManagerCode: string | null;
  /** Ana stok resmi (Mikro sto_resim_url). Uç henüz döndürmüyor — BEKLEYEN_API_DEGISIKLIKLERI.md. */
  imageUrl?: string | null;
  // Stok miktarı / yaşı — liste ucu henüz döndürmüyor (BEKLEYEN_API_DEGISIKLIKLERI.md).
  /** Depo bazlı mevcut; popover'daki depo kartları. */
  depotBalances?: ErpProductDepotBalance[] | null;
  /** Depo dökümü yoksa toplam mevcut. */
  stockQuantity?: number | null;
  /** Koli içi adet (koli birim katsayısı). */
  casePack?: number | null;
  /** Multi kod (alternatif stok kodu); yoksa null. */
  multiCode?: string | null;
  /** Liste fiyatı (KDV hariç, temel birim). */
  listPrice?: number | null;
  /** Cari/fiyat kuralından gelen İsk 1 (%); satırda değiştirilemez. */
  discount1?: number | null;
  /** H = hazır stok, D = drop (tedarikçiden yerinden). */
  stockType?: "H" | "D" | null;
  /** Satılabilir miktar (yalnız H stoklar için). */
  sellableQuantity?: number | null;
  /** Açık tedarik (satınalma) siparişi — bekleyen giriş. */
  incomingOrderQuantity?: number | null;
  /** Açık müşteri siparişi — rezerve, bekleyen çıkış. */
  customerOrderQuantity?: number | null;
  /** Stok yaşı, gün (Mikro stok yaşlandırma). */
  stockAgingDays?: number | null;
  /** Ham jsonb metni — `parseUnits` ile çözülür. */
  units: string;
  defaultUnitSlot: number | null;
  taxCode: number | null;
  taxRate: number | null;
  taxRateName: string | null;
  physicalStateCode: string | null;
  physicalStateName: string | null;
  financialStateCode: string | null;
  financialStateName: string | null;
  isPassive: boolean;
  salesStopped: boolean;
  orderStopped: boolean;
  goodsReceiptStopped: boolean;
  sendToWeb: boolean;
  minStock: number | null;
  orderStock: number | null;
  maxStock: number | null;
  orderLeadDays: number | null;
  standardCost: number | null;
  currencyCode: number | null;
  currencyName: string | null;
  accountingGroupCode: string | null;
  accountingCode: string | null;
  defaultUnitName: string | null;
  note1: string | null;
  note2: string | null;
  note3: string | null;
  note4: string | null;
  onlyBox: boolean;
  dontSellWhenOutOfStock: boolean;
  discontinued: boolean;
  b2bAlwaysSellable: boolean;
  salesPrice: number | null;
  salesPriceDiscountCode: string | null;
  salesPriceUnitSlot: number | null;
  priceLineCount: number;
  masterBarcode: string | null;
  barcodeCount: number;
  manufacturerCode: string | null;
  manufacturerName: string | null;
  multiCodeCount: number;
  depotCount: number;
  approvalStatus: number;
  approvalStatusName: string | null;
  syncStatus: number;
  syncStatusName: string | null;
  syncError: string | null;
  syncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  version: string;
}

export interface ErpProductBarcode {
  id: string;
  barcodeGuid: string | null;
  productCode: string | null;
  barcode: string | null;
  unitSlot: number | null;
  isMaster: boolean;
  barcodeType: number | null;
  createdAt: string | null;
}

export interface ErpProductPrice {
  id: string;
  priceGuid: string | null;
  productCode: string | null;
  priceListNo: number;
  priceListName: string | null;
  depotNo: number;
  price: number | null;
  currencyCode: number | null;
  discountCode: string | null;
  unitSlot: number | null;
  updatedAt: string | null;
}

export interface ErpProductDepot {
  id: string;
  productGuid: string | null;
  depotNo: number | null;
  depotCode: string | null;
  minStock: number | null;
  orderStock: number | null;
  maxStock: number | null;
  locationCode: string | null;
  salesStopped: boolean;
  orderStopped: boolean;
  goodsReceiptStopped: boolean;
  supplierCode: string | null;
  productManagerCode: string | null;
}

// ── Stok kartı sekmeleri (Barkod / Fiyat / Eski fiyatlar / Multi kodlar) ─────────────
// Okuma: barkod/fiyat detay ucundan, eski fiyatlar ve multi kodlar kendi uçlarından. Yazmada
// yalnız ana barkod var; barkod ekle/sil, diğer liste fiyatları ve multi kod yazma Mikro kanalını
// bekliyor (BEKLEYEN_API_DEGISIKLIKLERI.md madde 9).

/** Fiyat sekmesi taslak satırı; kart kaydıyla (`prices`) gider. Liste 1 = Genel'deki satış fiyatı. */
export interface ErpProductPriceDraft {
  priceListNo: number;
  price: number | null;
  unitSlot: number | null;
  discountCode: string | null;
  /** Kaldırıldı: kayıtta silinir. */
  removed: boolean;
}

export interface ErpProductMultiCode {
  code: string;
  name: string | null;
  supplierCode: string | null;
  supplierName: string | null;
}

export interface ErpProductPriceHistoryRow {
  priceListNo: number;
  priceListName: string | null;
  /** Fiyatın geçerli olduğu dönem etiketi ("2026 Mart"). */
  periodLabel: string | null;
  validFrom: string | null;
  price: number | null;
  unitSlot: number | null;
  discountCode: string | null;
  discountName: string | null;
}

/**
 * Stok hareketi — depo ayağı başına bir satır. Depo transferi İKİ satır gelir (kaynakta "out",
 * hedefte "in", ikisinde de karşı depo dolu) ki tüm depolar görünümünde net sıfır olsun.
 * GET /api/erp/products/{code}/movements — transfer iki satır (çıkış + giriş) gelir.
 */
export interface ErpStockMovement {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  documentSeries: string | null;
  documentSequence: number | null;
  referenceNo: string | null;
  /** "Satış Faturası", "Depo Transfer", "Sayım Fazlası"… */
  documentTypeName: string;
  direction: "in" | "out";
  isTransfer: boolean;
  customerCode: string | null;
  customerName: string | null;
  depotNo: number;
  depotName: string | null;
  /** Transferde karşı depo. */
  counterDepotName: string | null;
  /** Ana birim cinsinden, pozitif. */
  quantity: number;
  unitName: string | null;
  netUnitPrice: number | null;
  amount: number | null;
}

export interface ErpProductDetail {
  product: ErpProduct;
  barcodes: ErpProductBarcode[];
  prices: ErpProductPrice[];
  depots: ErpProductDepot[];
}

export interface ErpProductPage {
  items: ErpProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ErpCodeOption {
  code: string;
  name: string;
}

export interface ErpSubGroupOption extends ErpCodeOption {
  mainGroupCode: string | null;
}

/** Kategori ana/alt grubu belirler — legacy toplu açma grupları kategoriden türetiyor. */
export interface ErpCategoryOption extends ErpCodeOption {
  mainGroupCode: string | null;
  subGroupCode: string | null;
}

export interface ErpProductLookups {
  mainGroups: ErpCodeOption[];
  subGroups: ErpSubGroupOption[];
  categories: ErpCategoryOption[];
  brands: ErpCodeOption[];
  models: ErpCodeOption[];
  sectors: ErpCodeOption[];
  physicalStates: ErpCodeOption[];
  financialStates: ErpCodeOption[];
  taxRates: number[];
  // Liste filtre paneli için — uç henüz döndürmüyor (BEKLEYEN_API_DEGISIKLIKLERI.md).
  productManagers?: ErpCodeOption[];
  depots?: { no: number; name: string | null }[];
}

export interface ErpProductSavePayload {
  /** Yeni kartta tekrar gönderim anahtarı; yalnız başarıdan sonra yenilenir. */
  requestId?: string;
  code?: string | null;
  name: string;
  shortName?: string | null;
  supplierCode?: string | null;
  mainGroupCode?: string | null;
  subGroupCode?: string | null;
  categoryCode?: string | null;
  brandCode?: string | null;
  modelCode?: string | null;
  sectorCode?: string | null;
  productManagerCode?: string | null;
  units: ErpProductUnit[];
  defaultUnitSlot: number;
  /** KDV **oranı** (%), kod değil. */
  taxRate: number;
  physicalStateCode?: string | null;
  financialStateCode?: string | null;
  isPassive?: boolean;
  salesStopped?: boolean;
  orderStopped?: boolean;
  goodsReceiptStopped?: boolean;
  sendToWeb?: boolean;
  minStock?: number | null;
  orderStock?: number | null;
  maxStock?: number | null;
  orderLeadDays?: number | null;
  standardCost?: number | null;
  currencyCode?: number;
  defaultUnitName?: string | null;
  note1?: string | null;
  note2?: string | null;
  note3?: string | null;
  note4?: string | null;
  onlyBox?: boolean;
  dontSellWhenOutOfStock?: boolean;
  discontinued?: boolean;
  b2bAlwaysSellable?: boolean;
  salesPrice?: number | null;
  salesPriceDiscountCode?: string | null;
  masterBarcode?: string | null;
  manufacturerCode?: string | null;
  manufacturerName?: string | null;
  // Sekme taslakları — API henüz okumuyor (madde 9).
  prices?: ErpProductPriceDraft[];
  multiCodes?: ErpProductMultiCode[];
  version?: string | null;
}

export interface ErpProductSaved {
  id: string;
  code: string;
  version: string;
}

export interface ErpProductBulkCreated {
  created: number;
  items: ErpProductSaved[];
}

export class ErpProductActionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ErpProductActionError";
  }
}

/** View `units` alanını ham jsonb metni olarak veriyor; slot sırasıyla çözülür. */
export const parseUnits = (raw: string | null | undefined): ErpProductUnit[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ErpProductUnit[];
    return Array.isArray(parsed) ? [...parsed].sort((a, b) => a.slot - b.slot) : [];
  } catch {
    return [];
  }
};

export const useErpProducts = () => {
  const api = useApi();
  const base = "/api/erp/products";

  /**
   * Liste. Filtre parametreleri ~/utils/productListFilters `toProductListQuery` ile üretilir.
   */
  const list = (
    query: Record<string, string | number | boolean | number[] | undefined> & {
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) =>
    api.request<ErpProductPage>(`${base}/`, {
      query: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
      ),
    });

  /** `silent`: hata bildirimi gösterilmez (toplu kod çözümlemede bulunamayan kodlar için). */
  const get = (code: string, silent = false) =>
    api.request<ErpProductDetail>(`${base}/${encodeURIComponent(code)}`, silent ? { silentError: true } : {});

  /** Yeni kart için sıradaki ERP serisi kodu (BEKLEYEN_API madde 22) — uç yokken 404. */
  const nextCode = () => api.request<{ code: string }>(`${base}/next-code`, { silentError: true });

  const lookups = () => cachedLookup("products:lookups", () => api.request<ErpProductLookups>(`${base}/lookups`));

  const create = async (payload: ErpProductSavePayload) => {
    try {
      return await api.request<ErpProductSaved>(`${base}/`, {
        method: "POST",
        body: { ...payload },
        silentError: true,
      });
    } catch (err) {
      throw new ErpProductActionError(messageOf(err, "Stok kartı açılamadı."), statusOf(err));
    }
  };

  const update = async (code: string, payload: ErpProductSavePayload) => {
    try {
      return await api.request<ErpProductSaved>(`${base}/${encodeURIComponent(code)}`, {
        method: "PUT",
        body: { ...payload },
        silentError: true,
      });
    } catch (err) {
      throw new ErpProductActionError(messageOf(err, "Stok kartı güncellenemedi."), statusOf(err));
    }
  };

  const createBulk = async (items: ErpProductSavePayload[]) => {
    try {
      return await api.request<ErpProductBulkCreated>(`${base}/bulk`, {
        method: "POST",
        body: { items },
        silentError: true,
      });
    } catch (err) {
      throw new ErpProductActionError(messageOf(err, "Toplu açma tamamlanamadı."), statusOf(err));
    }
  };

  /**
   * Toplu Stok Bilgisi Değiştir (BEKLEYEN_API madde 21): kodlarda tek alanı aynı değere çeker.
   * Uç yokken (404/405) ekran her stoğu PUT ile tek tek günceller.
   */
  const bulkUpdate = async (input: { codes: string[]; field: string; value: string }) => {
    try {
      return await api.request<{ updatedCount: number; failed: { code: string; message: string }[] }>(`${base}/bulk-update`, {
        method: "POST",
        body: input,
        silentError: true,
      });
    } catch (err) {
      throw new ErpProductActionError(messageOf(err, "Toplu güncelleme tamamlanamadı."), statusOf(err));
    }
  };

  /** Sekme uçları: hata sessiz; 404 = uç henüz yok (ekran "devreye alınmadı" der). */
  const call = async <T>(path: string, fallback: string, options: Record<string, unknown> = {}) => {
    try {
      return await api.request<T>(`${base}/${path}`, { ...options, silentError: true });
    } catch (err) {
      throw new ErpProductActionError(messageOf(err, fallback), statusOf(err));
    }
  };
  const at = (code: string) => encodeURIComponent(code);

  const addBarcode = (code: string, body: { unitSlot: number; barcode: string }) =>
    call<ErpProductBarcode>(`${at(code)}/barcodes`, "Barkod eklenemedi.", { method: "POST", body });
  const removeBarcode = (code: string, id: string) =>
    call<void>(`${at(code)}/barcodes/${encodeURIComponent(id)}`, "Barkod silinemedi.", { method: "DELETE" });
  const setMasterBarcode = (code: string, id: string) =>
    call<void>(`${at(code)}/barcodes/${encodeURIComponent(id)}/master`, "Ana barkod değiştirilemedi.", { method: "PUT" });
  const priceHistory = (code: string) =>
    call<ErpProductPriceHistoryRow[]>(`${at(code)}/price-history`, "Eski fiyatlar yüklenemedi.");
  /** Kartın denetim geçmişi (AuditTimeline şekli): kart + barkod + fiyat + multi kod. */
  const audit = (code: string) =>
    call<import("~/composables/useAuditHistory").AuditEvent[]>(`${at(code)}/audit`, "Değişiklik geçmişi yüklenemedi.");
  const movements = (code: string) =>
    call<ErpStockMovement[]>(`${at(code)}/movements`, "Stok hareketleri yüklenemedi.");
  const multiCodes = (code: string) =>
    call<ErpProductMultiCode[]>(`${at(code)}/multi-codes`, "Multi kodlar yüklenemedi.");

  return {
    list,
    get,
    nextCode,
    lookups,
    create,
    update,
    createBulk,
    bulkUpdate,
    addBarcode,
    removeBarcode,
    setMasterBarcode,
    priceHistory,
    audit,
    movements,
    multiCodes,
  };
};

/** Uç henüz yoksa (404/405) kullanıcıya gösterilecek ortak mesaj. */
export const isPendingApi = (err: unknown) =>
  err instanceof ErpProductActionError && (err.status === 404 || err.status === 405);
export const PENDING_API_MESSAGE = "Bu işlem henüz devreye alınmadı.";
