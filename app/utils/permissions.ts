// ERP izin eşleştirmesi — saf fonksiyonlar (vitest ile test edilir).
// Ad alanı "ERP.<Resource>.<Action>"; karşılaştırma büyük/küçük harf duyarsız.
// Süper Admin bypass'ı backend çözümleyicidedir (tam katalog döner) — istemcide
// ayrıca rol kontrolü YAPILMAZ.

export const hasPermission = (granted: string[], required: string): boolean =>
  granted.some(
    (candidate) => candidate.toLowerCase() === required.toLowerCase(),
  );

export const hasAnyPermission = (
  granted: string[],
  required: string[],
): boolean =>
  required.length === 0 ||
  required.some((permission) => hasPermission(granted, permission));

// Backend Domain.Common.Auth.Roles.AdminRoles ile birebir aynı liste — yalnız
// GÖRÜNÜRLÜK amaçlı (ör. admin onay kuyruğu sekmesi). Gerçek yetkilendirme backend'de
// (IsAdminUser rol kontrolü), burası güvenlik sınırı DEĞİLDİR.
const ADMIN_ROLES = ["Admin", "Süper Admin"];

export const isAdminRole = (role: string): boolean => ADMIN_ROLES.includes(role);

// Süper Admin — backend Domain.Common.Auth.Roles.SüperAdmin. Personel denetimi
// anlamına gelen ekranlar (Aktivite) yalnız bu role açıktır; asıl kapı backend'de
// (Süper Admin break-glass), burası GÖRÜNÜRLÜK içindir.
export const SUPER_ADMIN_ROLE = "Süper Admin";

export const isSuperAdminRole = (role: string): boolean =>
  role.localeCompare(SUPER_ADMIN_ROLE, "tr", { sensitivity: "accent" }) === 0;
