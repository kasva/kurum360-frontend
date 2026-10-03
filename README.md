# Kurum360

React + TypeScript arayüzü, C# REST API ve PostgreSQL ile talep ve iş takibi.

Talep oluşturma yetkisi kullanıcıya ayrı verilir. Standart kullanıcılar ünvan kuyruğundan talepleri üzerine alır ve atanan işleri yürütür; Admin tüm işlemleri yönetir. Gizlilik ve işlem izinleri API’de doğrulanır.

## Docker ile çalıştırma

Gereksinimler: çalışan Docker Desktop / Docker Engine ve Compose.

```powershell
Copy-Item .env.example .env
# .env içindeki POSTGRES_PASSWORD, ADMIN_EMAIL ve ADMIN_PASSWORD değerlerini düzenleyin.
docker compose up --build -d
```

Yerel adres: http://localhost:5080. İlk yönetici girişinde geçici parola değişimi zorunludur. Yönetici başlangıçta talep oluşturamaz; oluşturma yetkisini yönetim API’sinden kullanıcıya verin. Docker development ayarı yerel HTTP içindir; üretimde HTTPS ve `ASPNETCORE_ENVIRONMENT=Production` kullanın.

## Yerel geliştirme

Gereksinimler: Node.js 22, .NET 10 SDK, PostgreSQL 17.

Bu çalışma ortamına .NET SDK `C:\Users\asus\AppData\Local\kurum360-dotnet` ve PostgreSQL binaries `C:\Users\asus\AppData\Local\kurum360-postgresql\pgsql` altında kuruldu. PostgreSQL yerel kümesi 127.0.0.1:55432 kullanır. Standart kurulumlar da desteklenir.

Kök dizinde gitignore kapsamındaki `.env.local` oluşturun:

```dotenv
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=http://localhost:5080
ConnectionStrings__Database=Host=localhost;Port=5432;Database=kurum360;Username=kurum360;Password=your-local-password
Bootstrap__AdminEmail=admin@example.org
Bootstrap__AdminPassword=your-complex-temporary-password
```

Mevcut PostgreSQL sunucunuzda önce `kurum360` veritabanını ve kullanıcıyı oluşturun. Sonra iki terminalde:

```powershell
./scripts/dev-api.ps1
```

```powershell
npm ci
npm run dev
```

Vite `/api` isteklerini localhost:5080’e yönlendirir. Linux/macOS üzerinde aynı değişkenleri export ederek `dotnet run --project backend/Kurum360.Api -- --migrate`, ardından `dotnet run --project backend/Kurum360.Api` çalıştırılabilir.

## Kontroller

```powershell
npm run build
npm run lint
npm test
# Ayrı PostgreSQL test ortamınıza ait bağlantıyı kullanın:
$env:TEST_DATABASE='Host=localhost;Database=postgres;Username=postgres;Password=your-test-password'
./scripts/test-backend.ps1
$env:E2E_DATABASE='Host=localhost;Database=kurum360_e2e;Username=postgres;Password=your-test-password'
npx playwright install chromium
npm run test:e2e
```

PostgreSQL entegrasyon testleri geçici veritabanları oluşturur; test kullanıcısına bunun için yetki gerekir. E2E testi ayrı bir test veritabanında çalıştırılmalıdır; üretim veritabanı kullanmayın. `.github/workflows/ci.yml` build, lint, birim, PostgreSQL ve tarayıcı testlerini çalıştırır.

API sözleşmesi, rol kuralları ve dağıtım ayrıntıları: [backend/README.md](backend/README.md).

Eski bellek repository ve demo testleri yalnızca prototip regresyonu için korunur; uygulamanın ana giriş noktası gerçek API kullanır. Demo kayıtlar üretime yüklenmez.

Ünvan iş akışı güncellemesi: Birim alanı, tanım ekranı ve yönlendirmesi kaldırıldı. Talepler hedef ünvana gönderilir; aynı ünvandaki kişilerden sorumlu seçilir. Backend 20261004100000_TitleRouting migration ile birlikte güncellenmelidir. Excel için yeni altı sütunlu şablon indirilmelidir. Kullanıcı formu dışarı tıklamayla veya Escape ile kapanmaz; sağ üstteki Kapat düğmesini kullanın.
