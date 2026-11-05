// B2B'den taşınan biçimleyiciler (Fiyat Yönetimi). Tarih için ~/utils/dates, tutar için
// ~/utils/money zaten var (formatCurrency dahil); buradakiler yalnız oradaki adlarla çakışmayanlar.
export const formatFileSize = (bytes: number) => {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
};

export const formatNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value || 0);
