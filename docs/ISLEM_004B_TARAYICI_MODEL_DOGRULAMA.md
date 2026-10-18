# İşlem 004-B — Gerçek Chrome/Edge OPFS → ONNX Çevrimdışı Kabul Protokolü

**İlişki:** [Issue #4](https://github.com/seydivakkas/OkuLens/issues/4), [TİCARİ-002](TICARI_002_MODEL_KURULUM_VE_DEPOLAMA.md), [TİCARİ-003](TICARI_003_GIZLILIK_KVKK_GUVENLIK.md)
**Durum (18 Ekim 2026):** **HOLD**; gerçek Windows Chrome/Edge test kanıtları bulunmadığından PASS ilan edilmeyecek.
**Kod referansları:** shared/browser-model-catalog.mjs, shared/browser-model-store.mjs, shared/local-model-bridge.mjs, worker/local-model-worker.mjs, studio/acceptance.html.

## 1. Kabul amaçları

- Kullanıcının ilk kez indirdiği sabit Qwen3-0.6B ONNX ağırlığı gerçekten Chrome/Edge'de izinli Hugging Face/CDN zinciriyle cihaza ulaşmalı.
- OPFS'e indirme, ağırlık dosyasında upstream SHA-256 doğrulaması, metadata dosyasında bağımsız kaynak hash kontrolü, yeniden açma ve silme ölçülmeli.
- Transformers.js 3.8.1 ve yerel ONNX Runtime Web, OPFS'deki veri dosyalarını gerçekten bulup yükleyebilmeli.
- Ağ kesildikten sonra 10/100/1000 hedefli **gerçek Türkçe model çıkarımı** üretilebilmeli. Yerel TextRank fallback'i ONNX üretimi olarak raporlanamaz.
- Streaming, ilk token/olay süresi, iptal, yeniden başlatma, RAM/VRAM ve kaynak sadakati bağımsız kayıtlarla doğrulanmalı.
- Gizlilik: ONNX üretiminde dış IP/HTTP isteği olmamalı; model kurulumunda kullanıcı kaynak/e-posta metni HTTP isteğine eklenmemeli.
- İndirme hatası, kullanıcı izni reddi, yetersiz kota, bozuk SHA ve çökme sonrası sahipsiz model dosyaları için açık güvenlik durumu olmalı.

## 2. Test ortamları — iki gerçek tarayıcı şartı

| Test kimliği | Hedef | Geçerli kanıt |
| --- | --- | --- |
| B-CH | Windows 10/11, desteklenen Chrome Stable | Gerçek tarayıcı sürümü, uzantı sürümü, model SHA çıktısı, HAR/Network denetimi |
| B-ED | Windows 10/11, desteklenen Edge Stable | Bağımsız gerçek Edge sürümü, aynı test kümesi ve kanıt |
| B-GPU | NVIDIA/AMD/Intel destekli GPU ile WebGPU (varsa) | gerçek kullanılan backend, GPU sürücüsü, VRAM ölçüm yöntemi |
| B-CPU | Ayrı kurulmuş WASM q4 dosyaları | WASM gerçek inference, RAM ve süre ölçümü |
| B-OFF | Ağ kesilmiş oturum (Chrome ve Edge ayrı) | Başlangıçtan nihai metne kadar çevrimdışı üretim ve HAR |

Linux Chromium veya Node birim testi Windows Chrome/Edge kabulünün yerine geçmez. Bu oturumda model ağırlığı indirilmedi; gerçek tarayıcı çalışması yapılmış veya VRAM ölçülmüş değildir.

## 3. İlk kuruluma hazırlık

1. Yayın adayı commit SHA'sını ve manifest sürümünü kaydet.
2. Kaynak kodundan paketlenen JavaScript + WASM dosyalarının tamamını ve NOTICE/SBOM çıktılarını doğrula.
3. Windows'ta geliştirici sürümünü Chrome Extensions / Edge Extensions üzerinden paketlenmemiş uzantı olarak yükle; test sonrasında mağaza paketini ayrıca incele.
4. Tarayıcı geliştirici konsolu ve Network görünümü önceden aç; başlangıçtan itibaren kayıt al, uygun yerde Chrome DevTools Network export HAR dosyası üret (gizli URL, cookie veya header'ı kanıtla paylaşmadan önce ayıkla).
5. Ayarlar üzerinden OPFS model yönetimi: önce izin reddi ve sıfır indirme davranışı; ardından yalnız açık onaylı model indirme. Model kartı, yaklaşık boyut ve kaynak revision kullanıcıya görünür olmalı.
6. Hugging Face resolve URL'sinden redirect target host zincirini belirle ve gerçekten hangi host için izin/Fetch/CORS gerekli olduğunu kaydet. Geniş bütün siteler izni **ekleme**.
7. Tam model indirmesi bittiyse ağırlık SHA-256, metadata upstream hashleri ve gerçek OPFS dosyaları doğrulanmalı. metadata upstream hash sabitlenmemişse **tam model kökeni HOLD**.
8. Tarayıcı kapat/aç: modelin varlığı/OPFS klasörü/manifest tutarlılığı yeniden kontrol edilmeli. Profil değişikliği testini ayrı kaydet.

## 4. Gerçek model üretimi ve motor kimliği

1. 'Yerel üretken ONNX' motorunu açıkça seç, TextRank fallback'i bu testte başarı olarak sayma.
2. Studio → Gerçek Model Kabul Laboratuvarı içinde sentetik Türkçe vaka 'micro', 'standard', 'deep', 'simple', 'injected' ayrı çalıştırılır.
3. Testte model kimliği ve revision, gerçek backend, model yüklenme süresi, ilk akış olayı, akış sayısı, toplam süre, gerçek kelime sayısı ve son metni kaydet.
4. DevTools Network kayıtlarını model yükleme/özetleme sırasında açık tut; sadece OPFS'den yerel dosya okunduğu ve uzak model/AI isteği bulunmadığı bağımsız incelenmeli.
5. İnternet bağlantısını fiziksel/işletim sistemi üzerinden kes, tarayıcıyı yeniden başlat ve yine aynı testi uygula. Sayfanın yüklenememesi ayrı durum; kabul fixture'ı uzantı sayfasında yerel bulunmalı.
6. Uzun vaka çalışırken İptal, yeniden başlatma ve sekme kapatma denenmeli; Worker terminate ve GPU/bellek temizliği gerçek araçlarla ölçülmeli.
7. Chrome ve Edge için ayrı JSON kanıtları yazılır; iki tarayıcıdaki tek bir başarı genellenmez.

**Bilinen teknik uyumluluk riski:** Worker'daki Transformers.js customCache ve fetch adaptörü URL anahtarlarına bağımlıdır; yerel OPFS Response üretmek gerçek modelin kütüphane tarafından o URL'den istendiğini doğrulamaz. Gerçek testte öncelikle model ağırlığının hangi path üzerinden istendiği kanıtlanmalı ve yalnız bu path'ler izin listesine alınmalıdır. Müşteriye “model hazır” mesajı doğrulanana kadar “dosyalar depoda / runtime kabulü bekliyor” yazılmalıdır.

## 5. Bellek, disk ve yeniden başlatma

| Ölçüt | Kaynak | Yanlış yorum |
| --- | --- | --- |
| OPFS bytes / usage / quota | navigator.storage.estimate() + doğrulanmış dosya boyutları | Gerçek fiziksel boş alan veya kesin evict garantisi değildir |
| JS heap | performance.memory varsa | GPU VRAM değildir |
| Sistem RAM | Windows Görev Yöneticisi / Performance Monitor | Tek modelin münhasır RAM'i için süreç ayrımı gerekir |
| GPU/VRAM | NVIDIA için nvidia-smi, diğer GPU'larda üretici ölçüm aracı | JS heap'i VRAM diye etiketleme |
| Soğuk/sıcak süre | performance.now + Worker olayları | İlk yükleme ile sonraki üretim birbirine karıştırılmaz |
| Model dosyası SHA | upstream hash + yerel hesaplanan hash | Manifestte SHA yazıyor diye dosyanın doğrulandığı kabul edilmez |

**Cihaz kabulündeki başarısızlık davranışları:** Yetersiz kota, kesintili ağ, SHA mismatch, özel tarayıcı profili, çökmeden kalan klasörler, iki eş zamanlı indirme ve model silme/yeniden kurma. Sahipsiz dosyaların tarayıcı yeniden başlatıldıktan sonra otomatik veya kullanıcı komutuyla güvenle temizlenmesi henüz kodlanmış kabul edilmeyebilir; yeniden doğrulamadan PASS verilmez.

## 6. Güvenlik ve gizlilik kanıtı

- Kullanıcı tarafından sağlanmış özel e-posta **kullanılmamalı**; örnek fixture sentetik ve izinli olmalı.
- HAR dosyaları tarayıcı kimlik ve çerez içerebilir; kamu GitHub'a ham HAR yüklenmemeli. Yerel gizli depoda sakla, sadece temizlenmiş network uç noktası/sonuç/kontrol SHA'sını raporla.
- Gönderici/alıcı meta alanlarının çıkarılmaması, mesaj gövdesinin kişisel veri olmadığı anlamına gelmez.
- Model indirme sırasında ağ isteğinin hedefi/hangi veriyi içerdiği denetlenir; kullanıcı metni URL, gövde, header veya telemetri parametresine katılmamalıdır.
- Model ağırlığı yalnız veri olarak kullanılmalı; mağaza dışında yeni JS/WASM mantığı indirme yolu açılmamalıdır.
- Test raporu teknik gözlem kaydıdır, hukuk/mağaza uygunluk kararı değildir.

## 7. Kabul kanıt matrisi

| ID | Kanıt | Bugünkü karar |
| --- | --- | --- |
| A00 | npm/CI sözdizimi ve sentetik birim testleri | Kod seviyesinde kontrol; gerçek cihaz değil |
| A01 | Chrome resmi sürüm + gerçek model indirme HAR + izin kaydı | HOLD |
| A02 | Edge resmi sürüm + gerçek model indirme HAR + izin kaydı | HOLD |
| A03 | Ağırlık ve metadata bağımsız upstream SHA + yerel doğrulama | PARTIAL/HOLD |
| A04 | OPFS kalıcılık, yeniden açma, model silme, çökme sonrası artık temizliği | HOLD |
| A05 | Transformers.js OPFS modelini gerçek WebGPU/WASM yükledi | HOLD |
| A06 | Ağ kesik Chrome/Edge gerçek Türkçe ONNX çıktısı (TextRank değil) | HOLD |
| A07 | 10/100/1000, 2 kişilik kaynak incelemesi, iddia sadakati | HOLD |
| A08 | Streaming, gerçek iptal, RAM, VRAM, çıktı gecikmesi | HOLD |
| A09 | Gizlilik ağ izleri ve KVKK/mağaza uzman incelemesi | HOLD |

**Kapanış kuralı:** Tüm zorunlu kapılar bağımsız kanıtla geçmedikçe [Issue #4](https://github.com/seydivakkas/OkuLens/issues/4) açık/HOLD kalır. Depolama/sözdizimi/sentetik CI PASS, üretken ürün kabulüne dönüştürülemez.

## 8. Kalan açık mühendislik kusurları

- CDN yönlendirme/CORS ve dar izin politikası gerçek tarayıcıda doğrulanmadı.
- Metadata için upstream SHA sabitleme/derleme girdisi ve eksiksiz model kökeni eksik.
- OPFS/Transformers.js adaptörünün gerçek onnx weight+tokenizer dosyalarını okuduğu kanıt yok.
- Yeniden başlatma, model güncelleme ve crash recovery gerçek kabulü yok.
- Ekrandaki bütün indirme/yerel veri beyanları TİCARİ-003'te güncellenirken model çıkarımının gerçek ağ koşulları yine HOLD.
- Yayın adayı dependency lockfile ve model paketi lisans/SBOM kapıları ayrı tamamlanmalı.

## 9. Referanslar

- [Chrome extensions — Storage](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)
- [Chrome Web Store — Manifest V3](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- [Chrome permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Transformers.js v3 API](https://huggingface.co/docs/transformers.js/v3.8.1/api/env)
- [Qwen ONNX model](https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX)


## Ek: İşlem 004-C bulgusu (18.10.2026)

[İşlem 004-C](ISLEM_004C_CDN_METADATA_OPFS_RECOVERY.md) kapsamında dokuz metadata dosyasının SHA-256'sı bağımsız GitHub Actions indirmesinde hesaplanarak kataloğa pinlendi. WebGPU ve WASM ağırlıkları **indirilmeden**, HEAD ile `us.aws.cdn.hf.co` yönlendirmesi gözlendi. Bu host için kullanıcı isteğiyle verilen dar opsiyonel izin kodlandı. Sahipsiz OPFS model kurulumlarını kuru tarayan/onaylı temizleyen kod ve sentetik testler eklendi. Bunlar bu belgedeki Windows Chrome/Edge, gerçek yükleme ve çevrimdışı model kabul kapılarını **kapatmaz**.
