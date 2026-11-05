// PROTOTİP: giriş yapılmış bir oturum taklit edilir (backend ve login yok).
export default defineNuxtPlugin(() => {
  const auth = useAuth();
  auth.token.value = "prototype-token";
  auth.expiresAtUtc.value = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  auth.user.value = {
    userId: "prototype-user", email: "prototip@timon.local", emailConfirmed: true, fullName: "Selim Akın",
    phoneNumber: null, cariKod: null, plasiyerKod: "SELİM AKIN", avatarUrl: null, roles: ["Süper Admin"], permissions: [],
  };
});
