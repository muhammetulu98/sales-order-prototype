// ERP izin durumu — kaynak GET /api/erp/permissions/mine (rol→izin ataması,
// kullanıcının "ERP bayrağı" budur). Frontend gating güvenlik değildir; asıl
// zorlama API'deki RequireErpPermission'dadır. ERP branch'inden port.

import {
  hasAnyPermission,
  hasPermission,
  isAdminRole,
  isSuperAdminRole,
} from "~/utils/permissions";

interface ErpPermissionsState {
  permissions: string[];
  loaded: boolean;
}

let loadPromise: Promise<void> | null = null;

export const useErpPermissions = () => {
  const state = useState<ErpPermissionsState>("erp-permissions", () => ({
    permissions: [],
    loaded: false,
  }));
  const auth = useAuth();
  const api = useApi();

  const load = async (force = false) => {
    if (!auth.isAuthenticated.value) {
      state.value = { permissions: [], loaded: false };
      return;
    }
    if (state.value.loaded && !force) return;
    if (loadPromise) return loadPromise;

    loadPromise = api
      .request<string[]>("/api/erp/permissions/mine")
      .then((permissions) => {
        state.value = { permissions, loaded: true };
      })
      .finally(() => {
        loadPromise = null;
      });
    return loadPromise;
  };

  const can = (permission: string) =>
    hasPermission(state.value.permissions, permission);

  const canAny = (...permissions: string[]) =>
    hasAnyPermission(state.value.permissions, permissions);

  const isAdminUser = () => auth.user.value.roles.some((role) => isAdminRole(role));

  // Personel denetimi ekranları (Aktivite) yalnız Süper Admin'e görünür.
  const isSuperAdmin = computed(() =>
    auth.user.value.roles.some((role) => isSuperAdminRole(role)),
  );

  const reset = () => {
    state.value = { permissions: [], loaded: false };
  };

  return {
    permissions: computed(() => state.value.permissions),
    loaded: computed(() => state.value.loaded),
    load,
    can,
    canAny,
    isAdminUser,
    isSuperAdmin,
    reset,
  };
};
