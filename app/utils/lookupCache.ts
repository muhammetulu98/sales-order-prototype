// Sözlük (lookup) önbelleği: depo, temsilci, bölge, ödeme planı gibi listeler.
// Önbellekte varsa ANINDA döner ve (son tazelemeden 30 sn geçtiyse) arka planda güncel hâli
// çeker — değişiklik en geç bir sonraki açılışta görünür. 60 dk'dan eski kayıt beklenerek
// tazelenir. Üst bardaki "Listeleri yenile" ve oturum kapatma önbelleği tamamen sıfırlar.
// Aynı anda gelen istekler tek isteği paylaşır; hata önbelleğe yazılmaz. SPA (ssr: false)
// olduğu için modül düzeyi Map yeterli — sayfa yenilenince (F5) de sıfırlanır.

const REVALIDATE_AFTER_MS = 30_000;
const MAX_AGE_MS = 60 * 60_000;

interface Entry {
  at: number;
  promise: Promise<unknown>;
  settled: boolean;
  refreshing: boolean;
}

const entries = new Map<string, Entry>();

const fetchInto = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const entry: Entry = { at: Date.now(), promise: Promise.resolve(), settled: false, refreshing: false };
  const promise = load().then(
    (value) => {
      entry.settled = true;
      return value;
    },
    (err: unknown) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw err;
    },
  );
  entry.promise = promise;
  entries.set(key, entry);
  return promise;
};

export const cachedLookup = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const hit = entries.get(key);
  if (!hit || Date.now() - hit.at >= MAX_AGE_MS) return fetchInto(key, load);
  if (hit.settled && !hit.refreshing && Date.now() - hit.at >= REVALIDATE_AFTER_MS) {
    // Eski veriyi hemen ver, güncelini arka planda al; başarılı olursa bir sonraki çağrı onu görür.
    hit.refreshing = true;
    load().then(
      (value) => {
        if (entries.get(key) === hit) entries.set(key, { at: Date.now(), promise: Promise.resolve(value), settled: true, refreshing: false });
      },
      () => {
        hit.refreshing = false;
      },
    );
  }
  return hit.promise as Promise<T>;
};

/** Önbelleği temizler: anahtar öneki verilirse yalnız onunla başlayanları. */
export const invalidateLookups = (prefix = "") => {
  for (const key of [...entries.keys()]) if (key.startsWith(prefix)) entries.delete(key);
};
