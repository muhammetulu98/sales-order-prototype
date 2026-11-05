// Tedarikçi sözleşmesi — ticari şartlar ve net karlılık (prototip: tedarikci-sozlesme-nuxt,
// MANTIK.md). Legacy sözleşme alanlarının (koşul metinleri, ödeme planı, ciro baremleri, pazarlama
// desteği) YANINA gelir; sunucu sözleşmesi BEKLEYEN_API madde 18.
//
// Kapsam: ürün → marka → tümü (en özel kazanır). Nakliye: il satırı "Tüm iller"i ezer.
// Net karlılık saklanmaz, her zaman buradan hesaplanır — raporlar da aynı fonksiyonu kullanmalı.

export interface BonusTier {
  /** Gerçekleşen ciro ≥ eşik (₺). */
  threshold: number | null;
  rate: number | null;
}

export interface Bonus {
  tiered: boolean;
  rate: number | null;
  tiers: BonusTier[];
}

export interface DueTerm {
  kind: "days" | "date";
  days: number | null;
  date: string | null;
}

export type ScopeKind = "all" | "brand" | "product";

export interface TermScope {
  id: string;
  kind: ScopeKind;
  brandCode: string | null;
  brandName: string | null;
  productCode: string | null;
  productName: string | null;
  /** Kademeli alış iskontoları, %, 4 eleman. */
  discounts: (number | null)[];
  salesDiscount: number | null;
  yearEndBonus: Bonus;
  turnoverBonus: Bonus;
}

export type FreightDelivery = "dropship" | "transit";
export type FreightMode = "included" | "excluded";

export interface FreightRule {
  id: string;
  kind: "all" | "provinces";
  provinces: string[];
  delivery: FreightDelivery;
  freight: FreightMode;
  /** true: nakliye şartı yalnız sipariş tutarı ≥ minOrderAmount iken geçerli. */
  tiered: boolean;
  minOrderAmount: number | null;
}

export interface SupplierContractTerms {
  discountGroup: string | null;
  purchaseDue: DueTerm;
  salesDue: DueTerm;
  /** En çok 120 karakter. */
  dueNote: string | null;
  scopes: TermScope[];
  freights: FreightRule[];
  staffBonus: Bonus;
  damagedReturnRate: number | null;
}

/** Vade farkı: (alış vadesi − satış vadesi) × günlük oran (%). Prototip tahmini — teyit bekliyor. */
export const DUE_DAILY_RATE = 0.15;
export const DISCOUNT_GROUPS = ["A0", "A1", "A2", "B0", "B1", "C0", "C1"] as const;
export const DELIVERY_LABELS: Record<FreightDelivery, string> = { dropship: "Yerinden", transit: "Transit" };
export const FREIGHT_LABELS: Record<FreightMode, string> = { included: "Nakliye Dahil", excluded: "Nakliye Hariç" };

let sequence = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}`;

export const emptyBonus = (): Bonus => ({ tiered: false, rate: null, tiers: [] });
export const emptyDue = (): DueTerm => ({ kind: "days", days: null, date: null });

export const newScope = (kind: ScopeKind = "all"): TermScope => ({
  id: newId("scope"),
  kind,
  brandCode: null,
  brandName: null,
  productCode: null,
  productName: null,
  discounts: [null, null, null, null],
  salesDiscount: null,
  yearEndBonus: emptyBonus(),
  turnoverBonus: emptyBonus(),
});

export const newFreight = (kind: FreightRule["kind"] = "all"): FreightRule => ({
  id: newId("freight"),
  kind,
  provinces: [],
  delivery: "dropship",
  freight: "included",
  tiered: false,
  minOrderAmount: null,
});

export const emptyTerms = (): SupplierContractTerms => ({
  discountGroup: "C0",
  purchaseDue: emptyDue(),
  salesDue: emptyDue(),
  dueNote: null,
  scopes: [newScope("all")],
  freights: [newFreight("all")],
  staffBonus: emptyBonus(),
  damagedReturnRate: null,
});

const DAY_MS = 86_400_000;
const isoDay = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`);

/** Tarih tipli vade bugünden o tarihe kalan güne çevrilir (negatifse 0). `today` YYYY-MM-DD. */
export const dueDays = (due: DueTerm, today: string): number | null => {
  if (due.kind === "days") return due.days;
  if (!due.date) return null;
  const target = isoDay(due.date);
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.round((target - isoDay(today)) / DAY_MS));
};

/** Kademeli iskontoların net çarpanı: (1−i1)(1−i2)… */
export const discountNet = (discounts: readonly (number | null)[]) =>
  discounts.reduce<number>((net, value) => net * (1 - (value || 0) / 100), 1);

/** Baremli primde en üst baremin oranı (hedefe tam ulaşılmış kabul edilir). */
export const bonusRate = (bonus: Bonus) =>
  bonus.tiered ? Math.max(0, ...bonus.tiers.map((tier) => tier.rate || 0)) : bonus.rate || 0;

export interface ScopeSummary {
  salesNet: number;
  purchaseNet: number;
  purchaseCost: number;
  bonusTotal: number;
  /** Yalnız iskontolardan kâr marjı, %. */
  margin: number;
  /** Primlerin marja katkısı, puan. */
  bonusEffect: number;
  purchaseDays: number | null;
  salesDays: number | null;
  /** Vade farkı, puan (iki vade de doluysa). */
  dueEffect: number;
  net: number;
}

export const scopeSummary = (
  scope: Pick<TermScope, "discounts" | "salesDiscount" | "yearEndBonus" | "turnoverBonus">,
  terms: Pick<SupplierContractTerms, "purchaseDue" | "salesDue">,
  today: string,
): ScopeSummary => {
  const salesNet = 1 - (scope.salesDiscount || 0) / 100;
  const purchaseNet = discountNet(scope.discounts);
  const bonusTotal = bonusRate(scope.yearEndBonus) + bonusRate(scope.turnoverBonus);
  const purchaseCost = purchaseNet * (1 - bonusTotal / 100);
  const margin = salesNet > 0 ? (1 - purchaseNet / salesNet) * 100 : 0;
  const marginWithBonus = salesNet > 0 ? (1 - purchaseCost / salesNet) * 100 : 0;
  const purchaseDays = dueDays(terms.purchaseDue, today);
  const salesDays = dueDays(terms.salesDue, today);
  const dueEffect = purchaseDays !== null && salesDays !== null ? (purchaseDays - salesDays) * DUE_DAILY_RATE : 0;
  return {
    salesNet, purchaseNet, purchaseCost, bonusTotal, margin,
    bonusEffect: marginWithBonus - margin,
    purchaseDays, salesDays, dueEffect,
    net: marginWithBonus + dueEffect,
  };
};

export interface TermsSummary {
  margin: number;
  bonusEffect: number;
  dueEffect: number;
  net: number;
  lowest: number;
  scopes: ScopeSummary[];
}

/** Sözleşme geneli: kapsamların düz ortalaması (ciro verisi gelince ağırlıklı olacak). */
export const termsSummary = (terms: SupplierContractTerms, today: string): TermsSummary => {
  const scopes = terms.scopes.map((scope) => scopeSummary(scope, terms, today));
  const average = (pick: (item: ScopeSummary) => number) =>
    scopes.length ? scopes.reduce((sum, item) => sum + pick(item), 0) / scopes.length : 0;
  return {
    margin: average((item) => item.margin),
    bonusEffect: average((item) => item.bonusEffect),
    dueEffect: average((item) => item.dueEffect),
    net: average((item) => item.net),
    lowest: scopes.length ? Math.min(...scopes.map((item) => item.net)) : 0,
    scopes,
  };
};

/** Bir ürüne uygulanacak kapsam: ürün → marka → tümü. */
export const resolveScope = (terms: Pick<SupplierContractTerms, "scopes">, product: { code: string; brandCode: string | null }) =>
  terms.scopes.find((scope) => scope.kind === "product" && scope.productCode === product.code)
  ?? (product.brandCode ? terms.scopes.find((scope) => scope.kind === "brand" && scope.brandCode === product.brandCode) : undefined)
  ?? terms.scopes.find((scope) => scope.kind === "all")
  ?? null;

/** Bir ile uygulanacak nakliye şartı: il satırı → "Tüm iller". */
export const resolveFreight = (terms: Pick<SupplierContractTerms, "freights">, province: string) =>
  terms.freights.find((rule) => rule.kind === "provinces" && rule.provinces.includes(province))
  ?? terms.freights.find((rule) => rule.kind === "all")
  ?? null;

const scopeKey = (scope: TermScope) =>
  scope.kind === "all" ? "all" : scope.kind === "brand" ? `brand:${scope.brandCode ?? ""}` : `product:${scope.productCode ?? ""}`;

export const scopeLabel = (scope: TermScope) =>
  scope.kind === "all" ? "Tüm ürünler"
  : scope.kind === "brand" ? scope.brandName || scope.brandCode || "Marka seçilmedi"
  : scope.productCode || "Ürün seçilmedi";

export const scopeIssue = (scope: TermScope, terms: Pick<SupplierContractTerms, "scopes">): string | null => {
  if (scope.kind === "brand" && !scope.brandCode) return "Marka seçilmeli";
  if (scope.kind === "product" && !scope.productCode) return "Ürün seçilmeli";
  if (scope.discounts.some((value) => value !== null && (value < 0 || value >= 100))) return "İskonto 0 ile 100 arasında olmalı (100 hariç)";
  if (scope.salesDiscount !== null && (scope.salesDiscount < 0 || scope.salesDiscount >= 100)) return "Satış iskontosu 0 ile 100 arasında olmalı";
  if (terms.scopes.filter((other) => scopeKey(other) === scopeKey(scope)).length > 1) return "Bu kapsam birden fazla kez girilmiş";
  return null;
};

export const freightIssue = (rule: FreightRule): string | null => {
  if (rule.kind === "provinces" && !rule.provinces.length) return "En az bir il seçilmeli";
  if (rule.tiered && !(rule.minOrderAmount && rule.minOrderAmount > 0)) return "Baremli nakliyede sipariş tutarı girilmeli";
  return null;
};

/** Kaydetmeyi engelleyen eksikler (kullanıcıya gösterilecek sırayla). */
export const termsIssues = (terms: SupplierContractTerms, today: string): string[] => {
  const issues: string[] = [];
  if (dueDays(terms.purchaseDue, today) === null) issues.push("Alış vadesi girilmeli");
  if ((terms.dueNote ?? "").length > 120) issues.push("Vade açıklaması en çok 120 karakter");
  if (!terms.scopes.some((scope) => scope.kind === "all")) issues.push("\"Tüm ürünler\" kapsamı silinemez");
  if (!terms.freights.some((rule) => rule.kind === "all")) issues.push("\"Tüm iller\" nakliye satırı silinemez");
  const seen = new Map<string, number>();
  for (const rule of terms.freights) for (const province of rule.provinces) seen.set(province, (seen.get(province) ?? 0) + 1);
  for (const [province, count] of seen) if (count > 1) issues.push(`${province} birden çok nakliye satırında`);
  for (const rule of terms.freights) {
    const issue = freightIssue(rule);
    if (issue) issues.push(`Nakliye (${rule.kind === "all" ? "Tüm iller" : rule.provinces.join(", ") || "il yok"}): ${issue}`);
  }
  for (const scope of terms.scopes) {
    const issue = scopeIssue(scope, terms);
    if (issue) issues.push(`${scopeLabel(scope)}: ${issue}`);
  }
  return issues;
};

// ── Metinler ──────────────────────────────────────────────────────────────────────────

const percent = (value: number, digits = 2) =>
  `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits }).format(value)}`;

export const formatPercent = percent;

export const discountText = (values: readonly (number | null)[]) => {
  const filled = values.filter((value): value is number => !!value && value > 0);
  return filled.length ? filled.map((value) => percent(value)).join(" + ") : "—";
};

export const bonusText = (bonus: Bonus) =>
  bonus.tiered ? (bonus.tiers.length ? `baremli · en çok ${percent(bonusRate(bonus))}` : "baremli") : bonus.rate ? percent(bonus.rate) : "—";

export const dueText = (due: DueTerm) =>
  due.kind === "days" ? (due.days === null ? "—" : `${due.days} gün`) : due.date ? due.date.slice(0, 10).split("-").reverse().join(".") : "—";

export const freightLabel = (rule: FreightRule) =>
  rule.kind === "all" ? "Tüm iller"
  : rule.provinces.length > 3 ? `${rule.provinces.slice(0, 3).join(", ")} +${rule.provinces.length - 3}`
  : rule.provinces.join(", ") || "İl seçilmedi";

export const freightText = (rule: FreightRule) =>
  FREIGHT_LABELS[rule.freight] + (rule.tiered && rule.minOrderAmount
    ? ` · ≥ ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(rule.minOrderAmount)}`
    : "");
