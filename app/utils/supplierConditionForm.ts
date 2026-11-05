// Kayıtlı bir satınalma şartını düzenleme formuna çeviren TEK eşleme. Üç yerden kullanılıyor
// (şart editörü, onay ekranı, sipariş ekranındaki spot şart diyaloğu); kopyalandığında yeni
// eklenen bir alan bir kopyada unutulup sessizce null'a düşüyordu.
import type {
  SupplierCondition,
  SupplierConditionUpsertInput,
} from "~/composables/useSupplierPurchaseConditions";

export const toConditionForm = (c: SupplierCondition): SupplierConditionUpsertInput => ({
  supplierCode: c.supplierCode,
  paymentTermType: c.paymentTermType,
  paymentTermDays: c.paymentTermDays,
  paymentTermFixedDate: c.paymentTermFixedDate,
  coverage: c.coverage,
  brandCodes: c.brands.map((b) => b.brandCode),
  purchaseDiscount1Percent: c.purchaseDiscount1Percent,
  purchaseDiscount2Percent: c.purchaseDiscount2Percent,
  purchaseDiscount3Percent: c.purchaseDiscount3Percent,
  purchaseDiscount4Percent: c.purchaseDiscount4Percent,
  purchaseDiscount5Percent: c.purchaseDiscount5Percent,
  purchaseDiscount6Percent: c.purchaseDiscount6Percent,
  campaignDiscountPercent: c.campaignDiscountPercent,
  insertDiscountPercent: c.insertDiscountPercent,
  shippingIncluded: c.shippingIncluded,
  shippingDiscountPercent: c.shippingDiscountPercent,
  defectiveProductBudgetPercent: c.defectiveProductBudgetPercent,
  hasReturnRight: c.hasReturnRight,
  yearEndBonusPercent: c.yearEndBonusPercent,
  yearEndBonusPeriod: c.yearEndBonusPeriod ?? "Yearly",
  yearEndDiscountPercent: c.yearEndDiscountPercent,
  turnoverBonusPercent: c.turnoverBonusPercent,
  turnoverBonusPeriod: c.turnoverBonusPeriod ?? "Yearly",
  staffBonusPercent: c.staffBonusPercent,
  staffBonusPeriod: c.staffBonusPeriod ?? "Yearly",
  projectCode: c.projectCode,
  depotNo: c.depotNo,
  validFrom: c.validFrom.slice(0, 10),
  isActive: c.isActive,
  isFairCondition: c.isFairCondition,
  salesListNo: c.salesListNo,
  salesDiscountCode: c.salesDiscountCode,
  salesMarkupPercent: c.salesMarkupPercent,
});
