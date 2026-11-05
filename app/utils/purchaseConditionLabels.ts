// Şart başlığının kullanıcıya gösterilen özet etiketleri — tedarikçi sayfasındaki sözleşme
// kartı, sözleşme detayındaki "Genel Şartlar" ve liste aynı metni üretsin diye tek yerde.
import { formatDate } from "./dates";
import { formatDiscountChain } from "./purchaseConditionDiscounts";
import type { BonusPeriod, SupplierCondition } from "~/composables/useSupplierPurchaseConditions";

const PERIOD_LABEL: Record<BonusPeriod, string> = {
  Monthly: "Aylık",
  Quarterly: "Çeyrek",
  Yearly: "Yıllık",
};

type TermSource = Pick<SupplierCondition, "paymentTermType" | "paymentTermDays" | "paymentTermFixedDate">;

export const paymentTermLabel = (c: TermSource): string => {
  if (c.paymentTermType === "FixedDate")
    return c.paymentTermFixedDate ? `${formatDate(c.paymentTermFixedDate)} (nokta tarih)` : "—";
  return c.paymentTermDays ? `${c.paymentTermDays} gün` : "—";
};

export const bonusLabel = (percent: number | null, period: BonusPeriod | null): string =>
  percent == null ? "Yok" : `%${percent.toLocaleString("tr-TR")}${period ? ` · ${PERIOD_LABEL[period]}` : ""}`;

export const percentLabel = (percent: number | null): string =>
  percent == null ? "Yok" : `%${percent.toLocaleString("tr-TR")}`;

export const headerDiscounts = (c: SupplierCondition): (number | null)[] => [
  c.purchaseDiscount1Percent,
  c.purchaseDiscount2Percent,
  c.purchaseDiscount3Percent,
  c.purchaseDiscount4Percent,
  c.purchaseDiscount5Percent,
  c.purchaseDiscount6Percent,
];

/**
 * Sözleşmenin satıra inen sabit şartları: iskonto zinciri her satıra aynen uygulanır, satış
 * iskonto kodu ise yalnız sözleşmede tanımlıysa satırınkini ezer (tanımsızsa satırın kendi
 * kodu kalır — kod satış fiyatı satırının bir parçası, boşa çekmek listeyi bozardı).
 */
export const contractLineTerms = (
  c: Pick<
    SupplierCondition,
    | "purchaseDiscount1Percent"
    | "purchaseDiscount2Percent"
    | "purchaseDiscount3Percent"
    | "purchaseDiscount4Percent"
    | "purchaseDiscount5Percent"
    | "purchaseDiscount6Percent"
    | "salesDiscountCode"
  >,
  current: { salesDiscountCode: string | null },
) => ({
  discount1Percent: c.purchaseDiscount1Percent,
  discount2Percent: c.purchaseDiscount2Percent,
  discount3Percent: c.purchaseDiscount3Percent,
  discount4Percent: c.purchaseDiscount4Percent,
  discount5Percent: c.purchaseDiscount5Percent,
  discount6Percent: c.purchaseDiscount6Percent,
  salesDiscountCode: c.salesDiscountCode ?? current.salesDiscountCode,
});

/**
 * Sözleşmenin satış fiyatı kuralı: alış BRÜT liste fiyatından satış liste fiyatı. Sunucudaki
 * ApplyContractTerms ile aynı formül; ekran yalnız önizler, yazan sunucudur.
 */
export const deriveSalesPrice = (grossPrice: number, markupPercent: number): number =>
  Math.round(grossPrice * (1 + markupPercent / 100) * 100) / 100;

export const salesPricingRuleLabel = (markupPercent: number | null): string =>
  markupPercent == null
    ? "Elle girilir"
    : markupPercent === 0
      ? "Alış = Satış"
      : `Alıştan %${markupPercent.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;

export const discountChainLabel = (c: SupplierCondition): string => {
  const chain = formatDiscountChain(headerDiscounts(c));
  return chain ? `%${chain}` : "Yok";
};

/** Pasife alınmış ya da bitişi geçmiş şart "Kapalı"dır. */
export const isConditionClosed = (c: Pick<SupplierCondition, "isActive" | "isOpenEnded" | "validTo">): boolean => {
  if (!c.isActive) return true;
  if (c.isOpenEnded) return false;
  return new Date(c.validTo).getTime() < Date.now();
};
