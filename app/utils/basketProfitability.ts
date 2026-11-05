// Sepet bütçesi (kârlılık) — Timon-B2B-Web `utils/basketProfitability.ts` mantığının prototip kopyası (TB-1040),
// ek olarak kalem kalem döküm üretir (kutuya tıklayınca gösterilir).
// Tedarikçi bazlı, oran toplamalı hesap: alış maliyeti girmez; her tedarikçi sepet ortalamasına bir kez girer.

/** Her vade günü için kâr marjı düzeltmesi (%). İsk 2 satır vadesi de bu oranla hesaplanır (İsk 2 ÷ 0,15). */
export const TERM_DAY_RATE_PERCENT = 0.15;
/** Bu oranın altı "Zarar" (kırmızı), eşit ve üstü "Bütçe" (yeşil). */
export const BUDGET_THRESHOLD_PERCENT = 10;

export interface BasketTerm {
  supplierCode: string;
  supplierName: string;
  /** Sözleşmedeki alış iskontolarının toplamı (%). */
  purchaseDiscountPercent: number;
  /** Sene sonu + ciro primi gibi primlerin toplamı (%). */
  bonusPercent: number;
  purchaseTermDays: number;
  /** Sözleşmedeki satış vadesi (gün). */
  salesTermDays: number;
  /** Sevk adresi bölgesi × ürün grubu nakliye oranı (%). */
  freightRatePercent: number;
  /** Sözleşmeye girilen satış iskontosu (%). */
  contractSalesDiscountPercent: number;
}

export interface BasketLine {
  stockCode: string;
  gross: number;
  net: number;
  /** Satırın kendi vadesi (gün). */
  lineTermDays: number;
  /** Sözleşmesi olmayan stokta null. */
  term: BasketTerm | null;
}

export interface MarginBreakdown {
  purchaseDiscount: number;
  bonus: number;
  /** Satırlardaki tüm iskontolar (eksi). */
  lineDiscount: number;
  /** Sözleşmedeki satış iskontosu (eksi). */
  contractSalesDiscount: number;
  /** (alış vadesi − sözleşme satış vadesi) × 0,15 */
  contractTermDifference: number;
  /** (sözleşme satış vadesi − satır vadesi) × 0,15 */
  orderTermDifference: number;
  /** Nakliye dahilse eksi. */
  freight: number;
}

export const BREAKDOWN_LABELS: Record<keyof MarginBreakdown, string> = {
  purchaseDiscount: "Alış iskontosu",
  bonus: "Prim",
  lineDiscount: "Satış iskontosu (satırlar)",
  contractSalesDiscount: "Sözleşme satış iskontosu",
  contractTermDifference: "Vade farkı (sözleşme)",
  orderTermDifference: "Vade farkı (sipariş)",
  freight: "Nakliye",
};

const emptyBreakdown = (): MarginBreakdown => ({
  purchaseDiscount: 0, bonus: 0, lineDiscount: 0, contractSalesDiscount: 0,
  contractTermDifference: 0, orderTermDifference: 0, freight: 0,
});

export const lineBreakdown = (line: BasketLine, term: BasketTerm, freightIncluded: boolean): MarginBreakdown => ({
  purchaseDiscount: term.purchaseDiscountPercent,
  bonus: term.bonusPercent,
  lineDiscount: -(line.gross > 0 ? ((line.gross - line.net) / line.gross) * 100 : 0),
  contractSalesDiscount: -term.contractSalesDiscountPercent,
  contractTermDifference: (term.purchaseTermDays - term.salesTermDays) * TERM_DAY_RATE_PERCENT,
  orderTermDifference: (term.salesTermDays - line.lineTermDays) * TERM_DAY_RATE_PERCENT,
  freight: freightIncluded ? -term.freightRatePercent : 0,
});

export const breakdownTotal = (b: MarginBreakdown) => Object.values(b).reduce((sum, value) => sum + value, 0);

export interface SupplierMargin {
  supplierCode: string;
  supplierName: string;
  percent: number;
}

export interface BasketBudget {
  /** Hesaba giren tedarikçi yoksa null. */
  percent: number | null;
  status: "budget" | "loss" | null;
  suppliers: SupplierMargin[];
  /** Kalem kalem döküm (tedarikçi ortalaması); toplamı `percent`'tir. */
  breakdown: MarginBreakdown | null;
  /** Sözleşmesi olmayan, hesaba girmeyen stoklar. */
  unmatchedStockCodes: string[];
}

export const calculateBasketBudget = (lines: BasketLine[], freightIncluded: boolean): BasketBudget => {
  const bySupplier = new Map<string, { name: string; weight: number; sum: MarginBreakdown }>();
  const unmatchedStockCodes: string[] = [];

  for (const line of lines) {
    if (!line.term) {
      unmatchedStockCodes.push(line.stockCode);
      continue;
    }
    // Aynı tedarikçinin satırları brüt tutarla ağırlıklanır; tutarsız satır eşit ağırlık alır.
    const weight = line.gross > 0 ? line.gross : 1;
    const parts = lineBreakdown(line, line.term, freightIncluded);
    const acc = bySupplier.get(line.term.supplierCode) ?? { name: line.term.supplierName, weight: 0, sum: emptyBreakdown() };
    acc.weight += weight;
    for (const key of Object.keys(parts) as (keyof MarginBreakdown)[]) acc.sum[key] += weight * parts[key];
    bySupplier.set(line.term.supplierCode, acc);
  }

  const perSupplier = [...bySupplier.entries()].map(([supplierCode, acc]) => {
    const average = emptyBreakdown();
    for (const key of Object.keys(average) as (keyof MarginBreakdown)[]) average[key] = acc.sum[key] / acc.weight;
    return { supplierCode, supplierName: acc.name, average };
  });
  if (!perSupplier.length) return { percent: null, status: null, suppliers: [], breakdown: null, unmatchedStockCodes };

  const breakdown = emptyBreakdown();
  for (const key of Object.keys(breakdown) as (keyof MarginBreakdown)[]) {
    breakdown[key] = perSupplier.reduce((sum, item) => sum + item.average[key], 0) / perSupplier.length;
  }
  const percent = breakdownTotal(breakdown);
  return {
    percent,
    status: percent >= BUDGET_THRESHOLD_PERCENT ? "budget" : "loss",
    suppliers: perSupplier.map((item) => ({ supplierCode: item.supplierCode, supplierName: item.supplierName, percent: breakdownTotal(item.average) })),
    breakdown,
    unmatchedStockCodes,
  };
};
