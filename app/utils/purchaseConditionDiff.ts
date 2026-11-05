/**
 * Bir defter satırının yüklendiği hâli ile şu anki hâli arasındaki fark.
 *
 * "Kirli" bayrağı elle set edilmez, buradan TÜRETİLİR: kullanıcı bir değeri değiştirip
 * eskisine geri dönerse satır kirli olmaktan çıkar ve kaydetmeye girmez.
 */
import { formatDiscountChain } from "~/utils/purchaseConditionDiscounts";

export interface LineSnapshot {
  grossPrice: number;
  discounts: (number | null)[];
  /** Seçili satış listesindeki fiyat; liste seçili değilse veya tanımlı değilse null. */
  salesPrice: number | null;
  salesDiscountCode: string | null;
  /** Satış fiyatının girildiği birim (1-4). */
  salesUnitNo: number;
}

export interface LineChange {
  priceChanged: boolean;
  discountsChanged: boolean;
  salesPriceChanged: boolean;
  salesDiscountChanged: boolean;
  before: LineSnapshot;
  after: LineSnapshot;
  /** "5+3" gibi okunur zincir; iskonto yoksa boş. */
  beforeChain: string;
  afterChain: string;
}

const EPSILON = 0.00001;
const same = (a: number | null | undefined, b: number | null | undefined) =>
  Math.abs((a ?? 0) - (b ?? 0)) < EPSILON;
const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "") === (b ?? "");

export const snapshotsEqual = (a: LineSnapshot, b: LineSnapshot): boolean =>
  same(a.grossPrice, b.grossPrice) &&
  a.discounts.every((value, tier) => same(value, b.discounts[tier])) &&
  same(a.salesPrice, b.salesPrice) &&
  sameText(a.salesDiscountCode, b.salesDiscountCode) &&
  a.salesUnitNo === b.salesUnitNo;

export const describeChange = (before: LineSnapshot, after: LineSnapshot): LineChange | null => {
  const priceChanged = !same(before.grossPrice, after.grossPrice);
  const discountsChanged = !before.discounts.every((value, tier) => same(value, after.discounts[tier]));
  // Birim değişimi de fiyat değişimidir: aynı sayı, farklı birimde başka bir fiyattır.
  const salesPriceChanged =
    !same(before.salesPrice, after.salesPrice) || before.salesUnitNo !== after.salesUnitNo;
  const salesDiscountChanged = !sameText(before.salesDiscountCode, after.salesDiscountCode);

  if (!priceChanged && !discountsChanged && !salesPriceChanged && !salesDiscountChanged) return null;

  return {
    priceChanged,
    discountsChanged,
    salesPriceChanged,
    salesDiscountChanged,
    before,
    after,
    beforeChain: formatDiscountChain(before.discounts),
    afterChain: formatDiscountChain(after.discounts),
  };
};
