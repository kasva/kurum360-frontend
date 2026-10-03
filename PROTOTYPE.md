# Kurum360 — Frontend prototipi

React 19 + Vite + TypeScript. Uygulama, testler ve Vite yapılandırması TypeScript'e dönüştürülmüştür. `strict` tip kontrolü açıktır. Backend, veritabanı ve kimlik doğrulama içermez. İlk başlangıç dosyaları `backups/initial`, dönüşüm öncesindeki JavaScript sürümü `backups/pre-typescript` altında korunmuştur.

## Başlatma

Proje dizininde `npm install` (bağımlılıklar mevcut değilse), ardından `npm run dev` çalıştırın. Terminalde yazan yerel adresi açın. `npm run typecheck` uygulama, test ve Vite yapılandırmasının tiplerini kontrol eder. `npm run build` önce tip kontrolü, ardından üretim derlemesini çalıştırır. Diğer komutlar: `npm run preview`, `npm run lint`, `npm test`. Testler `tsx` üzerinden TypeScript kaynak kodunu doğrudan çalıştırır. Yedekler tip kontrolüne ve lint'e dahil değildir.

## Çalışan kapsam

- Ortak yerleşim: dar ekran menüsü, üst arama, demo kullanıcı ve bildirim açıklama pencereleri.
- Dashboard: ortak veriden türetilen kartlar, altı aylık trend, tür dağılımı, onay bekleyenler, acil kayıtlar, birim özetleri ve son talepler. Kartlar ve özetler ilgili filtrelere bağlanır.
- Talepler: Türkçe arama; tür, kategori, durum, öncelik, birim, sorumlu, talep eden ve oluşturulma tarih aralığı filtreleri; hızlı filtreler, sıralama ve sayfalama. Bana Atananlar ve Oluşturduklarım aynı listeyi kullanır.
- Detay: temel bilgiler, yorumlar, ek dosya bilgileri, zaman çizelgesi; sorumlu, birim, durum, öncelik, onay, revizyon, tamamlama ve kapatma işlemleri. Birime yönlendirme eski sorumluyu kaldırır. Kapatmak için önce tamamlamak gerekir; kayıt silinmez. Yeniden açma tamamlanma/kapanış tarihlerini temizler.
- Yeni talep: dört adım; tanımlardan üretilen şikâyet/görüşme alanları, zorunlu alan ve tarih/süre kontrolleri, dosya adı-boyutu listesi, gönderim öncesi özet. Oluşturma sonrası detay açılır; liste/dashboard eşzamanlı güncellenir.

## Demo sınırları

48 kurgusal kayıt güncel tarihe göre üretilir. Tüm ekranlar aynı bellek repository'sini kullanır. Değişiklikler uygulama oturumu boyunca korunur; tarayıcı yenilendiğinde sıfırlanır. Dosyaların içeriği tutulmaz veya yüklenmez; indirme işlevi yoktur. Bildirim gönderimi, profil yönetimi veya gerçek kullanıcı hesabı yoktur. Demo kullanıcı Genel Müdür rolündedir; frontend rol/gizlilik gösterimi bir erişim denetimi değildir.

Gecikme, açık kaydın son tarihi bugünden önceyse hesaplanır. Son tarih gün sonuna kadar geçerlidir. Tamamlanan/kapatılan kayıtlarda gecikme varsa sonuçlandığı tarihe göre sabit gösterilir; açık geciken toplamına dahil edilmez. Tamamlanan kartı Tamamlandı ve Kapatıldı durumlarını kapsar. Kritik kartı tüm kritik öncelikli kayıtları kapsar. Grafikler örnek kayıtların tarihlerinden hesaplanır; SLA veya gelişmiş raporlama içermez.

## Mimari

- `src/domain/requests`: modeller, dinamik alan tanımları, doğrulama ve gecikme kuralları. React, HTTP veya tarayıcı depolaması bağımlılığı yoktur.
- `src/domain/identity`: kurgusal organizasyon referansları ve rol yeteneği.
- `src/application/requests`: kullanım senaryoları, arama/filtre/sıralama ve repository sözleşmesi.
- `src/application/dashboard`: aynı kayıtlar üzerinden özetler.
- `src/infrastructure`: kopya döndüren bellek repository'si ve örnek başlangıç verileri.
- `src/presentation`: React yerleşimi, dört sayfa, ortak bileşenler ve CSS.
- `src/bootstrap/services.ts`: bağımlılıkların birleştirildiği giriş. İleride ASP.NET Core mikroservislerine bağlanan API repository'si burada takılabilir. React bileşenleri örnek dosyaları veya localStorage'ı değiştirmez.

`RequestRecord`, `RequestDraft`, durum/öncelik/gizlilik birleşim tipleri ve dinamik alanların ayrıştırılmış birleşim tipleri domain katmanındadır. Repository ve servisler açık TypeScript sözleşmeleri kullanır. Doğrulanmamış form girdileri kayıt oluşturulurken çalışma zamanında doğrulanır; TypeScript gerçek erişim denetiminin veya backend doğrulamasının yerini almaz.

## Kontrol senaryoları

`npm test` oluşturma, tip bazlı doğrulama, birleşik filtreleme, sıralama, sayfalama veri dilimleri, dashboard tutarlılığı, repository izolasyonu ve tam talep yaşam döngüsünü kontrol eder.

Tarayıcıda: dashboard kartından listeye geçin; arama ve birden fazla filtreyi birleştirin; boş sonuç ve temizleme davranışını deneyin. Yeni talepte boş alanlarla ilerlemeyi deneyin; şikâyet/görüşme türlerinin özel alanlarını doldurun; geri/ileri yapın, dosya seçin ve gönderin. Oluşan detayda yorum, atama, birime yönlendirme, onay, revizyon, tamamlama ve kapatma yapın. Dashboard ve listede sonuçları kontrol edin. Dar ekran menüsünü, yatay tablo kaydırmayı ve klavye ile işlem pencerelerini kontrol edin.
