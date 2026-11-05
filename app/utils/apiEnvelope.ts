// WebApiResponse<T> zarfı — .NET API sözleşmesi (B2B ile birebir aynı).
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  errors?: string[];
  traceId?: string;
  timestamp?: string;
}

// ValidationFail() backend'de her zaman jenerik bir message döner; asıl detay
// errors[]'dadır — o yüzden errors doluysa message'dan önce gelir.
export const resolveEnvelopeErrorMessage = (
  envelope: ApiEnvelope<unknown> | undefined,
  fallback = "API çağrısı başarısız",
): string => {
  if (envelope?.errors?.length) return envelope.errors.join(" ");
  return envelope?.message || fallback;
};

/** useApi hatasının HTTP durumu (createError → statusCode); bilinmiyorsa 0 (ağ hatası dahil). */
export const errorStatus = (err: unknown): number => {
  if (typeof err !== "object" || err === null) return 0;
  const e = err as { statusCode?: unknown; status?: unknown };
  return Number(e.statusCode ?? e.status ?? 0) || 0;
};

/**
 * Kullanıcıya gösterilecek hata metni — feature composable'larının TEK messageOf'u.
 * Sıra: zarfın errors[]'ı (asıl alan/satır detayı) → err.message (useApi.normalizeError zaten
 * errors[]'ı tercih eder) → zarfın message'ı → fallback. Zarfın jenerik message'ı ÖNCE gelmez:
 * ValidationFail() hep "Doğrulama hatası" yazar ve hangi alanın düştüğünü saklar.
 */
export const errorMessage = (err: unknown, fallback: string): string => {
  const data = typeof err === "object" && err !== null ? (err as { data?: ApiEnvelope<unknown> }).data : undefined;
  if (data?.errors?.length) return data.errors.join(" ");
  if (err instanceof Error && err.message) return err.message;
  return data?.message || fallback;
};
