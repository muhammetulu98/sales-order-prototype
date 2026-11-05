// Stok fiziksel durumu — Mikro STOKLAR.sto_ambalaj_kodu (ayna: physicalStateCode).
// İş birimi kararı (2026-10-19): yalnız H = Hazır ve D = Drop. Legacy'nin Hafif/Standart/Orta/
// Dökme/Paletli listesi geçersiz; API sözlüğü ve view adları BEKLEYEN_API madde 23'te. Ekran,
// sözlük gelene kadar bu sabiti kullanır; eski kodlu (S/O/P) kartlar "eski değer" olarak görünür.

export const PHYSICAL_STATES = [
  { code: "H", name: "Hazır" },
  { code: "D", name: "Drop" },
] as const;

export type PhysicalStateCode = (typeof PHYSICAL_STATES)[number]["code"];

export const isValidPhysicalState = (code: string | null | undefined): code is PhysicalStateCode =>
  PHYSICAL_STATES.some((state) => state.code === (code ?? "").trim().toUpperCase());

/** Okunur ad: H/D için yeni ad; başka bir kodsa sunucunun adı ya da kod + "(eski değer)". */
export const physicalStateLabel = (code: string | null | undefined, legacyName?: string | null) => {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) return null;
  const state = PHYSICAL_STATES.find((item) => item.code === normalized);
  return state ? state.name : `${legacyName ?? normalized} (eski değer)`;
};

// Stok finansal durumu — Mikro STOKLAR.sto_reyon_kodu (ayna: financialStateCode). Reyon koduna
// göre etiket rengi: K = Yeşil etiket, B = Beyaz etiket, M = Mavi etiket (iş birimi, 2026-10-19).
// API kaydı zaten yalnız K/B/M kabul ediyor; sözlük adları "Yeşil/Beyaz/Mavi" (madde 23).
export const FINANCIAL_STATES = [
  { code: "K", name: "Yeşil etiket" },
  { code: "B", name: "Beyaz etiket" },
  { code: "M", name: "Mavi etiket" },
] as const;

export type FinancialStateCode = (typeof FINANCIAL_STATES)[number]["code"];

export const isValidFinancialState = (code: string | null | undefined): code is FinancialStateCode =>
  FINANCIAL_STATES.some((state) => state.code === (code ?? "").trim().toUpperCase());

/** Okunur ad: K/B/M için etiket adı; başka bir kodsa kod + "(eski değer)". */
export const financialStateLabel = (code: string | null | undefined, legacyName?: string | null) => {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) return null;
  const state = FINANCIAL_STATES.find((item) => item.code === normalized);
  return state ? state.name : `${legacyName ?? normalized} (eski değer)`;
};

/**
 * Stok birim adları (Mikro sto_birimN_ad, en çok 10 karakter) — stok kartındaki Birim seçimi.
 * Listede olmayan kayıtlı ad seçenek olarak korunur; yeni ad gerekirse buraya eklenir.
 */
export const UNIT_NAMES = [
  "Adet", "Koli", "Paket", "Kutu", "Düzine", "Set", "Takım", "Çift", "Palet",
  "Rulo", "Top", "Kg", "Gr", "Lt", "Ml", "Mt", "Cm", "M²", "M³",
] as const;

/** Seçim listesi: sabit adlar + listede olmayan kayıtlı ad (büyük/küçük harf duyarsız). */
export const unitNameOptions = (current: string | null | undefined): string[] => {
  const name = (current ?? "").trim();
  const known = UNIT_NAMES.some((item) => item.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"));
  return name && !known ? [name, ...UNIT_NAMES] : [...UNIT_NAMES];
};
