// Belge tutar hesabı — kademeli iskonto, KDV kırılımı ve TL biçimlendirme.
//
// Legacy ASF2'de bu hesap 3.400 satırlık formun içindeydi ve satış iskonto 3..6
// kademeleri hep 2. kademeden kopyalanıyordu (bilinen bug). Burada her kademe
// bağımsızdır; davranış tests/money.test.ts ile sabitlenir.
//
// İstemci hesabı YALNIZ ÖNİZLEMEDİR: kaydedilen/bağlayıcı tutarı sunucu üretir.

export const round2 = (value: number) =>
  Math.sign(value) * (Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100);

/** Kademeli iskonto: her kademe bir öncekinin kalanına uygulanır (1+2+3 ≠ 6). */
export const applyDiscountChain = (
  base: number,
  discounts: readonly (number | null | undefined)[],
) => {
  let net = base;
  for (const discount of discounts) {
    const rate = typeof discount === "number" ? discount : Number(discount ?? 0);
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const clamped = Math.min(100, rate);
    net -= (net * clamped) / 100;
  }
  return net;
};

export const lineGross = (quantity: number | null, unitPrice: number | null) =>
  (quantity ?? 0) * (unitPrice ?? 0);

export const lineNet = (
  quantity: number | null,
  unitPrice: number | null,
  discounts: readonly (number | null | undefined)[],
) => applyDiscountChain(lineGross(quantity, unitPrice), discounts);

/**
 *   Hedef net birim fiyatı veren tek iskonto yüzdesi — legacy "Tersten İskonto Yap".
 *   Brüt sıfır/negatifse veya hedef brütü aşıyorsa hesap tanımsızdır (null).
 */
export const reverseDiscountPercent = (
  grossPrice: number,
  targetNetPrice: number,
): number | null => {
  if (grossPrice <= 0 || targetNetPrice < 0 || targetNetPrice > grossPrice) return null;
  return round2(((grossPrice - targetNetPrice) / grossPrice) * 100);
};

/** Kâr yüzdesi (alış netine göre). Alış yoksa kâr tanımsızdır. */
export const profitPercent = (purchaseNet: number, salesNet: number): number | null =>
  purchaseNet <= 0 ? null : ((salesNet - purchaseNet) / purchaseNet) * 100;

export interface AmountLine {
  quantity: number | null;
  unitPrice: number | null;
  discounts: readonly (number | null | undefined)[];
  taxRatePercent: number;
}

export interface TaxBucket {
  ratePercent: number;
  base: number;
  tax: number;
}

export interface AmountSummary {
  /** İskonto öncesi toplam (miktar × birim fiyat). */
  gross: number;
  /** Kademeli iskontoların götürdüğü tutar. */
  discount: number;
  /** KDV matrahı = brüt − iskonto. */
  base: number;
  taxTotal: number;
  /** Genel toplam = matrah + KDV. */
  total: number;
  /** Oran bazlı matrah/KDV kırılımı — oranı artan sırada, yalnız kullanılan oranlar. */
  taxBuckets: TaxBucket[];
}

/** Belge tarafının (alış veya satış) mali özeti: brüt → iskonto → matrah → KDV → genel. */
export const summarize = (lines: readonly AmountLine[]): AmountSummary => {
  const buckets = new Map<number, TaxBucket>();
  let gross = 0;
  let base = 0;

  for (const line of lines) {
    const lineGrossAmount = lineGross(line.quantity, line.unitPrice);
    const lineBase = applyDiscountChain(lineGrossAmount, line.discounts);
    gross += lineGrossAmount;
    base += lineBase;

    const bucket = buckets.get(line.taxRatePercent) ?? {
      ratePercent: line.taxRatePercent,
      base: 0,
      tax: 0,
    };
    bucket.base += lineBase;
    bucket.tax += (lineBase * line.taxRatePercent) / 100;
    buckets.set(line.taxRatePercent, bucket);
  }

  const taxBuckets = [...buckets.values()].sort((a, b) => a.ratePercent - b.ratePercent);
  const taxTotal = taxBuckets.reduce((sum, bucket) => sum + bucket.tax, 0);

  return { gross, discount: gross - base, base, taxTotal, total: base + taxTotal, taxBuckets };
};

/**
 *   Hedef genel toplama ulaşmak için birim fiyatlara uygulanacak çarpan — legacy
 *   "Toplam Düzelt". Mevcut toplam sıfırsa oran tanımsızdır.
 */
export const scaleFactorTo = (currentTotal: number, targetTotal: number): number | null =>
  currentTotal <= 0 || targetTotal < 0 ? null : targetTotal / currentTotal;

const moneyFormat = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormat = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export const formatMoney = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : moneyFormat.format(value);

export const formatQuantity = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : quantityFormat.format(value);

export const formatPercent = (value: number | null | undefined, fractionDigits = 1) =>
  value === null || value === undefined ? "—" : `%${value.toFixed(fractionDigits)}`;

/**
 * Kullanıcının yazdığı / yapıştırdığı sayıyı okur — uygulamadaki TEK ayrıştırıcı. Geçersiz → null
 * (0'a dönmez; çağıran hata göstermeli).
 * "1.234,56" / "1,234.56" / "1234,56" / "120.5" → ondalık; tek ayraçlı "1.000" / "15.000.000"
 * Türkçe binlik sayılır (Excel'den TR biçimli kopya "1.000" bin demektir, bir değil).
 * "0.400" binlik sayılmaz (baştaki 0 binlik grubu olamaz).
 */
export const parseDecimal = (raw: string | number | null | undefined): number | null => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const text = (raw ?? "").trim().replace(/\s/g, "");
  if (!text) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized = text;
  // Hem nokta hem virgül varsa sondaki ayraç ondalık, öteki binliktir.
  if (lastComma >= 0 && lastDot >= 0)
    normalized = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  else if (lastComma >= 0)
    normalized = text.indexOf(",") === lastComma ? text.replace(",", ".") : text.replace(/,/g, "");
  else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(text)) normalized = text.replace(/\./g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

/** Para birimi simgeli tutar ("₺1.234,50"); null/NaN → "—" (sessizce ₺0,00 göstermez). */
export const formatCurrency = (value: number | null | undefined, currency = "TRY") =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
