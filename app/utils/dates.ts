// Tarih biçimleme — API tarih alanları "YYYY-MM-DD" (DateOnly) veya ISO timestamp döner.
// Boş değer tabloda tire olarak görünür; JetBrains Mono kolonlarında hizayı bozmasın diye
// gün/ay iki haneli sabit biçim kullanılır.

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Yerel (Türkiye) takvim günü "YYYY-MM-DD" — "bugün" varsayılanları ve gün karşılaştırmaları için
 * TEK kaynak. toISOString().slice(0, 10) UTC'dir: 00:00–03:00 arası dünü verir.
 */
export const localIsoDate = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Bugünden (ya da `from`'dan) `days` gün sonrası, yerel gün olarak. */
export const addDays = (days: number, from: Date = new Date()): string => {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
};

/** Bugünden (ya da `from`'dan) `months` ay sonrası, yerel gün olarak. */
export const addMonths = (months: number, from: Date = new Date()): string => {
  const date = new Date(from);
  date.setMonth(date.getMonth() + months);
  return localIsoDate(date);
};
