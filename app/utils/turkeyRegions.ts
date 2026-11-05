// Türkiye'nin 7 coğrafi bölgesi ve 81 ili — nakliye şartlarında "bölge ekle" kısayolu için.
// İl adları kullanıcıya görünen metin olarak saklanır (sunucu sözleşmesi madde 18: il adı).

export const TURKEY_REGIONS: Record<string, readonly string[]> = {
  Marmara: ["Balıkesir", "Bilecik", "Bursa", "Çanakkale", "Edirne", "İstanbul", "Kırklareli", "Kocaeli", "Sakarya", "Tekirdağ", "Yalova"],
  Ege: ["Afyonkarahisar", "Aydın", "Denizli", "İzmir", "Kütahya", "Manisa", "Muğla", "Uşak"],
  Akdeniz: ["Adana", "Antalya", "Burdur", "Hatay", "Isparta", "Kahramanmaraş", "Mersin", "Osmaniye"],
  "İç Anadolu": ["Aksaray", "Ankara", "Çankırı", "Eskişehir", "Karaman", "Kayseri", "Kırıkkale", "Kırşehir", "Konya", "Nevşehir", "Niğde", "Sivas", "Yozgat"],
  Karadeniz: ["Amasya", "Artvin", "Bartın", "Bayburt", "Bolu", "Çorum", "Düzce", "Giresun", "Gümüşhane", "Karabük", "Kastamonu", "Ordu", "Rize", "Samsun", "Sinop", "Tokat", "Trabzon", "Zonguldak"],
  "Doğu Anadolu": ["Ağrı", "Ardahan", "Bingöl", "Bitlis", "Elazığ", "Erzincan", "Erzurum", "Hakkari", "Iğdır", "Kars", "Malatya", "Muş", "Tunceli", "Van"],
  "Güneydoğu Anadolu": ["Adıyaman", "Batman", "Diyarbakır", "Gaziantep", "Kilis", "Mardin", "Siirt", "Şanlıurfa", "Şırnak"],
};

export const TURKEY_PROVINCES: readonly string[] = Object.values(TURKEY_REGIONS)
  .flat()
  .sort((a, b) => a.localeCompare(b, "tr"));
