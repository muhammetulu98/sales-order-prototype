import type { ErpCodeOption } from "~/composables/useErpProducts";

// Stok listesi filtre paneli: durum, etkin filtre çipleri ve API sorgusuna çeviri.
// Arama kutusu bunun dışında (sayfada ayrı tutulur, çip üretmez).

/** Üç durumlu seçim: "all" = süzme yok. */
export type TriState = "all" | "yes" | "no";

export interface ProductListFilters {
  mainGroupCode: string | null;
  subGroupCode: string | null;
  brandCode: string | null;
  supplierCode: string | null;
  productManagerCode: string | null;
  b2bActive: TriState;
  physicalStateCode: string | null;
  hasImage: TriState;
  depotNos: number[];
  onlyErpSeries: boolean;
  includePassive: boolean;
}

export const emptyProductFilters = (): ProductListFilters => ({
  mainGroupCode: null,
  subGroupCode: null,
  brandCode: null,
  supplierCode: null,
  productManagerCode: null,
  b2bActive: "all",
  physicalStateCode: null,
  hasImage: "all",
  depotNos: [],
  onlyErpSeries: false,
  includePassive: false,
});

export interface ProductFilterLabels {
  mainGroups: readonly ErpCodeOption[];
  subGroups: readonly ErpCodeOption[];
  brands: readonly ErpCodeOption[];
  physicalStates: readonly ErpCodeOption[];
  productManagers: readonly ErpCodeOption[];
  depots: readonly { no: number; name: string | null }[];
  /** Seçili tedarikçinin unvanı (aramadan seçildiği için sözlükte yok). */
  supplierName?: string | null;
}

export type ProductFilterKey = keyof ProductListFilters;

export interface ActiveFilterChip {
  key: ProductFilterKey;
  label: string;
  value: string;
}

const nameOf = (options: readonly ErpCodeOption[], code: string) =>
  options.find((option) => option.code === code)?.name ?? code;

export const activeFilterChips = (filters: ProductListFilters, labels: ProductFilterLabels): ActiveFilterChip[] => {
  const chips: ActiveFilterChip[] = [];
  if (filters.mainGroupCode) chips.push({ key: "mainGroupCode", label: "Ana Grup", value: nameOf(labels.mainGroups, filters.mainGroupCode) });
  if (filters.subGroupCode) chips.push({ key: "subGroupCode", label: "Alt Grup", value: nameOf(labels.subGroups, filters.subGroupCode) });
  if (filters.brandCode) chips.push({ key: "brandCode", label: "Marka", value: nameOf(labels.brands, filters.brandCode) });
  if (filters.supplierCode)
    chips.push({ key: "supplierCode", label: "Tedarikçi", value: labels.supplierName || filters.supplierCode });
  if (filters.productManagerCode)
    chips.push({ key: "productManagerCode", label: "Ürün Sorumlusu", value: nameOf(labels.productManagers, filters.productManagerCode) });
  if (filters.b2bActive !== "all")
    chips.push({ key: "b2bActive", label: "B2B", value: filters.b2bActive === "yes" ? "Aktif" : "Pasif" });
  if (filters.physicalStateCode)
    chips.push({ key: "physicalStateCode", label: "Fiziksel Durum", value: nameOf(labels.physicalStates, filters.physicalStateCode) });
  if (filters.hasImage !== "all")
    chips.push({ key: "hasImage", label: "Ürün Görseli", value: filters.hasImage === "yes" ? "Var" : "Yok" });
  if (filters.depotNos.length)
    chips.push({
      key: "depotNos",
      label: "Depo",
      value: filters.depotNos
        .map((no) => labels.depots.find((depot) => depot.no === no)?.name ?? String(no))
        .join(", "),
    });
  if (filters.includePassive) chips.push({ key: "includePassive", label: "Kart Durumu", value: "Pasifler dahil" });
  if (filters.onlyErpSeries) chips.push({ key: "onlyErpSeries", label: "Seri", value: "Yalnız ERP serisi" });
  return chips;
};

/** Tek filtreyi varsayılana döndürür; ana grup kalkınca ona bağlı alt grup da kalkar. */
export const clearProductFilter = (filters: ProductListFilters, key: ProductFilterKey): ProductListFilters => {
  const next = { ...filters, [key]: emptyProductFilters()[key] } as ProductListFilters;
  if (key === "mainGroupCode") next.subGroupCode = null;
  return next;
};

const triToBool = (value: TriState) => (value === "all" ? undefined : value === "yes");

/** GET /api/erp/products sorgu parametreleri; boş/varsayılan olanlar düşer. */
export const toProductListQuery = (filters: ProductListFilters) => {
  const query: Record<string, string | number | boolean | number[]> = {
    includePassive: filters.includePassive,
  };
  const set = (key: string, value: string | number | boolean | number[] | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value) && !value.length) return;
    query[key] = value;
  };
  set("mainGroupCode", filters.mainGroupCode);
  set("subGroupCode", filters.subGroupCode);
  set("brandCode", filters.brandCode);
  set("supplierCode", filters.supplierCode);
  set("productManagerCode", filters.productManagerCode);
  set("b2bActive", triToBool(filters.b2bActive));
  set("physicalStateCode", filters.physicalStateCode);
  set("hasImage", triToBool(filters.hasImage));
  set("depotNos", filters.depotNos);
  if (filters.onlyErpSeries) query.onlyErpSeries = true;
  return query;
};
