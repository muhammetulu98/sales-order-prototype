# Yeni Satış Siparişi — Özellikler ve Kurallar

Prototip: `/sales/orders/new?type=0` (sipariş) · `?type=2` (teklif). Yalnız frontend, kurgu veri (`app/utils/prototypeApi.ts`).
Form: `app/components/ErpSalesOrderForm.vue` · sayfa: `app/pages/sales/orders/new.vue`.

Yeni bir kural eklendiğinde bu dosyaya da işlenir. `[VARSAYIM]` = teyit bekleyen kural.

---

## 1. Evrak başlığı

### Cari
- Kod veya unvanla aranır; seçilince cari kutusunun altında **risk kartı** görünür:
  **Bakiye · Risk Limiti · Açık Limit · Statü** (A, B, AB gibi).
- **Açık limit** = risk limiti − bakiye. Eksiye düşerse (limit aşılmış) kutu kırmızı olur.
- Veri yoksa kutuda "—" yazar.

### Cari uygunluğu (seçildiği an kontrol edilir)
- Cari **kilitli** ise ya da **hareket tipi** satışa uygun değilse:
  - kırmızı uyarı kutusu + sağ üstte bildirim **cari seçildiği an** çıkar,
  - stok arama kutusu pasif olur, **stok eklenemez**, Kaydet de engellenir.
- `[VARSAYIM]` Satışa uygun hareket tipleri: 0 (Müşteri) ve 2 (Müşteri/Tedarikçi). Tipi bilinmeyen cari engellenmez.

### Otomatik gelen alanlar (ekranda elle girilmez)
- **Plasiyer:** siparişi oluşturan kullanıcının plasiyer kodu; değiştirilemez (pasif kutu).
- **Evrak serisi ve sırası:** ekranda **gösterilmez**. İlk seri otomatik atanır, numarayı kayıt sırasında sistem verir.

### Diğer alanlar
- **Proje** (listeden), **Adres** (carinin adreslerinden; cari seçilince ilki gelir).
- **Teslim Türü:** Ambar · Timon Servis · Müşteri Kamyonu · Kendisi Alacak.
  - **Ambar** seçilince cari kartında kayıtlı ambar varsa **otomatik gelir** ("Cari kartındaki ambar getirildi"); yoksa listeden seçilir. Cari değişince yeniden getirilir; elle değiştirilirse "Ambar elle değiştirildi" yazar.
  - **Kendisi Alacak** seçilince ikinci seçim açılır: İkitelli Depo / Plaza Depo (zorunlu).
- **Tahsilat Tipi:** Çek · Senet · Havale · Kredi Kartı (zorunlu değil, varsayılan boş).
- **Ödeme Planı:** ikisinden biri seçilir:
  - **Gün:** Peşin, 30, 60, 90, 120, 150, 180, 210 (mikro odeme planları tablosundan alınır)
  - **Nokta tarih:** takvimden tarih (bugünden önce seçilemez) (sip_op_no alanına kabul edilen formatta yazılır)
  - Seçime göre **Tahsilat Tarihi** otomatik hesaplanır (gün: bugün + gün, nokta tarih: seçilen tarih); elle de değiştirilebilir.
- **Teslim Tarihi**, **Evrak Açıklaması 1** (tek açıklama alanı).
- Dört alan tek satırda yan yana: Tahsilat Tipi · Ödeme Planı · Tahsilat Tarihi · Teslim Tarihi.

### Kaldırılanlar
Kargo/Ambar cari kodu ve Kargo bedeli · Acil / Eksik mal gönderilemez / Tek teslimat kutuları · Evrak Açıklaması 2 · "Stok, Rezervasyon ve Fiyat Kontrolü" kutusu · satırdaki depo seçimi · ekrandaki evrak seri/sıra alanları.

---

## 2. Stok ekleme

- **Arama kutusu:** yazdıkça öneri listesi (kod, ad, tip, satılabilir miktar).
- **Enter:**
  - Yazılan değer bir **stok kodu, barkod ya da multi kodla TAM eşleşip tek stok bulunursa** → satıra **direkt eklenir**.
  - Aksi halde (ad araması, kısmi kod, birden çok sonuç) → **Stok Seç penceresi** açılır. Ad aramasında tek sonuç bile olsa pencere açılır.
  - Hiç sonuç yoksa "Stok bulunamadı" uyarısı çıkar. Boş aramada Enter tüm stokları listeler.
- **Stok Seç penceresi:** onay kutularıyla çoklu seçim (satıra tıklayarak ya da başlıktaki kutuyla tümünü seç), alt kısımda "N stok seçildi" ve **Seçilenleri Ekle**.
  Sütunlar: Stok Kodu · Barkod · Stok Adı · Tip (H/D) · Satılabilir · Liste Fiyatı · İsk 1 % · Birim Fiyat (KDV hariç).
- `[VARSAYIM]` Multi kod: her stokta alternatif kod olarak tutulduğu varsayıldı (mock'ta `M` + stok kodu).

### Stok tipi
- **H = hazır stok:** satılabilir miktar yazılır. Satır miktarı (birim katsayısıyla çarpılmış) satılabilir miktarı aşarsa satırda kırmızı "miktar aşıyor" uyarısı çıkar; **kaydı engellemez**.
- **D = drop:** satılabilir miktar yazılmaz.

### Insert
- Stok eklendiği **evrak tarihinde** (bugün) o stoğa tanımlı **geçerli insert** varsa satır **sarı renkle** vurgulanır ve stok adının yanında **"İNSERT"** etiketi çıkar (etiketin üstüne gelince insert adı ve bitiş tarihi görünür).
- Süresi dolmuş ya da henüz başlamamış insert satırı renklendirmez.
- Veri: `productInfo(code, date)` yanıtında `insertName` / `insertValidTo`.

---

## 3. Sipariş satırı

Sütunlar: Stok Kodu · Barkod · Stok Adı · Birim · Miktar · Liste Fiyatı · İsk 1–4 % · KDV Oranı · Birim Fiyat (KDV hariç / dahil) · Vade · Net Tutar (KDV hariç / dahil).

- **Salt okunur (kimse müdahale edemez):** Liste Fiyatı, **İsk 1**, **İsk 4**. İsk 1 stoğun fiyat bilgisinden gelir.
- **Düzenlenebilir:** Miktar, İsk 2, İsk 3, Birim, Vade.
- **Birim:** seçenekler katsayıyla yazılır — "Adet", "Koli (24)" (katsayısı 1 olan birimde sayı yazılmaz). Birim değişince liste fiyatı katsayıya göre yeniden hesaplanır.
- **Miktar:** oklar 1'er artar (min. 1).
- **Birim fiyat (iki yönlü):** iskontolar (kademeli) uygulanmış fiyat; KDV hariç üstte, KDV dahil altta. **İskonto yazılınca birim fiyat değişir; birim fiyat (hariç ya da dahil) yazılınca İsk 2 geri hesaplanır** (İsk 1/İsk 3/İsk 4 sabit; liste fiyatından yüksek fiyat yazılamaz, İsk 2 en az 0; İsk 2 2 ondalığa yuvarlanır). İsk 2 değişince satır vadesi ve bütçe de yeniden hesaplanır. `[VARSAYIM]` Fiyattan geri hesap İsk 2'ye yazılır. **Net tutar** da aynı şekilde (miktar × birim fiyat), hariç üstte / dahil altta.
- **Toplamlar:** Ham Tutar · İskonto · KDV · Genel Toplam.

### Satır vadesi
- Üstte seçilen **ödeme planı** (gün ya da nokta tarih) her satıra **otomatik** gelir; plan değişince elle dokunulmamış satırlar planı izler.
- **İsk 2 yazılırsa:** ek gün = **İsk 2 ÷ 0,15** (günlük vade farkı %0,15), tam güne yuvarlanır; ek gün **ödeme planının vade tarihine eklenir** ve satır vadesi **nokta tarih** olarak yazılır (örnek: İsk 2 = 20 → +133 gün). Satırda "+133 gün (İsk 2)" notu görünür. İsk 2 silinirse satır plana döner.
- **Plasiyer** satırdaki vadeyi (Gün/Tarih seçerek) elle değiştirebilir; değiştirilen satır artık otomatik güncellenmez.
- `[VARSAYIM]` Ek günler bugüne değil üstteki planın vade tarihine eklenir.

---

## 3b. Bütçe kutusu (sağ üst)

Mantık, Timon-B2B-Web sipariş alırken kullanılan **sepet bütçesi** (`utils/basketProfitability.ts`, TB-1040) ile aynıdır; prototipte `app/utils/basketProfitability.ts` olarak kopyalandı ve kalem kalem döküm eklendi.

- Sayfa başlığının sağında, "Listeye Dön" düğmesinin yanında yuvarlak bir kutu: **%10 ve üstü yeşil ("Bütçe")**, **%10'un altı kırmızı ("Zarar")**. Satır yokken ya da hiçbir stoğun sözleşmesi yokken görünmez.
- **Kutuya tıklayınca detay** açılır: kalem kalem döküm, tedarikçi bazında marj (birden çok tedarikçi varsa), eşik notu, nakliye notu ve sözleşmesiz stoklar.
- **Hesap (satır başına, % olarak toplanır):**
  alış iskontoları + primler − satırlardaki tüm iskontolar − sözleşme satış iskontosu
  + (alış vadesi − sözleşme satış vadesi) × 0,15 + (sözleşme satış vadesi − **satır vadesi**) × 0,15 − nakliye (dahilse).
- Aynı tedarikçinin satırları brüt tutarla ağırlıklanır; sonra tedarikçilerin düz ortalaması alınır. Alış fiyatı hesaba girmez.
- **Vade farkı katsayısı 0,15** (gün başına %0,15): satır vadesindeki İsk 2 ÷ 0,15 kuralının da kaynağı budur. Satır vadesi uzadıkça bütçe düşer.
- Sözleşmesi olmayan stok hesaba girmez, detayda "N stok sözleşmesiz" yazar.
- `[VARSAYIM]` Nakliye yalnız **Timon Servis** teslimde Timon'a ait (dahil) sayılır ve düşülür; Ambar, Müşteri Kamyonu, Kendisi Alacak'ta düşülmez.
- `[VARSAYIM]` Tam %10 yeşildir (B2B'deki gibi `>= 10`).
- Veri: stok bilgisi yanıtında `budgetTerm` (tedarikçi kodu/adı, alış iskontosu, prim, alış vadesi, satış vadesi, nakliye oranı, sözleşme satış iskontosu). Mock'ta 10 tedarikçi, 272052 bilerek sözleşmesiz.

---

## 4. Kaydetme

- **Kaydet:** sayfanın türünü (sipariş) kaydeder. **Teklif Kaydet:** aynı formu teklif (tür 2) olarak kaydeder; `?type=2` sayfasında yalnız Kaydet vardır ve teklif yazar.
- Doğrulamalar: cari seçili · cari uygun · "Kendisi Alacak"ta depo · ödeme planı (gün seçilmiş / tarih seçilmiş) · her satırın vadesi · en az bir satır · miktar > 0 · birim fiyat ≥ 0 · iskonto 0–100.
- Kayıttan sonra form sıfırlanır, "Sipariş/Teklif kaydedildi: A-900001" bildirimi çıkar (prototipte detay sayfası yok; numara sahte).
- Gönderilen veri: `paymentDueKind/Days/Date`, `pickupDepotNo`, `forwarderCode`, satırda `dueDays/dueKind/dueDate`.

---

## 5. Görünüm

- Prototip kabuğu: koyu üst bar, sidebar yok.
- Sayfadaki çizgiler koyulaştırıldı (`app/assets/css/main.css`: kart/ayraç `#a3abb0`, tablo satırı `#c4cace`, alan çerçevesi `#a7afb4`).
- Form düzeni: Cari + Proje · Adres + Teslim Türü · tahsilat/ödeme/tarih satırı · Plasiyer. Açıklama, satır kartının altında.

---

## Açık sorular

1. Nokta tarih seçilince satırda ayrıca vade **tarihi** gösterilsin mi?
2. "Kendisi Alacak" için seçilen depo satırların deposu olsun mu? (Satırdan depo kalktığı için şimdi listedeki ilk depo kullanılır.)
3. Miktar tam sayı zorunlu mu? (Şimdi yalnız oklar 1'er artıyor, klavyeden küsurat yazılabiliyor.)
4. İsk 4'ün kaynağı nedir? (Mock'ta hep 0.)
5. Tahsilat Tipi zorunlu mu, varsayılanı olacak mı?
6. Gerçek multi kod alanı ve satışa uygun cari hareket tipleri.
