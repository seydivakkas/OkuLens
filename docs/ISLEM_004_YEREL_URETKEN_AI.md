# İşlem 004 — Yerel Türkçe üretken AI / ONNX / WebGPU / WASM

**Issue:** https://github.com/seydivakkas/OkuLens/issues/4  
**Durum (18.10.2026):** Kaynak kodu, model indirici, yerel runtime derleme yolu, sentetik testler hazır. Üretken model ağırlıkları GitHub'da YOK; gerçek model inference, Windows Chrome/Edge, performans ve kalite kabulü **HOLD**.

## Teknik karar (ADR-004)

- İlk aday **onnx-community/Qwen3-0.6B-Instruct-ONNX**. ONNX model kartında Apache-2.0 lisansı açıklanıyor.
- Kaynak commit (sabit): 54250909aca286a05b9d013c8af7a21859ee6ead.
- WebGPU q4f16: onnx/model_q4f16.onnx, yaklaşık **648 MB**, kaydedilmiş sağlayıcı SHA-256: **4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d**.
- WASM q4: onnx/model_q4.onnx, yaklaşık **996 MB**, kaydedilmiş sağlayıcı SHA-256: **a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d**.
- Runtime **@huggingface/transformers@3.8.1** ve ONNX Runtime Web üzerinden çalışacak biçimde kodlandı; build-only bağımlılıklar ve paketli WASM kullanılır. Runtime ortamında CDN/dinamik uzaktan kod veya uzaktan LLM API'si yok.
- GPU yoksa/VRAM yetersizse WASM yolu yalnızca ayrı q4 paketi mevcutsa denenir; aksi hâlde kaynaklı uyarı + TextRank düşüşü. GPU varlığının modelin çalıştığı anlamına gelmediği açıkça belirtilir.

Kaynaklar:
- https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX
- https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX/commit/54250909aca286a05b9d013c8af7a21859ee6ead
- https://huggingface.co/docs/transformers.js
- https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy

## Windows 10/11 geliştirici kurulum işlemleri

Node.js 20+ ve git gerekir.

1. Projeyi indir/klonla, **önce README ve model Apache-2.0 lisansını incele**.
2. Bağımlılıkları yükle: `npm install`. Bu adım büyük ONNX modelini indirmez.
3. Runtime'ı uzantı dosyaları içine paketle: `npm run build:runtime`. Build başarısız olursa model hazır sayılamaz.
4. Model indirmeye **ayrıca onay vererek** yalnızca WebGPU q4f16 dosyalarını indir: `npm run model:install -- --accept-license --backend=webgpu`.
5. CPU/WASM gerektiğinde q4 dosyası için ayrıca: `npm run model:install -- --accept-license --backend=wasm`. Her iki backend'i tek işlemde indirmek için `--backend=both`.
6. `npm run model:verify` ile tüm mevcut dosyaların SHA-256 değerlerini yeniden hesapla.
7. Chrome/Edge uzantıları sayfasında **Paketlenmemiş öğe yükle** ile proje klasörünü aç. Uzantı içinde model durumu gösterilir.
8. Kurulu modeli yerel ortamdan kaldırmak istersen: `npm run model:remove -- --confirm`. İşlem yerel `models/` klasörünü siler, geri alınamaz.

Model kurulum betiği yalnızca komutla çalışır; kullanıcı izni olmadan ilk kullanımda ağ üzerinden model indirmez. Araç dosyaları `models/` içinde kalır; `.gitignore` bunları GitHub'a taşımaz. `models/model-manifest.json` indirilen her dosyanın gerçek SHA-256 değerini ve kaynak commitini kaydeder. ONNX ağırlığı için hem kaynak SHA hem hesaplanan SHA karşılaştırılır. Meta dosyalar ise kaynak commitinden indirilip SHA değerleri kurulum defterine yazılır.

## Çalışma mimarisi

1. Kaynak çıkarımı: Readability, Gmail/Outlook veya YouTube (mevcut modüller).
2. `shared/generative-plan.mjs`: Kaynağı muhafazakâr **3.500 karakter** bütçeli metin parçalarına ayırır. Bu bir tokenizer ölçümü değil, aşırı uzun prompt riskini düşürmek için sabit üst sınırdır. 48'den fazla parçalı belge bu sürümde reddedilir.
3. `worker/local-model-worker.mjs`: Kullanıcı eylemi sonrası kurulu manifest ve backend'i kontrol eder. `env.allowRemoteModels=false`, `env.allowLocalModels=true` ayarlanır. Model yalnızca uzantının yerel yollarından yüklenir.
4. Tek parça: doğrudan generation. Çok parça: map (her pasajın ayrı özeti), reduce (özetlerden katmanlı özet). 1000 hedefinde her kaynak bölümünün özetiyle birlikte üst düzey bölüm sentezleri eklenir. Bölüm etiketi C001/S1...
5. `shared/local-model-bridge.mjs`: Worker tokenlarını yan panelde geçici akış halinde gösterir, işlemin bitiminde son metni sağlar. İptalde worker sonlandırılır. Model yükleme/iptal/arızasında TextRank düşüşü açıkça etiketlenir.
6. 10/100/1000 **hedef**tir; maksimum model tokenı ve gerçek son kelime sayısı ayrı ölçülür, garanti verilmez. Kısa kaynak 1000 kelimeye yapay şekilde uzatılmaz.

## Kaynak kökeni ve güvenlik

Kaynak aralıkları `C001` gibi kimliklerle, `startChar/endChar` yaklaşık belge konumuyla sunulur. **Bu kimlikler cümle veya iddia düzeyinde kanıt doğrulaması değildir.** Hallucination riski devam eder. Kullanıcı talimatları kaynak gövdeden ayrılır; yine de prompt injection'a karşı mutlak koruma iddiası yoktur. Model yan panel worker'ında çalışır, e-postalar harici API'ye gönderilmez; kurulu motorun herhangi bir ağ talebi bulunmaması gerçek tarayıcı ağ denetimiyle henüz sınanmadı.

## Kabul kaydı

| Kontrol | Durum |
| --- | --- |
| ONNX runner/worker arayüzü ve map-reduce kaynağı | KOD |
| CLI açık kullanıcı onayı / SHA ve lisans kaydı | KOD |
| Worker streaming ve hard-cancel | SENTETİK |
| 10/100/1000 bütçe ve bölüm kökeni | SENTETİK |
| Browser runtime bundling + model 0.6B gerçek inference | HOLD |
| Turkish kolay/orta/zor çıktı kalitesi / halüsinasyon ölçümü | HOLD |
| VRAM, RAM, GPU/WASM ve benchmark sonuçları | HOLD |
| Chrome / Edge Windows 10/11 gerçek kabul | HOLD |

**Issue #4 kapanış kararı:** Model ağırlıkları ve runtime kurulumuyla en az bir gerçek Türkçe özet üretimi bağımsızca doğrulanmadan **Issue kapatılmamalıdır**. Birim/CI PASS sadece entegrasyon iskeletinin sentetik çalıştığını gösterir.
