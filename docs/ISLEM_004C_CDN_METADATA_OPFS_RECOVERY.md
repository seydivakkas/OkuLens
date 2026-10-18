# İşlem 004-C — CDN Yönlendirme, Metadata SHA ve OPFS Kurtarma

**Tarih:** 18 Ekim 2026
**Depo:** seydivakkas/OkuLens
**Bağımlı Issue:** [#4](https://github.com/seydivakkas/OkuLens/issues/4)
**Durum:** Linux GitHub Actions üzerinden kaynak/HTTP HEAD doğrulaması ve sentetik kod testleri yapılmıştır. **Windows Chrome/Edge indirme/CORS, tam ONNX modeli, gerçek offline üretim, streaming/bellek ve ticari yayın HOLD.**

Bu belge önceki [İşlem 004-B](ISLEM_004B_TARAYICI_MODEL_DOGRULAMA.md), [TİCARİ-002](TICARI_002_MODEL_KURULUM_VE_DEPOLAMA.md) ve [TİCARİ-003](TICARI_003_GIZLILIK_KVKK_GUVENLIK.md) üstüne eklenen, doğrulanabilir mühendislik ekidir. Model kurulumunu kullanıcı adına otomatik başlatmaz.

## 1. Doğrulanan CDN bulgusu ve kapsamı

**Bağımsız CI kaydı:**
- [Model metadata/HEAD denetim koşusu](https://github.com/seydivakkas/OkuLens/actions/runs/39125079767)
- İşlenen model: \`onnx-community/Qwen3-0.6B-Instruct-ONNX\`
- Sabit revizyon: \`54250909aca286a05b9d013c8af7a21859ee6ead\`.
- Meta dosyalar gerçek HTTPS GET ile indirilip SHA-256 değerleri hesaplandı. Büyük model ağırlıkları **indirilmedi**: sadece HTTPS HEAD yönlendirmesi ve içerik boyutu okundu.

| Uç nokta | HEAD durumu | Gözlenen yönlendirme hostu | Bildirilen bayt |
| --- | --- | --- | --- |
| WebGPU: onnx/model_q4f16.onnx | HTTP 200 | us.aws.cdn.hf.co | 648449396 |
| WASM: onnx/model_q4.onnx | HTTP 200 | us.aws.cdn.hf.co | 996522744 |
| tokenizer.json | GET 200 / SHA üretildi | us.aws.cdn.hf.co | 11422654 |
| Diğer 8 metadata dosyası | GET 200 / SHA üretildi | huggingface.co | Ayrı kayıt aşağıda |

**İzin kararı:** Manifest içine genel \`https://*/*\` eklenmedi. Mevcut \`https://huggingface.co/*\` iznine yalnız **gözlenmiş** \`https://us.aws.cdn.hf.co/*\` opsiyonel izni eklendi; kullanıcı model indirmeyi açıkça başlatırken ikisini birlikte onaylayabilir. İki adresin bir GitHub Linux koşusunda erişilebilir olması, Chrome/Edge mağaza sürümünde aynı izin/CORS zincirinin mutlaka başarılı olacağına veya gelecekte hostların değişmeyeceğine dair garanti değildir.

Yükleyici \`credentials:'omit'\`, \`referrerPolicy:'no-referrer'\`, \`cache:'no-store'\` kullanır; model kaynağındaki URL kullanıcı metni içermez. Son yönlendirme TLS değilse veya izin verilen Hugging Face ailesinden değilse **MODEL_RESPONSE_NOT_HTTPS / MODEL_REDIRECT_HOST_UNAPPROVED** üretir. Tarayıcının CORS/izin engeli **MODEL_CDN_OR_CORS_BLOCKED** olarak sınıflandırılır; tüm siteleri kapsayan yeni izin otomatik istenmez.

## 2. Metadata sabit SHA-256 listesi

[Metadata audit CI örneği](https://github.com/seydivakkas/OkuLens/actions/runs/39124671858) dokuz gerçek dosyayı sabit model revizyonundan indirerek aşağıdaki SHA-256 değerlerini üretti. Değerler artık \`shared/browser-model-catalog.mjs\` içinde sabittir ve **her kurulumda** indirilen dosyayla karşılaştırılır; sadece sonradan manifestte saklanan hash yeterli sayılmaz.

| Dosya | SHA-256 | Bayt |
| --- | --- | ---: |
| config.json | c62bd6f68dc0d4d2436c86ad002a81ac6c8b9029837b8ea5f5404811eb465529 | 1359 |
| tokenizer.json | aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4 | 11422654 |
| tokenizer_config.json | 443bfa629eb16387a12edbf92a76f6a6f10b2af3b53d87ba1550adfcf45f7fa0 | 5404 |
| generation_config.json | 64d86df2173901c58389974bde21f7d2ab9eb7d79f35a337753329d39cf265c0 | 214 |
| chat_template.jinja | b692e04b8bbd2723e45851897691899d7b4b5abb4974ed99ac60331b5001a99d | 3645 |
| added_tokens.json | c0284b582e14987fbd3d5a2cb2bd139084371ed9acbae488829a1c900833c680 | 707 |
| merges.txt | 8831e4f1a044471340f7c0a83d7bd71306a5b867e95fd870f74d0c5308a904d5 | 1671853 |
| special_tokens_map.json | 76862e765266b85aa9459767e33cbaf13970f327a0e88d1c65846c2ddd3a1ecd | 613 |
| vocab.json | ca10d7e9fb3ed18575dd1e277a2579c16d108e32f27439684afa0e10b1440910 | 2776833 |

**Sınır:** Metadata hashleri, belirtilen upstream committen indirilen byte dizilerinin yerel SHA-256 değerleridir; bunlar upstream tarafından imzalı bir yazılım dağıtım kanıtı veya modelin güvenli/doğru metin ürettiğinin kanıtı değildir. ONNX ağırlıkları için önceki upstream SHA pinleri korunuyor; ağırlıkların tamamının indirildiği iddia edilmez.

Doğrulama zinciri:
- CI: \`node scripts/audit-model-metadata.mjs\` — her sabit metadata dosyasını yeniden indirir, katalog hashlerini kontrol eder; uyuşmazlıkta FAIL.
- Tarayıcı: \`shared/browser-model-store.mjs\` — dosya akışında SHA doğrulanmazsa kurulum manifesti yazılmaz ve geçici dosya atılır.
- Yerel geliştirici: \`npm run model:install -- --accept-license\` — metadata SHA beklenir; \`npm run model:verify\` — indirilen dosyanın hashini sabit değerle yeniden karşılaştırır.

## 3. Çökme sonrası OPFS kurtarma sözleşmesi

Yeni \`shared/opfs-model-recovery.mjs\` aktif model kayıtlarını koruyup **yalnız rastgele 32 haneli hex kurulum klasörlerini** sahipsiz dosya adayı sayar.

1. **Tara / dry-run:** OPFS \`okulens-model-v1\` altında aktif \`installId\` hariç güvenli UUID klasörleri sayılır, dosya boyutları toplanır; hiçbir şey silinmez.
2. **Açık onay:** Ayarlar ekranı kullanıcıdan silmeden önce ayrıca onay ister.
3. **Temizlik:** Aynı Web Lock ile eşzamanlı indirme/silme yarışları engellenir; aktif kayıt, bilinmeyen biçimli klasörler ve farklı kökenler korunur.
4. **Sonuç:** Silinen klasör sayısı gösterilir; üretken modelin çalışıp çalışmadığına ilişkin PASS verilmez.

Sahipsiz klasör, yalnızca kayıtlı **aktif olmayan** bir kurulum kimliğidir; haricî test/mağaza paketleri veya veri dışa aktarımları bu temizlik kapsamına girmez. Çökme anı otomatik olarak kaydedilmiyor; yeniden başlatma sonrası tarama **kullanıcı eylemiyle** başlatılır. OPFS'de gerçek tarayıcı çökmesi, atomiklik, uzun dosyalarda performans ve kota baskısı kabulü yine HOLD.

## 4. OPFS → Transformers.js aday adaptörü / ağ güvenlik eşiği

Önceki Worker modelini uzantının OPFS kayıtlarıyla ilişkilendiren \`shared/local-model-bridge.mjs\` ve \`worker/local-model-worker.mjs\` korunur. Yükleyici \`env.allowRemoteModels=false\` ayarındadır. Bu işlemde OPFS adaptörü aktifken Worker'ın \`fetch\` isteği HTTP(S) protokolüne yönelirse **RUNTIME_REMOTE_FETCH_FORBIDDEN** hatası üretmesi kodlandı. Sadece uzantı içi paketli çalışma dosyaları ve doğrulanmış OPFS Response kullanılması amaçlanır.

**Bu kod sınırlaması, gerçek tarayıcıda sıfır ağ paketi tespit edildiğine dair kanıt değildir.** ONNX Runtime/Transformers.js URL çözümü, import davranışı, GPU yükleme ve tüm ağ egress yolu ayrıca Windows Chrome ve Edge DevTools/HAR kayıtlarıyla incelenmelidir. OPFS dosya varlığı, çalışan yerel üretken model anlamına gelmez.

## 5. Öncelik matrisi

| Öncelik | Bugüne kadar yapılan | Kalan kabul |
| --- | --- | --- |
| 1 — CDN/izin | Gerçek GitHub Actions HTTPS GET/HEAD ile us.aws.cdn.hf.co hostu ölçüldü; dar opsiyonel izin ve hata sınırları kodlandı | **Windows Chrome/Edge gerçek indirme ve CORS HOLD** |
| 2 — Metadata / crash recovery | Dokuz metadata SHA pinlendi; CI yeniden doğruluyor; kuru tarama ve kullanıcı izinli OPFS temizleme kodlandı | **Windows yeniden başlatma/kota/çökme testi HOLD** |
| 3 — OPFS → Transformers.js | Yükleme adaptörü korunuyor; HTTP(S) runtime fetch guard eklendi | **Gerçek ONNX token üretimi HOLD** |
| 4 — Ağ kapalıyken Türkçe 10/100/1000 | Studio kabul vakaları mevcut | **Gerçek Windows Chrome/Edge inference HOLD** |
| 5 — Streaming, RAM/VRAM, sadakat | JSON kanıt şeması mevcut | **Gerçek performans ve bağımsız kaynak incelemesi HOLD** |

Bu CI sonucunu vurgulamak gerekir: **Linux GitHub Actions HTTP/HEAD PASS ≠ Windows Chrome/Edge model kabul PASS**.

## 6. Sonraki somut işlem

Windows Chrome ve Edge'de kullanıcı tetiklemeli model indirmesinin baştan sona tamamlanmasını, OPFS temizliğini ve çalıştırma sırasında ağ kesik ONNX çıktısını ölçmek. Gerekli kanıtlar ve çevrimdışı test talimatları [İşlem 004-B](ISLEM_004B_TARAYICI_MODEL_DOGRULAMA.md) belgesinde tanımlıdır. İlk gerçek Chrome/Edge denemesi başarısızsa host URL, HTTP/CORS hata kodu ve model kurulum durumu kaydedilecek; geniş host iznine gelişigüzel geçilmeyecek.

**Genel karar:** TİCARİ-003 belge/kod ön denetim PASS korunur; model dosya zinciri CI düzeyinde PARTIAL/iyileşti; gerçek model/Windows/mağaza/ticari yayım **HOLD**.
