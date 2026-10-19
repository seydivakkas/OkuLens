# İşlem 004-E — Windows Chrome/Edge Gerçek Model Kabul Kanıt Paketi

**Tarih:** 19 Ekim 2026  
**Bağlı:** [Issue #4](https://github.com/seydivakkas/OkuLens/issues/4), [004-B](ISLEM_004B_TARAYICI_MODEL_DOGRULAMA.md), [004-C](ISLEM_004C_CDN_METADATA_OPFS_RECOVERY.md), [004-D](ISLEM_004D_OPFS_WORKER_PREFLIGHT.md).  
**Durum:** Kanıt toplama ve rapor denetleyicisi kodlandı. Gerçek Windows Chrome/Edge ONNX, çevrimdışı Türkçe üretim ve ticari yayın HOLD.

## 1. Hazırlanan araçlar

- **scripts/windows-kabul-hazirlik.ps1** Windows sürümü, Chrome/Edge sürümü, kaynak commit, uzantı sürümü, GPU adı ve sürücüsünü kaydeder. Otomatik model indirme, tarayıcıya kurulum, ağ kapatma veya kaynak metin toplama yapmaz. Her zaman HOLD raporlar.
- **scripts/windows-acceptance-audit.mjs** ortam JSON'unu, OPFS Worker ön kontrol JSON'unu ve model üretim JSON'larını inceler. Eksik ağ, offline, model kimliği, beş senaryo ve bağımsız kaynak denetimini açıkça işaretler. Kanıt dosyalarının SHA-256'sını hesaplar; özet metni terminale yazmaz. Nihai PASS üretmez.
- **tests/windows-acceptance-audit.test.mjs** sentetik kontrol testleri; Windows GitHub Actions yalnız betiğin çalışma/sözdizimi uygunluğunu inceler.

Yerel **kanitlar/** klasörü Git tarafından ignore edilir. Ham HAR, kişisel e-posta, tarayıcı profil dosyaları, müşteri metni veya token açık GitHub'a yüklenmemeli.

## 2. Sırayla uygulanacak Windows testi

### A — Kaynak kodu hazırlığı

Güncel depoda PowerShell aç. Depo henüz yoksa:

~~~powershell
git clone https://github.com/seydivakkas/OkuLens.git
cd OkuLens
npm install
npm run check
npm test
npm run build:runtime
~~~

Npm bağımlılığı indirmek için ağ gerekebilir; bu adımlar ONNX model ağırlığını kullanıcı yerine indirmez. Mevcut yerel değişiklikleri zorla silen git reset/clean komutları kullanma.

### B — Tarayıcı ve donanım kayıtları

~~~powershell
powershell -NoProfile -File .\scripts\windows-kabul-hazirlik.ps1 -Tarayici Chrome
powershell -NoProfile -File .\scripts\windows-kabul-hazirlik.ps1 -Tarayici Edge
~~~

Çıktılar: kanitlar/okulens-windows-chrome-ortam.json ve kanitlar/okulens-windows-edge-ortam.json. Bunlar ortam raporudur, VRAM veya model inference ölçümü değildir.

### C — Modelin açık onaylı kurulumu

Chrome için chrome://extensions; Edge için edge://extensions adresinde geliştirici moduyla OkuLens proje klasörünü aç. İki tarayıcının OPFS deposu ayrıdır.

Uzantı **Ayarlar → Tarayıcıda model yönetimi** bölümünden WebGPU/WASM ağırlığını seç, Apache-2.0 lisans koşullarını ve dar Hugging Face/CDN izinlerini değerlendir; kullanıcı onayıyla indir. Engelleme olursa CORS, model SHA, kota veya izin hata kodunu kaydet; geniş tüm siteler izni ekleme.

**SHA-256 bütünlüğünü denetle** işlemini yap, sonra tarayıcıyı yeniden başlatıp aynı doğrulamayı tekrarla.

### D — OPFS Worker ön kontrolü

**Ayarlar → Gerçek Model Kabul Laboratuvarı → OPFS model dosyalarını Worker içinde ön denetle → Ön kontrol kanıtını JSON indir.**

Beklenen yapı: PREFLIGHT_FILES_READABLE, on katalog dosyası, model revizyonu/backend, örneklenmiş baytlar. Bu kanıtta gerçek model çıkarımı FALSE, ağ ölçümü NOT_MEASURED ve karar HOLD kalır.

### E — Gerçek ONNX ve internet kapalı tekrar

Laboratuvardaki micro (10), standard (100), deep (1000), simple (100) ve injected (100) vakalarını gerçek modelle çalıştır, beş ayrı JSON dışa aktar. TextRank fallback'i ONNX başarısı olarak sayma.

Model kurulumundan **sonra** interneti Windows işletim sisteminden kapat, tarayıcıyı yeniden başlat ve sentetik fixture'lar üzerinde gerçek modeli tekrar çalıştır. Backend, modelin ilk tokenı, streaming olayları, iptal davranışı, süreç RAM'i, GPU VRAM ve Network izi ayrıca kaydedilmeli. Ağsız üretim ve her iddianın kaynak pasajlarıyla sadakati bağımsız incelemeye tabidir.

### F — Yerel kanıtların denetlenmesi

İndirilen OPFS ön kontrolü ve beş vaka JSON'unu elle kanitlar/chrome veya kanitlar/edge klasörüne taşı. Aşağıdaki **örnek dosya adlarını** kendi kaydettiğin dosya adlarına göre değiştir:

~~~powershell
npm run acceptance:audit -- --environment kanitlar/okulens-windows-chrome-ortam.json --preflight kanitlar/chrome/opfs-onkontrol.json --inference kanitlar/chrome/micro.json --inference kanitlar/chrome/standard.json --inference kanitlar/chrome/deep.json --inference kanitlar/chrome/simple.json --inference kanitlar/chrome/injected.json --output kanitlar/chrome/denetim.json
~~~

Aynı denetimi Edge dosyalarıyla tekrarla. Bu betik kullanıcı raporlarının zorunlu alanlarını ve eksikliklerini kontrol eder; modelin gerçekten cihazda çalıştığını tek başına kanıtlayamaz. Son karar HOLD kalır.

## 3. Kabul matrisi

| Kapı | Durum |
| --- | --- |
| Windows PowerShell AST, ortam raporu ve yanlış PASS engeli | GitHub Windows CI |
| Rapor şeması ve güvenli HOLD denetimi | Sentetik Node testleri |
| Chrome gerçek indirme, CDN/CORS, SHA, OPFS Worker ön test | HOLD |
| Edge gerçek indirme, CDN/CORS, SHA, OPFS Worker ön test | HOLD |
| OPFS → Transformers.js / ONNX gerçek WebGPU/WASM token üretimi | HOLD |
| Ağ kapalı Türkçe 10/100/1000, streaming, RAM/VRAM | HOLD |
| Bağımsız kaynak sadakati, gizlilik ve ticari mağaza kabulü | HOLD |

**Karar:** ISLEM_004E_WINDOWS_KANIT_PAKETI_ADAY / GERCEK_WINDOWS_ONNX_HOLD / ISSUE_4_OPEN / TICARI_YAYIN_HOLD. MIT ve Free/Pro/Business sınırları değişmez.
