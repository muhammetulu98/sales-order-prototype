// useApi: $fetch sarmalayıcısı — JWT enjeksiyonu, zarf açma, 401 → refresh → retry.
// B2B composables/useApi.ts'ten port; sözleşme aynı (ApiEnvelope<T>).

import {
  resolveEnvelopeErrorMessage,
  type ApiEnvelope,
} from "~/utils/apiEnvelope";

type FetchOpts = Parameters<typeof $fetch>[1];

/**
 * `silentError`: çağıran hatayı kendisi ele alıyor (409 çözümü, toplu kaydetmenin
 * satır bazlı raporu). Ortak hata toast'ı bastırılır; ilerleme çubuğu etkilenmez.
 * `raw`: yanıt zarfsızdır (dosya indirme, `responseType: "blob"`); zarf açılmaz, token /
 * 401 → refresh → retry / hata eşlemesi aynen işler.
 */
export type ApiRequestOpts = FetchOpts & { silentError?: boolean; raw?: boolean };

export const useApi = () => {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase as string;
  const auth = useAuth();
  const requestNotifier = useApiRequestNotifier();

  const normalizeError = (err: unknown) => {
    const error = err as {
      statusCode?: number;
      status?: number;
      statusMessage?: string;
      message?: string;
      data?: ApiEnvelope<unknown>;
    };

    const statusCode = error.statusCode || error.status || 500;
    const message = error.data
      ? resolveEnvelopeErrorMessage(
          error.data,
          error.statusMessage || error.message || "API çağrısı başarısız",
        )
      : error.statusMessage || error.message || "API çağrısı başarısız";

    return createError({
      statusCode,
      message,
      data: error.data,
    });
  };

  const send = async <T>(path: string, opts: FetchOpts = {}, raw = false): Promise<T> => {
    // PROTOTİP: backend yok; her istek kurgu veriyle yanıtlanır (bkz. ~/utils/prototypeApi).
    return (await prototypeApi(path, opts as { query?: Record<string, unknown> })) as T;
    const headers: Record<string, string> = {
      ...((opts as { headers?: Record<string, string> }).headers || {}),
    };
    if (auth.token.value) {
      headers["Authorization"] = `Bearer ${auth.token.value}`;
    }
    const response = await $fetch(path, {
      baseURL,
      credentials: "include",
      ...opts,
      headers,
    });
    if (raw) return response as T;
    const envelope = response as ApiEnvelope<T>;
    if (!envelope?.success) {
      throw createError({
        statusCode: 500,
        message: resolveEnvelopeErrorMessage(envelope),
        data: envelope,
      });
    }
    return envelope.data as T;
  };

  const request = async <T>(path: string, opts: ApiRequestOpts = {}): Promise<T> => {
    const { silentError, raw, ...fetchOpts } = (opts ?? {}) as {
      silentError?: boolean;
      raw?: boolean;
    } & Record<string, unknown>;
    const isRefreshRequest = path.startsWith("/api/v1/auth/refresh");
    // İstek başlarken token var mıydı? Misafir bir 401 aldığında sadece hata
    // fırlatılır; yalnızca gerçekten oturumu düşen kullanıcı /login'e atılır.
    const hadToken = !!auth.token.value;

    const executeRequest = async () => {
      try {
        return await send<T>(path, fetchOpts as FetchOpts, raw);
      } catch (err: unknown) {
        const e = err as { statusCode?: number; status?: number };
        const status = e.statusCode || e.status;
        const isAuthPath =
          path.startsWith("/api/v1/auth/refresh") ||
          path.startsWith("/api/v1/auth/logout") ||
          path.startsWith("/api/v1/auth/otp");
        if (status === 401 && import.meta.client && !isAuthPath) {
          const refreshed = await auth.refresh();
          if (refreshed) {
            return await send<T>(path, fetchOpts as FetchOpts, raw);
          }
          if (hadToken && !auth.token.value) {
            await auth.logout();
          }
        }
        throw normalizeError(err);
      }
    };

    if (import.meta.client && !isRefreshRequest) {
      return await requestNotifier.track(executeRequest, { silent: silentError });
    }

    return await executeRequest();
  };

  return { baseURL, request };
};
