/**
 * Satış fiyatı ↔ marj dönüşümü. Marj DAİMA satış fiyatı üzerinden hesaplanır (alış üzerinden
 * değil) — defterdeki mevcut "Marj %" kolonu da bu tanımı kullanıyor; iki farklı marj tanımı
 * aynı ekranda dolaşırsa kullanıcı hangi rakamın ne olduğunu bilemez.
 */

/** Satış fiyatı ve alış netinden marj yüzdesi; satış fiyatı pozitif değilse null. */
export const marginFromPrice = (
  salesPrice: number,
  purchaseNet: number,
): number | null => {
  if (!(salesPrice > 0) || !Number.isFinite(purchaseNet)) return null;
  const margin = ((salesPrice - purchaseNet) / salesPrice) * 100;
  return Number.isFinite(margin) ? margin : null;
};

/** Alış neti ve hedef marjdan satış fiyatı; marj %100'e eşit/üstüyse veya alış neti yoksa null. */
export const priceFromMargin = (
  purchaseNet: number,
  marginPercent: number,
): number | null => {
  if (!(purchaseNet > 0) || !Number.isFinite(marginPercent) || marginPercent >= 100) return null;
  return purchaseNet / (1 - marginPercent / 100);
};

/** Verilen adıma yuvarlar; adım pozitif değilse değeri olduğu gibi döner. */
export const roundToStep = (value: number, step: number): number => {
  if (!(step > 0)) return value;
  return Math.round(value / step) * step;
};

/** Yüzde zam/indirim uygular. */
export const applyPercentChange = (value: number, percent: number): number =>
  value * (1 + percent / 100);

/**
 * Listedeki satış fiyatı BRÜT'tür; müşteri onu iskonto kodunun 1. kademesi (genel müşteri
 * grubundaki oran) düşülmüş hâliyle öder. Marj karşılaştırması bu net üzerinden yapılır —
 * brüt satışı alış netiyle kıyaslamak marjı olduğundan yüksek gösterir. Oran yoksa (kodun
 * matriste karşılığı yok) fiyat olduğu gibi döner.
 */
export const salesNetFromList = (
  listPrice: number,
  discount1Percent: number | null | undefined,
): number => listPrice * (1 - (discount1Percent ?? 0) / 100);

/**
 * Tersi: hedef NET satış fiyatından listeye yazılacak brüt fiyat. İskonto %100 veya üstündeyse
 * (veri hatası) brüt türetilemez, net olduğu gibi döner — sıfıra bölme yerine görünür bir değer.
 */
export const listPriceFromSalesNet = (
  salesNet: number,
  discount1Percent: number | null | undefined,
): number => {
  const factor = 1 - (discount1Percent ?? 0) / 100;
  return factor > 0 ? salesNet / factor : salesNet;
};
