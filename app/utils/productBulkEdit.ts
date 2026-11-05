// Toplu Stok Bilgisi Değiştir (prototip: stok-kartlari, TopluDegistir.vue): Excel'den yapıştırılan
// stok kodlarında tek bir alanı aynı değere çeker. Alan tanımları, mevcut değerin okunması ve
// kayıt yüküne yazılması burada; ekran ProductBulkEditDialog. Sunucu sözleşmesi BEKLEYEN_API 21.
import type { ErpProduct, ErpProductSavePayload, ErpProductUnit } from "../composables/useErpProducts";
import { financialStateLabel, physicalStateLabel } from "./productStates";

export type BulkFieldKey =
  | "sendToWeb" | "physicalState" | "financialState" | "status" | "taxRate"
  | "productManager" | "brand" | "supplier";

/** boolean: Evet/Hayır · option: kapalı liste · lookup: aranabilir kod listesi. */
export type BulkFieldKind = "boolean" | "option" | "lookup";

export interface BulkField {
  key: BulkFieldKey;
  label: string;
  kind: BulkFieldKind;
}

export const BULK_FIELDS: readonly BulkField[] = [
  { key: "sendToWeb", label: "B2B Aktif", kind: "boolean" },
  { key: "physicalState", label: "Fiziksel Durum", kind: "option" },
  { key: "financialState", label: "Finansal Durum", kind: "option" },
  { key: "status", label: "Ürün Durumu", kind: "option" },
  { key: "taxRate", label: "KDV Oranı", kind: "option" },
  { key: "productManager", label: "Ürün Sorumlusu", kind: "lookup" },
  { key: "brand", label: "Marka", kind: "lookup" },
  { key: "supplier", label: "Tedarikçi", kind: "lookup" },
];

export const STATUS_OPTIONS = [
  { code: "active", name: "Aktif" },
  { code: "passive", name: "Pasif" },
] as const;

export const BOOLEAN_OPTIONS = [
  { code: "true", name: "Evet" },
  { code: "false", name: "Hayır" },
] as const;

/** Excel kolonundan yapıştırılan kodlar: satır, sekme, boşluk, virgül, noktalı virgül ayırır. */
export const parseProductCodes = (text: string) =>
  [...new Set(text.split(/[\s,;]+/).map((code) => code.trim()).filter(Boolean))];

/** Stoğun alandaki mevcut değeri (kod biçiminde; karşılaştırma ve önizleme için). */
export const currentValue = (product: ErpProduct, field: BulkFieldKey): string => {
  switch (field) {
    case "sendToWeb": return String(product.sendToWeb);
    case "physicalState": return product.physicalStateCode ?? "";
    case "financialState": return product.financialStateCode ?? "";
    case "status": return product.isPassive ? "passive" : "active";
    case "taxRate": return product.taxRate === null ? "" : String(product.taxRate);
    case "productManager": return product.productManagerCode ?? "";
    case "brand": return product.brandCode ?? "";
    case "supplier": return product.supplierCode ?? "";
  }
};

/** Stoğun mevcut değerinin okunur adı (sözlükte yoksa sunucunun verdiği ad / kod). */
export const currentLabel = (product: ErpProduct, field: BulkFieldKey): string => {
  switch (field) {
    case "sendToWeb": return product.sendToWeb ? "Evet" : "Hayır";
    case "physicalState": return physicalStateLabel(product.physicalStateCode, product.physicalStateName) ?? "—";
    case "financialState": return financialStateLabel(product.financialStateCode, product.financialStateName) ?? "—";
    case "status": return product.isPassive ? "Pasif" : "Aktif";
    case "taxRate": return product.taxRate === null ? "—" : `%${product.taxRate}`;
    case "productManager": return product.productManagerCode ?? "—";
    case "brand": return product.brandName ?? product.brandCode ?? "—";
    case "supplier": return product.supplierName ?? product.supplierCode ?? "—";
  }
};

/** Mevcut kartın tam kayıt yükü (ürün kartı formunun gönderdiğiyle aynı alanlar). */
export const payloadFromProduct = (product: ErpProduct, units: ErpProductUnit[]): ErpProductSavePayload => ({
  code: product.code,
  name: product.name ?? "",
  shortName: product.shortName,
  supplierCode: product.supplierCode,
  mainGroupCode: product.mainGroupCode,
  subGroupCode: product.subGroupCode,
  categoryCode: product.categoryCode,
  brandCode: product.brandCode,
  modelCode: product.modelCode,
  sectorCode: product.sectorCode,
  productManagerCode: product.productManagerCode,
  units: units.length ? units : [{ slot: 1, name: product.defaultUnitName ?? "Adet", factor: 1 }],
  defaultUnitSlot: product.defaultUnitSlot ?? 1,
  taxRate: product.taxRate ?? 20,
  physicalStateCode: product.physicalStateCode,
  financialStateCode: product.financialStateCode,
  isPassive: product.isPassive,
  salesStopped: product.salesStopped,
  orderStopped: product.orderStopped,
  goodsReceiptStopped: product.goodsReceiptStopped,
  sendToWeb: product.sendToWeb,
  minStock: product.minStock,
  orderStock: product.orderStock,
  maxStock: product.maxStock,
  orderLeadDays: product.orderLeadDays,
  standardCost: product.standardCost,
  currencyCode: 0,
  defaultUnitName: units.find((unit) => unit.slot === (product.defaultUnitSlot ?? 1))?.name ?? product.defaultUnitName,
  note1: product.note1,
  note2: product.note2,
  note3: product.note3,
  note4: product.note4,
  onlyBox: product.onlyBox,
  dontSellWhenOutOfStock: product.dontSellWhenOutOfStock,
  discontinued: product.discontinued,
  b2bAlwaysSellable: product.b2bAlwaysSellable,
  salesPrice: product.salesPrice,
  salesPriceDiscountCode: product.salesPriceDiscountCode,
  masterBarcode: product.masterBarcode,
  manufacturerCode: product.manufacturerCode,
  manufacturerName: product.manufacturerName,
  version: product.version,
});

/** Seçilen değeri kayıt yüküne yazar (değer kod biçiminde: "true", "passive", "20", marka kodu…). */
export const applyBulkValue = (payload: ErpProductSavePayload, field: BulkFieldKey, value: string): ErpProductSavePayload => {
  const next = { ...payload };
  switch (field) {
    case "sendToWeb": next.sendToWeb = value === "true"; break;
    case "physicalState": next.physicalStateCode = value || null; break;
    case "financialState": next.financialStateCode = value || null; break;
    case "status": next.isPassive = value === "passive"; break;
    case "taxRate": next.taxRate = Number(value); break;
    case "productManager": next.productManagerCode = value || null; break;
    case "brand": next.brandCode = value || null; break;
    case "supplier": next.supplierCode = value || null; break;
  }
  return next;
};
