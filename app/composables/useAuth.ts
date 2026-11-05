// useAuth: JWT yönetimi + refresh rotation — B2B composables/useAuth.ts'ten port.
// Kimlik B2B ile ORTAK (aynı AspNet Identity + OTP oturumu, ClientType=web);
// bu origin kendi refresh cookie'sini taşır, iki uygulamanın oturumları bağımsızdır.

const STORAGE_KEY = "timon.auth";
const REFRESH_LOCK_KEY = `${STORAGE_KEY}.refresh-lock`;
const TAB_ID_KEY = `${STORAGE_KEY}.tab-id`;
const PROACTIVE_REFRESH_MS = 60_000; // refresh 60s before expiry
const REFRESH_LOCK_TIMEOUT_MS = 15_000;
const REFRESH_SYNC_WAIT_MS = 12_000;
const REFRESH_SYNC_POLL_MS = 250;

export interface AuthUser {
  userId: string;
  email: string | null;
  emailConfirmed: boolean;
  fullName: string | null;
  phoneNumber: string | null;
  cariKod: string | null;
  plasiyerKod: string | null;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
}

interface PersistedAuth {
  token: string;
  expiresAtUtc: string;
  authVersion: number | null;
  user: AuthUser;
}

interface RefreshEnvelope {
  success: boolean;
  data?: {
    accessToken: string;
    expiresAtUtc: string;
    authVersion?: number | null;
  };
  errorCode?: string;
  message?: string;
}

interface CurrentUserEnvelope {
  success: boolean;
  data?: {
    userId: string;
    email: string;
    emailConfirmed?: boolean;
    userName?: string | null;
    fullName?: string | null;
    phoneNumber?: string | null;
    cariKod?: string | null;
    plasiyerKod?: string | null;
    avatarUrl?: string | null;
    roles?: string[];
    permissions?: string[];
  };
  errorCode?: string;
  message?: string;
}

interface RefreshLockState {
  ownerId: string;
  expiresAtMs: number;
}

const empty: AuthUser = {
  userId: "",
  email: null,
  emailConfirmed: true,
  fullName: null,
  phoneNumber: null,
  cariKod: null,
  plasiyerKod: null,
  avatarUrl: null,
  roles: [],
  permissions: [],
};

// B2B'nin legacy rol-adı normalizasyonuna ERP'de gerek yok; yetki ERP izinlerinden
// gelir (useErpPermissions), roller yalnız görüntü/admin-bypass içindir.
const normalizeRoles = (roles?: string[]) =>
  Array.from(new Set((roles ?? []).map((role) => role.trim()).filter(Boolean)));

export const useAuth = () => {
  const token = useState<string | null>("auth.token", () => null);
  const expiresAtUtc = useState<string | null>("auth.expires", () => null);
  const authVersion = useState<number | null>("auth.version", () => null);
  const user = useState<AuthUser>("auth.user", () => ({ ...empty }));
  // Singleton refresh promise to deduplicate concurrent refresh attempts.
  const refreshInFlight = useState<Promise<boolean> | null>(
    "auth.refreshInFlight",
    () => null,
  );
  // Timer handle for proactive refresh; client-only.
  const refreshTimer = useState<ReturnType<typeof setTimeout> | null>(
    "auth.refreshTimer",
    () => null,
  );
  const syncInitialized = useState<boolean>(
    "auth.syncInitialized",
    () => false,
  );
  const tabId = useState<string>("auth.tabId", () => "");
  const restoreInFlight = useState<Promise<void> | null>(
    "auth.restoreInFlight",
    () => null,
  );

  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  const isAuthenticated = computed(() => !!token.value);

  const readTokenAuthVersion = (rawToken?: string | null) => {
    if (!rawToken) return null;

    const segments = rawToken.split(".");
    if (segments.length < 2) return null;

    try {
      const payload = JSON.parse(
        atob(segments[1]!.replace(/-/g, "+").replace(/_/g, "/")),
      ) as { auth_version?: number | string };
      const rawVersion = payload.auth_version;
      if (typeof rawVersion === "number" && Number.isFinite(rawVersion)) {
        return rawVersion;
      }
      if (typeof rawVersion === "string") {
        const parsed = Number(rawVersion);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const isStaleSessionError = (error: unknown) => {
    const data = (error as { data?: { errorCode?: string } })?.data;
    return data?.errorCode === "AUTH_VERSION_STALE";
  };

  const parsePersistedAuth = (raw: string | null): PersistedAuth | null => {
    if (!raw) return null;

    try {
      return JSON.parse(raw) as PersistedAuth;
    } catch {
      return null;
    }
  };

  const parseRefreshLock = (raw: string | null): RefreshLockState | null => {
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<RefreshLockState>;
      if (
        typeof parsed.ownerId !== "string" ||
        typeof parsed.expiresAtMs !== "number" ||
        !Number.isFinite(parsed.expiresAtMs)
      ) {
        return null;
      }

      return {
        ownerId: parsed.ownerId,
        expiresAtMs: parsed.expiresAtMs,
      };
    } catch {
      return null;
    }
  };

  const isExpiredTimestamp = (value?: string | null) => {
    if (!value) return false;
    return new Date(value).getTime() <= Date.now();
  };

  const ensureTabId = () => {
    if (!import.meta.client) return "";
    if (tabId.value) return tabId.value;

    const existing = window.sessionStorage.getItem(TAB_ID_KEY);
    if (existing) {
      tabId.value = existing;
      return existing;
    }

    const created =
      window.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.sessionStorage.setItem(TAB_ID_KEY, created);
    tabId.value = created;
    return created;
  };

  const applyPersistedAuth = (parsed: PersistedAuth) => {
    const tokenAuthVersion = readTokenAuthVersion(parsed.token);
    const persistedAuthVersion = parsed.authVersion ?? tokenAuthVersion;
    const persistedUser = parsed.user ?? empty;

    if (
      parsed.authVersion != null &&
      tokenAuthVersion != null &&
      parsed.authVersion !== tokenAuthVersion
    ) {
      void logoutLocal();
      return false;
    }

    token.value = parsed.token;
    expiresAtUtc.value = parsed.expiresAtUtc;
    authVersion.value = persistedAuthVersion;
    user.value = {
      ...empty,
      ...persistedUser,
      roles: normalizeRoles(persistedUser.roles),
      permissions: persistedUser.permissions ?? [],
    };

    return true;
  };

  const applyUserProfile = (profile: CurrentUserEnvelope["data"]) => {
    if (!profile) return;

    user.value = {
      userId: profile.userId,
      email: profile.email ?? null,
      emailConfirmed: profile.emailConfirmed ?? true,
      fullName: profile.fullName ?? null,
      phoneNumber: profile.phoneNumber ?? null,
      cariKod: profile.cariKod ?? null,
      plasiyerKod: profile.plasiyerKod ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      roles: normalizeRoles(profile.roles),
      permissions: profile.permissions ?? [],
    };
  };

  const hasHydratedUser = () => Boolean(user.value.userId);

  const loadCurrentUser = async () => {
    if (!token.value) return false;

    const response = await $fetch<CurrentUserEnvelope>("/api/v1/auth/me", {
      baseURL: apiBase,
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });

    if (!response?.success || !response.data) {
      return false;
    }

    applyUserProfile(response.data);
    persist();
    return true;
  };

  // Token yenile ve /me çağır; başarısız olursa sessizce false döner — logout yok.
  // restore() içinde cached data varken kullanılır.
  const silentRefreshAndLoad = async (): Promise<boolean> => {
    // Kilitli bir refresh zaten uçuyorsa ikinci bir ağ refresh'i AÇMA (aynı cookie ile
    // eşzamanlı rotation yarışını önler). Onun sonucunu bekle; başarısızsa cached ile devam.
    if (refreshInFlight.value) {
      const ok = await refreshInFlight.value.catch(() => false);
      return ok || hasHydratedUser();
    }
    try {
      const res = await $fetch<RefreshEnvelope>("/api/v1/auth/refresh", {
        baseURL: apiBase,
        method: "POST",
        credentials: "include",
      });
      if (!res?.success || !res.data?.accessToken) return false;
      token.value = res.data.accessToken;
      expiresAtUtc.value = res.data.expiresAtUtc;
      authVersion.value =
        res.data.authVersion ?? readTokenAuthVersion(res.data.accessToken);
      const hydrated = await loadCurrentUser().catch(() => false);
      if (hydrated) persist();
      return hydrated;
    } catch {
      return false;
    }
  };

  const persist = () => {
    if (!import.meta.client) return;
    if (!token.value) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: PersistedAuth = {
      token: token.value,
      expiresAtUtc: expiresAtUtc.value || "",
      authVersion: authVersion.value,
      user: user.value,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const clearRefreshTimer = () => {
    if (!import.meta.client) return;
    if (refreshTimer.value) {
      clearTimeout(refreshTimer.value);
      refreshTimer.value = null;
    }
  };

  const scheduleProactiveRefresh = () => {
    if (!import.meta.client) return;
    clearRefreshTimer();
    if (!expiresAtUtc.value) return;
    const expiryMs = new Date(expiresAtUtc.value).getTime();
    if (Number.isNaN(expiryMs)) return;
    const delay = expiryMs - Date.now() - PROACTIVE_REFRESH_MS;
    if (delay <= 0) {
      // Already past the proactive window — try immediately.
      void refresh();
      return;
    }
    refreshTimer.value = setTimeout(() => {
      void refresh();
    }, delay);
  };

  const readRefreshLock = () => {
    if (!import.meta.client) return null;
    return parseRefreshLock(window.localStorage.getItem(REFRESH_LOCK_KEY));
  };

  const clearRefreshLock = (ownerId?: string) => {
    if (!import.meta.client) return;

    const existing = readRefreshLock();
    if (!existing) return;

    const isOwnedByCaller = !ownerId || existing.ownerId === ownerId;
    const isExpired = existing.expiresAtMs <= Date.now();
    if (isOwnedByCaller || isExpired) {
      window.localStorage.removeItem(REFRESH_LOCK_KEY);
    }
  };

  const tryAcquireRefreshLock = (ownerId: string) => {
    if (!import.meta.client || !ownerId) return true;

    const now = Date.now();
    const existing = readRefreshLock();
    if (
      existing &&
      existing.ownerId !== ownerId &&
      existing.expiresAtMs > now
    ) {
      return false;
    }

    const nextLock: RefreshLockState = {
      ownerId,
      expiresAtMs: now + REFRESH_LOCK_TIMEOUT_MS,
    };

    window.localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(nextLock));
    const confirmed = readRefreshLock();
    return confirmed?.ownerId === ownerId;
  };

  const waitForPeerRefresh = async (
    previousToken: string | null,
    previousExpiry: string | null,
  ) => {
    if (!import.meta.client) return false;

    const deadline = Date.now() + REFRESH_SYNC_WAIT_MS;

    while (Date.now() < deadline) {
      const persisted = parsePersistedAuth(
        window.localStorage.getItem(STORAGE_KEY),
      );
      if (
        persisted &&
        (persisted.token !== previousToken ||
          persisted.expiresAtUtc !== previousExpiry)
      ) {
        if (!applyPersistedAuth(persisted)) return false;

        if (isExpiredTimestamp(persisted.expiresAtUtc)) {
          return false;
        }

        scheduleProactiveRefresh();
        return true;
      }

      const existingLock = readRefreshLock();
      if (!existingLock || existingLock.expiresAtMs <= Date.now()) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, REFRESH_SYNC_POLL_MS));
    }

    return (
      token.value !== previousToken || expiresAtUtc.value !== previousExpiry
    );
  };

  const initializeCrossTabSync = () => {
    if (!import.meta.client || syncInitialized.value) return;

    ensureTabId();

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;

      if (!event.newValue) {
        if (token.value) {
          void logoutLocal();
        }
        return;
      }

      const persisted = parsePersistedAuth(event.newValue);
      if (!persisted) return;
      if (!applyPersistedAuth(persisted)) return;

      useErpPermissions().reset();
      if (isExpiredTimestamp(persisted.expiresAtUtc)) {
        void refresh();
        return;
      }

      scheduleProactiveRefresh();
    });

    syncInitialized.value = true;
  };

  // Eşzamanlı refresh yarışında (çoklu sekme / HMR / üst üste binen timer'lar) bu istek
  // 401 alsa bile, kazanan başka bir istek localStorage'a taze ve geçerli bir token yazmış
  // olabilir. Logout etmeden önce onu benimse — böylece yarış kaybeden istek oturumu düşürmez.
  const adoptFresherPersistedSession = (
    previousToken: string | null,
    previousExpiry: string | null,
  ) => {
    if (!import.meta.client) return false;
    const persisted = parsePersistedAuth(
      window.localStorage.getItem(STORAGE_KEY),
    );
    if (!persisted) return false;
    const isSameSession =
      persisted.token === previousToken &&
      persisted.expiresAtUtc === previousExpiry;
    if (isSameSession) return false;
    if (isExpiredTimestamp(persisted.expiresAtUtc)) return false;
    if (!applyPersistedAuth(persisted)) return false;
    scheduleProactiveRefresh();
    return true;
  };

  const refresh = async (): Promise<boolean> => {
    if (!import.meta.client) return false;
    initializeCrossTabSync();
    if (refreshInFlight.value) return refreshInFlight.value;

    const ownerId = ensureTabId();
    const previousToken = token.value;
    const previousExpiry = expiresAtUtc.value;

    const attempt = (async () => {
      let ownsRefreshLock = false;

      try {
        ownsRefreshLock = tryAcquireRefreshLock(ownerId);
        if (!ownsRefreshLock) {
          const synchronized = await waitForPeerRefresh(
            previousToken,
            previousExpiry,
          );
          if (synchronized) {
            return true;
          }

          ownsRefreshLock = tryAcquireRefreshLock(ownerId);
          if (!ownsRefreshLock) {
            return false;
          }
        }

        const res = await $fetch<RefreshEnvelope>("/api/v1/auth/refresh", {
          baseURL: apiBase,
          method: "POST",
          credentials: "include",
        });
        if (!res?.success || !res.data?.accessToken) {
          // Sunucu yetkisel kesin red dönmedi (bozuk/geçici yanıt — ör. backend yeniden
          // başlarken proxy'den gelen JSON olmayan gövde). Token'ları KORU, logout etme;
          // sonraki tetiklemede yeniden denenir. Kardeş bir refresh token yazdıysa onu benimse.
          if (adoptFresherPersistedSession(previousToken, previousExpiry)) {
            return true;
          }
          return false;
        }
        token.value = res.data.accessToken;
        expiresAtUtc.value = res.data.expiresAtUtc;
        authVersion.value =
          res.data.authVersion ?? readTokenAuthVersion(res.data.accessToken);
        // Her zaman /me çağır — token yenilendikten sonra roller güncellenmiş olabilir.
        // Ancak token az önce geçerli bir refresh cookie'sinden ÜRETİLDİ; oturum meşru.
        // /me geçici olarak başarısız olsa da (ağ/5xx) logout ETME — bağlantı hatası
        // asla tekrar giriş istememeli; roller sonraki /me çağrısında hidratlanır.
        await loadCurrentUser().catch(() => false);
        persist();
        scheduleProactiveRefresh();
        return true;
      } catch (error) {
        const isClientError =
          (error as any)?.status === 400 ||
          (error as any)?.status === 401 ||
          (error as any)?.status === 403 ||
          (error as any)?.statusCode === 400 ||
          (error as any)?.statusCode === 401 ||
          (error as any)?.statusCode === 403;

        if (isStaleSessionError(error) || isClientError) {
          // 401/403 ya da stale-session: logout etmeden önce, eşzamanlı bir refresh'in
          // (başka sekme/istek) bu sırada yazdığı taze geçerli token var mı bak. Varsa
          // benimse — bu sadece bir rotation yarışıydı, gerçek bir red değil.
          if (adoptFresherPersistedSession(previousToken, previousExpiry)) {
            return true;
          }
          await logoutLocal();
        }
        return false;
      } finally {
        if (ownsRefreshLock) {
          clearRefreshLock(ownerId);
        }
        refreshInFlight.value = null;
      }
    })();

    refreshInFlight.value = attempt;
    return attempt;
  };

  const restore = async () => {
    if (!import.meta.client) return;
    initializeCrossTabSync();
    if (restoreInFlight.value) return restoreInFlight.value;

    const attempt = (async () => {
      try {
        if (token.value) {
          // setSession sonrası: user verisi zaten dolu ve token süresi geçerliyse
          // /me çağrısını atla — middleware'i bekletmeden navigasyon devam edebilsin.
          if (hasHydratedUser() && !isExpiredTimestamp(expiresAtUtc.value)) {
            scheduleProactiveRefresh();
            return;
          }
          const loaded = await loadCurrentUser().catch(() => false);
          if (!loaded) await silentRefreshAndLoad();
          return;
        }

        const parsed = parsePersistedAuth(
          window.localStorage.getItem(STORAGE_KEY),
        );
        if (!parsed) {
          window.localStorage.removeItem(STORAGE_KEY);
          await refresh();
          return;
        }

        if (!applyPersistedAuth(parsed)) {
          return;
        }

        if (isExpiredTimestamp(parsed.expiresAtUtc)) {
          // Don't clear immediately — try refresh first; cookie may still be valid.
          await refresh();
          return;
        }

        // Taze kullanıcı verisi çek.
        const loaded = await loadCurrentUser().catch(() => false);
        if (!loaded) {
          // /me başarısız (JWT stale olabilir) — sessiz refresh dene.
          // Başarısız olursa cached data ile devam et, logout yapma.
          await silentRefreshAndLoad();
        }
        scheduleProactiveRefresh();
      } finally {
        restoreInFlight.value = null;
      }
    })();

    restoreInFlight.value = attempt;
    return attempt;
  };

  const setSession = (loginResponse: {
    accessToken: string;
    expiresAtUtc: string;
    authVersion?: number | null;
    userId: string;
    email?: string | null;
    emailConfirmed?: boolean;
    fullName?: string | null;
    phoneNumber?: string | null;
    cariKod?: string | null;
    plasiyerKod?: string | null;
    avatarUrl?: string | null;
    roles?: string[];
    permissions?: string[];
  }) => {
    initializeCrossTabSync();
    token.value = loginResponse.accessToken;
    expiresAtUtc.value = loginResponse.expiresAtUtc;
    authVersion.value =
      loginResponse.authVersion ??
      readTokenAuthVersion(loginResponse.accessToken);
    user.value = {
      userId: loginResponse.userId,
      email: loginResponse.email ?? null,
      emailConfirmed: loginResponse.emailConfirmed ?? true,
      fullName: loginResponse.fullName ?? null,
      phoneNumber: loginResponse.phoneNumber ?? null,
      cariKod: loginResponse.cariKod ?? null,
      plasiyerKod: loginResponse.plasiyerKod ?? null,
      avatarUrl: loginResponse.avatarUrl ?? null,
      roles: normalizeRoles(loginResponse.roles),
      permissions: loginResponse.permissions ?? [],
    };
    useErpPermissions().reset();
    persist();
    scheduleProactiveRefresh();
  };

  const logoutLocal = async () => {
    clearRefreshTimer();
    clearRefreshLock(tabId.value || undefined);
    token.value = null;
    expiresAtUtc.value = null;
    authVersion.value = null;
    user.value = { ...empty };
    useErpPermissions().reset();
    // Kullanıcıya ait istemci durumu TÜM çıkış yollarında (401, sekmeler arası, refresh hatası,
    // menü) burada sıfırlanır: sonraki kullanıcı öncekinin sekmelerini ve izinle süzülmüş
    // seçim listelerini görüyordu.
    useState("workspace-tabs").value = [{ path: "/", title: "Genel Bakış" }];
    useState("products:navCodes").value = [];
    invalidateLookups();
    persist();
  };

  const logout = async () => {
    if (import.meta.client) {
      try {
        await $fetch("/api/v1/auth/logout", {
          baseURL: apiBase,
          method: "POST",
          credentials: "include",
        });
      } catch {
        // ignore — best-effort revoke
      }
    }
    await logoutLocal();
    await navigateTo("/login");
  };

  return {
    token,
    expiresAtUtc,
    authVersion,
    user,
    isAuthenticated,
    setSession,
    logout,
    restore,
    refresh,
  };
};
