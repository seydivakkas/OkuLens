# İşlem 004-D — OPFS → Transformers.js Worker Ön Kontrolü

**Tarih:** 18 Ekim 2026  
**İlgili Issue:** https://github.com/seydivakkas/OkuLens/issues/4  
**İlgili belgeler:** [İşlem 004-B](ISLEM_004B_TARAYICI_MODEL_DOGRULAMA.md), [İşlem 004-C](ISLEM_004C_CDN_METADATA_OPFS_RECOVERY.md), [TİCARİ-002](TICARI_002_MODEL_KURULUM_VE_DEPOLAMA.md), [TİCARİ-003](TICARI_003_GIZLILIK_KVKK_GUVENLIK.md).  
**Karar:** Kod / sentetik test adayı. Gerçek Windows Chrome/Edge Worker ön kontrolü, tam ONNX model yükleme, çevrimdışı Türkçe üretim ve ticari yayın **HOLD**.

## Teknik değişiklikler

- **shared/local-model-response-cache.mjs:** Model dosyası adreslerini aynı uzantı kimliği, model ID'si ve aktif OPFS manifestinde kayıtlı dosya yollarıyla eşler. İzinli OPFS Response döner. HTTPS/HTTP uzak model istekleri engellenir. Yanlış uzantı kimliği veya bilinmeyen model dosyası kabul edilmez. Cache read-only tutulur.
- **worker/local-model-worker.mjs:** Tek OPFS yanıt adaptörünü Transformers.js ortamına bağlar. Model üretimi başlatmayan yeni PREFLIGHT mesajında Worker, mevcut tüm kurulu dosyaların OPFS Response ve beklenen bayt boyutlarını inceler; her Response akışından yalnız ilk veri parçasını okuyup kapatır. Büyük ONNX dosyası tamamıyla RAM'e alınmaz.
- **shared/local-model-bridge.mjs:** preflightLocalModel çağrısı kullanıcı isteğiyle Worker başlatır, sonlandırma/iptal ve hata kodlarını açıkça iletir.
- **studio/acceptance.html / acceptance.js:** Kabul laboratuvarına OPFS Worker ön testi ve kullanıcı komutuyla JSON kanıt indirme eklendi.
- **tests/local-model-response-cache.test.mjs:** Kaynak URL eşleşmesi, uzak ağ reddi, cache, Worker ön test ve iptal kontrol senaryoları.

**Önemli:** OPFS dosyalarının Worker tarafından okunabilmesi gerçek Transformers.js model inference, ağırlık SHA'sının yeniden hesaplanması veya çevrimdışı çalışmanın kanıtı değildir.

## Üç seviyeli kabul

| Seviye | Ne kanıtlanıyor? | Durum |
| --- | --- | --- |
| L0: Sentetik CI | Mock Worker, yerel URL/cache ve fail-closed sözleşmesi | CI sonucuna göre |
| L1: Gerçek Chrome/Edge OPFS Worker | Paket kimliği ve OPFS File/Response boyutları tarayıcı Worker'ında gerçekten okunabilir | HOLD |
| L2: Gerçek ONNX inference | İnternet kesikken WebGPU/WASM modelinden Türkçe 10/100/1000 kelime hedefli çıktı, streaming, kaynak sadakati | HOLD |

Ön kontrol raporu **PREFLIGHT_FILES_READABLE** kodu verebilir, ancak ayrıca **realModelInferenceVerified: false**, **networkCaptureStatus: NOT_MEASURED**, **decision: HOLD** kayıtları içerir. Bu iş, L1 ile L2'yi birbirine karıştırmaz.

## Windows Chrome ve Edge uygulama sırası

1. İncelenecek main commit SHA, uzantı sürümü, Windows sürümü, Chrome/Edge sürümü ve GPU sürücüsünü kaydet.
2. Proje kökünde npm install, npm run check, npm test ve npm run build:runtime komutlarını çalıştır. Node kurulumu büyük ONNX modelini indirmez.
3. Chrome için chrome://extensions, Edge için edge://extensions sayfasından paketlenmemiş proje klasörünü aç. Test ve üretim/mağaza paketleri birbirinden ayrıdır.
4. Uzantı Ayarlar → Tarayıcıda model yönetimi: WebGPU veya WASM dosyasını kullanıcı açık onayıyla indir. Dar CDN izinleri ve sabit SHA'ları doğrula. Yalnız Node geliştirici klasörü, OPFS ön testine yetmez.
5. Model dosyaları kurulduktan sonra SHA-256 bütünlük komutunu kullan ve tarayıcı kapat/aç işlemi sonrası yeniden kontrol et.
6. Ayarlar → Gerçek Model Kabul Laboratuvarı: **OPFS model dosyalarını Worker içinde ön denetle** düğmesine bas.
7. Dosyalar gerçekten okunabiliyorsa **Ön kontrol kanıtını JSON indir**; kayıtta tarayıcı User-Agent, backend, model sürümü, dosya/bayt sayıları bulunur. Kişisel e-posta veya gerçek müşteri belgesi kullanılmaz.
8. L1'den ayrı olarak **Gerçek modeli çalıştır** komutuyla Türkçe 10/100/1000 senaryolarını işle; ardından işletim sisteminde ağ bağlantısını tamamen keserek aynı testi tekrar yap. TextRank fallback ONNX başarısı sayılmaz.
9. Chrome ve Edge için ayrı JSON, izin/cdn, DevTools Network, RAM ve VRAM ölçümleri tutulur. Ham HAR veya hassas URL/cookie kayıtları açık GitHub'a yüklenmez.

### Geliştirici komutları

~~~powershell
npm install
npm run check
npm test
npm run build:runtime
npm run commercial:release-check
~~~

## Sınırlar ve güvenlik

- Sabit Qwen3 model revizyonu ve dokuz metadata dosyasının bağımsız SHA hesapları İşlem 004-C'de kayıtlıdır.
- Yerel model cache adaptörü remote model fetch isteğini engeller. Bununla birlikte **gerçek ağ trafiği** Chrome ve Edge üzerinden gözlenmeden sıfır egress iddiası yapılamaz.
- Transformers.js 3.8.1 model/tokenizer dosya çözümü ve ONNX Runtime GPU belleği tahsisi gerçek inference sırasında ayrıca sınanacaktır. Yanlış veya eksik istekler, ancak doğrulanmış dosya kataloğuna ekleme kararıyla giderilir.
- OPFS Response açmak, dosyanın yeniden SHA-256 kontrolünden geçtiği veya modelin VRAM'e başarıyla yüklendiği anlamına gelmez.
- Kaynak pasaj kimlikleri her iddianın otomatik doğruluğunu garanti etmez; iki bağımsız incelemeci kabulü ayrıca gerekir.
- Bu testin varlığı, yayıncı KVKK/mağaza veya ticari ürün onayı anlamına gelmez.

## Kapanış kararı

| Kapı | Bugünkü karar |
| --- | --- |
| URL/cache eşlemesi ve Worker sahte yürütme kontrolleri | Sentetik CI |
| Gerçek Windows Chrome OPFS Worker ön testi | HOLD |
| Gerçek Windows Edge OPFS Worker ön testi | HOLD |
| OPFS → Transformers.js / ONNX gerçek üretim | HOLD |
| İnternet kapalı Türkçe üretim ve stream/iptal/bellek | HOLD |
| Kaynak sadakati, KVKK, mağaza ve ticari yayın | HOLD |

**Issue #4 açık tutulacaktır.** Bu işlemin PR'ı birleştirilse bile L2 için gerçek cihaz kanıtı olmadan PASS verilmeyecek.

## Referanslar

- [Transformers.js v3.8.1 yerel model kullanımı](https://huggingface.co/docs/transformers.js/v3.8.1/en/custom_usage)
- [Transformers.js v3.8.1 env API](https://huggingface.co/docs/transformers.js/v3.8.1/en/api/env)
- [Chrome uzantıları depolama](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)
