# İşlem 005 — OkuLens Windows Masaüstü P0

**Tarih:** 19 Ekim 2026  
**Yeni ana ürün:** Windows 10/11 x64 masaüstü uygulaması. Chrome/Edge uzantısı isteğe bağlı gelecek eklenti olarak ertelendi.  
**Lisans:** MIT çekirdek korunur, üçüncü taraf paket/lisans ve Windows imzalama ayrı kapıdır.  
**Gerçek Windows kullanıcı kabulü:** HOLD.

## 1. Karar ve sınırlar

OkuLens'in birinci ürünü artık tarayıcı uzantısı değildir. İlk çalışır sürüm Windows masaüstü programı olacaktır. Mevcut JavaScript TF-IDF/TextRank motoru değiştirilmeden tekrar kullanılır. İlk Windows kabuğu Electron (Chromium tabanlı) seçildi. Bu karar tek dosyalık mikro boyutlu EXE sözü değildir; Windows x64 portable klasör ve ZIP üretilir. Daha hafif WebView2/Tauri seçeneği fiziksel kabul ve boyut kıyasından sonra ayrıca değerlendirilebilir.

Uzantı kaynak kodu silinmeyecek; eski Chrome/Edge OPFS testleri yeni Windows P0 yolunu engellemeyecek. Eski Issue #4 tarayıcı/ONNX için açık HOLD kalacak.

## 2. P0 kapsamında kodlananlar

| Özellik | P0 davranışı |
| --- | --- |
| Windows penceresi | İki panelli yerel masaüstü UI |
| Kaynak metin | Metin yapıştırma veya kullanıcı seçimiyle TXT/MD açma |
| Kaynak sınırı | 260.000 karakter, dosya en fazla 2 MiB, UTF-8 |
| Motor | Aynı shared/hybrid-nlp.mjs TF-IDF + TextRank |
| Özet hedefleri | 10 / 100 / 1000; kaynak yetersizse doldurmak için içerik uydurmaz |
| Gösterge | Kelime sayısı, anahtar kelimeler, kısalma ve süre |
| Dışa aktarma | Panoya kopyalama ve TXT olarak kaydet |
| Haricî LLM API | Yok |
| Gerçek ONNX/GGUF üretimi | Daha sonraki aşama, bu sürümde YOK |
| PDF/DOCX | Daha sonraki aşama |
| Chrome/Edge uzantısı | Gelecek isteğe bağlı özellik |

Çıktı **çıkarımsal** metin özetidir, üretken yeniden yazım değildir. Çok kısa belgede özgün cümleler korunur. Başlık ve kaynak metin hiçbir sunucuya otomatik aktarılmaz.

## 3. Güvenlik

Electron penceresi sandbox=true, contextIsolation=true, nodeIntegration=false, webSecurity=true olarak kuruldu. Preload köprüsü web arayüzüne yalnız kullanıcı seçimiyle TXT/MD açma ve TXT kaydetme yetkisi verir. Dosya okuma/yazma main süreç IPC denetiminden geçer. Kaynak içerik HTML olarak çalıştırılmaz; textContent olarak gösterilir. Özel okulens protokolü sadece izinli paket dosyalarına hizmet eder. CSP ağ bağlantılarını reddeder; ana süreçte HTTP/HTTPS istekleri bloke edilir. Bu kod sınırlaması Windows üzerinde bağımsız Network testinden geçilmeden mutlak ağsızlık sertifikası değildir.

## 4. Tek PowerShell bloğu ile Windows geliştirme sürümünü açma

Ön gereksinimler Git, Windows 10/11 ve Node.js 22.12 veya üstüdür. Mevcut değişiklikleri zorla silen Git komutları kullanılmaz.

~~~powershell
$ErrorActionPreference = "Stop"
$repo = Join-Path $HOME "OkuLens"
if (-not (Test-Path (Join-Path $repo ".git"))) {
    if (Test-Path $repo) { throw "OkuLens klasoru mevcut ama Git repo degil." }
    git clone https://github.com/seydivakkas/OkuLens.git $repo
    if ($LASTEXITCODE -ne 0) { throw "Git klonlama basarisiz." }
}
Set-Location $repo
if (git status --porcelain) { throw "Yerel degisiklikler var; guvenli guncelleme durduruldu." }
git switch main
if ($LASTEXITCODE -ne 0) { throw "Main dalina gecilemedi." }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Guvenli Git guncelleme basarisiz." }
npm.cmd install
if ($LASTEXITCODE -ne 0) { throw "Npm install basarisiz." }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Kod kontrolu basarisiz." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Birim testi basarisiz." }
npm.cmd run desktop:start
~~~

GitHub'da PR ana dala birleştirilmeden önce bu komutlarda yer alan main dalı P0'ı içermez; önce kontrollü birleştirme yapılır. Kod imzalı ticari sürüm veya yükleme sihirbazı henüz yoktur.

## 5. Windows EXE / Portable ZIP

Windows'ta proje klasöründe npm.cmd run desktop:pack:win komutu portable EXE klasörünü üretir. Çıktı dist/desktop altında yer alır ve OkuLens.exe yanında gereken Electron dosyalarını içerir; yalnız EXE'yi diğer dosyalardan ayırma. GitHub Actions windows-latest CI aynı kaynaklarla ZIP üretir. CI paketi kullanıcının bilgisayarında fiilen çalıştırmış olmak demek değildir.

P0 paket kod imzası, SmartScreen/Defender fiziksel kabulü, installer, otomatik güncelleme, bağımsız güvenlik taraması ve gerçek müşteri verisi kullanımını tamamlamamıştır. Bu testler son aşamada yapılacak.

## 5-A. Windows GitHub Actions somut CI kanıtı

[Windows P0 CI çalışması](https://github.com/seydivakkas/OkuLens/actions/runs/39269375881) üzerinde aşağıdakiler gözlendi:

- Node sentetik testleri: 106/106 PASS.
- Windows Electron uygulaması gerçek Chromium renderer ile çalıştırıldı: DESKTOP_GUI_SMOKE_PASS; Türkçe örnek metin yerel motorla özetlendi.
- @electron/packager ile Windows x64 klasörü ve OkuLens.exe gerçekten oluşturuldu.
- Taşınabilir Windows ZIP, GitHub Actions artefaktı olarak saklandı. GitHub Actions **Artifacts → OkuLens-Windows-x64-portable** bölümünden edinilebilir.

**Bu, kullanıcının bilgisayarında çalıştırılmış/yayınlanmış uygulama veya gerçek ONNX üretimi anlamına gelmez.** GitHub runner fiziksel Windows kullanıcı kabulünü, kaynak sadakatini, SmartScreen/kod imzasını, internet bağlantısı kapalı laboratuvarı ve müşteri ortamını ikame etmez.

### Node/Git kurmadan portable adayın ilk denemesi

1. Yukarıdaki GitHub Actions çalışmasını açıp Artifacts kısmındaki Windows portable ZIP'i indir.
2. GitHub artefakt ZIP'ini ve onun içindeki portable ZIP'i ayrı ayrı çıkar.
3. Çıkan klasörün içinde yer alan OkuLens.exe dosyasını klasörü bozmadan başlat.
4. Metin yapıştır → 100 kelime → Yerel özeti oluştur → TXT kaydet akışını dene.
5. Sonra ağ bağlantısını kesip aynı yerel metin özetini tekrar dene. Uygulamanın yüklenmesi/harici trafik, Windows güvenlik uyarıları ve kullanıcı kabulleri ayrı raporlanmalıdır.

Windows imzasız geliştirme paketi güvenlik uyarısı verirse korumaları sistem genelinde devre dışı bırakmayın; güvenilirlik doğrulaması ayrı yayına hazırlık aşamasında yapılacak.

## 6. Gelecek mühendislik sırası

1. **W-P0:** Windows iki panelli GUI, güvenli metin açma/özetleme/TXT kaydetme, Windows CI üzerinde EXE/portable ZIP üretimi.
2. **W-P1:** Yerel ONNX veya GGUF çalışma motoru seçimi, lisans ve SHA pinli model kurulumu; bulut/API anahtarı yok.
3. **W-P2:** Türkçe 10/100/1000 gerçek üretim, streaming, iptal, kaynak pasajları ve gerçek Windows CPU/GPU/RAM kabulü.
4. **W-P3:** PDF/DOCX işleme, kaynak sadakati ve belgeler arası arama.
5. **W-P4:** İmzalı kurulum, lisans/SBOM, güvenlik, KVKK ve ticari kabul.
6. **E-OPTIONAL:** Windows sürümü kararlı olduktan sonra isteğe bağlı Chrome/Edge uzantı adaptörü.

**Kapanış:** WINDOWS_DESKTOP_P0_KOD_ADAYI / WINDOWS_FİZİKSEL_KABUL_HOLD / GERÇEK_YEREL_ONNX_HOLD / TİCARİ_YAYIN_HOLD. Mevcut MIT lisansı ve Free/Pro/Business planı korunur.
