import type { ErpCustomerAgingRow } from "~/composables/useErpCustomers";

// Cari bakiye yaşlandırması. Kaynak ay bazlı açık bakiye verir; ay farkı yaklaşık gün
// dilimine çevrilir: bu ay 0–30, bir önceki ay 31–60 … dört ay ve öncesi 120+. Gün bazlı
// kesin yaş için kaynağın vade tarihli kalem vermesi gerekir (BEKLEYEN_API_DEGISIKLIKLERI.md).

export interface AgingBand {
  key: string;
  label: string;
  /** Bu dilime düşen ay farkları: 0 = bu ay. Son dilim açık uçlu. */
  minMonths: number;
  maxMonths: number | null;
  balance: number;
  /** Pozitif (borç) toplam içindeki pay, 0–100; borç yoksa null. */
  sharePercent: number | null;
}

export interface AgingMonth extends ErpCustomerAgingRow {
  key: string;
  label: string;
  monthsAgo: number;
  /** En büyük mutlak bakiyeye oranı, 0–100 (satır çubuğu). */
  barPercent: number;
}

export interface AgingSummary {
  bands: AgingBand[];
  /** Yeniden eskiye. */
  months: AgingMonth[];
  total: number;
  /** Borç bakiyesinin bakiye ağırlıklı ortalama yaşı (ay); borç yoksa null. */
  weightedAgeMonths: number | null;
}

const BAND_DEFS = [
  { key: "0-30", label: "0–30 gün", minMonths: 0, maxMonths: 0 },
  { key: "31-60", label: "31–60 gün", minMonths: 1, maxMonths: 1 },
  { key: "61-90", label: "61–90 gün", minMonths: 2, maxMonths: 2 },
  { key: "91-120", label: "91–120 gün", minMonths: 3, maxMonths: 3 },
  { key: "120+", label: "120+ gün", minMonths: 4, maxMonths: null },
] as const;

const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const round2 = (value: number) => Math.round(value * 100) / 100;

export const monthLabel = (year: number, month: number) => `${MONTH_NAMES[month - 1] ?? month} ${year}`;

export const buildAgingSummary = (rows: readonly ErpCustomerAgingRow[], today: Date = new Date()): AgingSummary => {
  const currentIndex = today.getFullYear() * 12 + today.getMonth();
  // Gelecek ay kayıtları (vadesi ileri) bu aya sayılır: monthsAgo negatif olmaz.
  const withAge = rows.map((row) => ({
    ...row,
    monthsAgo: Math.max(0, currentIndex - (row.year * 12 + row.month - 1)),
  }));

  const maxAbs = withAge.reduce((max, row) => Math.max(max, Math.abs(row.balance)), 0);
  const months: AgingMonth[] = [...withAge]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((row) => ({
      ...row,
      key: `${row.year}-${row.month}`,
      label: monthLabel(row.year, row.month),
      barPercent: maxAbs ? Math.round((Math.abs(row.balance) / maxAbs) * 100) : 0,
    }));

  const positiveTotal = withAge.reduce((sum, row) => sum + Math.max(row.balance, 0), 0);
  const bands: AgingBand[] = BAND_DEFS.map((band) => {
    const inBand = withAge.filter(
      (row) => row.monthsAgo >= band.minMonths && (band.maxMonths === null || row.monthsAgo <= band.maxMonths),
    );
    const balance = round2(inBand.reduce((sum, row) => sum + row.balance, 0));
    const positive = inBand.reduce((sum, row) => sum + Math.max(row.balance, 0), 0);
    return {
      ...band,
      balance,
      sharePercent: positiveTotal > 0 ? Math.round((positive / positiveTotal) * 100) : null,
    };
  });

  const weightedAgeMonths =
    positiveTotal > 0
      ? Math.round(
          (withAge.reduce((sum, row) => sum + Math.max(row.balance, 0) * row.monthsAgo, 0) / positiveTotal) * 10,
        ) / 10
      : null;

  return {
    bands,
    months,
    total: round2(withAge.reduce((sum, row) => sum + row.balance, 0)),
    weightedAgeMonths,
  };
};
