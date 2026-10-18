# TİCARİ-002 — Mağaza Uyumlu Model Kurulumu ve Kalıcı Depolama Mimarisi

**Karar kimliği:** COMMERCIAL-MODEL-STORAGE-V1
**Tarih:** 18 Ekim 2026
**Kapsam:** Windows 10/11 Chrome/Edge uzantısı; yerel ONNX modelinin kullanıcı tarafından kurulması, bütünlük doğrulaması, saklanması ve kaldırılması.
**Durum:** Tarayıcı kurulum modülleri ve arayüzü geliştirildi; gerçek Chrome/Edge modeli indirip çalıştırma, depolama dayanıklılığı, mağaza ve hukuk kabulü HOLD.
**İlgili kararlar:** [TİCARİ-001](TICARI_001_URUN_VE_LISANS_STRATEJISI.md), [Ticari Uyum](TICARI_KULLANIM_POLITIKASI.md), [İşlem 004-A](ISLEM_004A_GERCEK_MODEL_KABUL.md), [Issue #4](https://github.com/seydivakkas/OkuLens/issues/4).

## 1. Ürün hedefi ve korunan sınırlar

Önceki model yükleyici, Node.js komutlarıyla geliştirme klasörüne dosya indiriyordu. Mağazadan yüklenen bir Chrome/Edge uzantısının kurulu program dosyalarını bu yöntemle değiştirmesi beklenemez. TİCARİ-002'nin hedefi, büyük model dosyalarının **kullanıcı eylemiyle uzantı kökeninde** depolanabilmesidir. Kullanıcının e-posta, makale veya video metni model indirme sunucusuna aktarılmaz. Ücretli LLM API, otomatik hesap veya abonelik gerektirilmez.

Açık MIT çekirdeği ve ilerideki Free/Pro/Business mimarisi değiştirilmez. Model ağırlığının Apache-2.0 koşulları, OkuLens Pro lisansından ayrıdır. Model yüklenemezse TextRank fallback gösterilir; gerçek model çalışmış gibi etiket yazılmaz.

## 2. Kalıcı depolama kararı: OPFS

İlk uygulama tarayıcının origin-private file system (OPFS) özelliğini kullanır. Uzantı kendi origin'i altında model dosyaları saklar. Uygulama genel Windows dosya sistemi izni istemez.

| Yöntem | Kullanım | Sınır |
| --- | --- | --- |
| OPFS | Büyük ONNX dosyaları, tokenizer/config | Asıl model deposu adayı; gerçek yeniden başlatma kabulü HOLD |
| chrome.storage.local | Küçük kurulum kaydı, dosya hashleri ve aktif model kimliği | 648 MB/997 MB ağırlıklar burada tutulmaz |
| Cache Storage | Transformers.js native cache uyarlaması için alternatif | Runtime uyumu ve çift yer tüketimi ölçülmeli |
| IndexedDB | Alternatif Blob veya katalog | Büyük model dayanıklılığı ayrıca denenmeli |
| Windows yardımcı programı | İleride Business için seçenek | Bugünkü uzantıya zorunlu değildir |

OPFS modeli tarayıcı profilinde tutulur; fiziksel dosya sistemindeki belirli bir dizini müşteriye vaat etmeyiz. Tarayıcı sürümü, kota baskısı, profil sıfırlama ve uzantı kaldırma saklama durumunu etkileyebilir. navigator.storage.persist() reddedilebilir; kalıcılık garantisi değildir. İlk uygulama geniş unlimitedStorage izni istemez.

Önerilen düzen:

~~~text
OPFS / okulens-model-v1 / rastgele-kurulum-kimliği /
  config.json
  tokenizer.json
  tokenizer_config.json
  generation_config.json
  chat_template.jinja
  onnx / model_q4f16.onnx       (WebGPU)
  veya onnx / model_q4.onnx    (WASM)
~~~

Aktif küçük manifest chrome.storage.local altında saklanır ve dosya boyutlarıyla SHA-256 değerlerini taşır. Manifest kaydı ancak **tüm zorunlu dosyalar indirilip doğrulandığında** oluşturulur. Yeni kurulum başarısızsa eski aktif model korunur. Boş/yetim kurulum klasörleri için çökme sonrası temizlik henüz ayrı gereksinimdir.

## 3. Sabit model paketi

Model adayı: onnx-community/Qwen3-0.6B-Instruct-ONNX  
Kaynak commit: 54250909aca286a05b9d013c8af7a21859ee6ead  
Lisans: Model kartı Apache-2.0 gösteriyor. Ağırlıkların yeniden dağıtımı için tüm upstream bildirimleri ayrıca incelenmelidir.

| Çalışma türü | Ağırlık | Yayıncı SHA-256 | Yaklaşık büyüklük |
| --- | --- | --- | --- |
| WebGPU q4f16 | onnx/model_q4f16.onnx | 4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d | 648 MB |
| WASM q4 | onnx/model_q4.onnx | a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d | 997 MB |

Ağırlık SHA-256'sı upstream kaynak değeriyle eşleştirilir. Metadata dosyaları indirildikleri anda hesaplanan hashlerle kayıt altına alınır; **metadata için bağımsız, önceden sabitlenmiş SHA değerleri henüz yoktur**. Bu nedenle modelin tam tedarik zinciri bütünlüğü PASS değil PARTIAL/HOLD'dur. Gerçek dosya envanterinin hangi tokenizer dosyalarını gerektirdiği de ONNX runtime üzerinden doğrulanmalıdır.

## 4. Kullanıcı eylemi ve kurulum durumu

1. Kullanıcı Ayarlar ekranında model lisansını, kaynak adresini, yaklaşık boyutu ve istenecek izni görür. Sayfa açılırken model indirilmez.
2. Açık onay kutusu seçilir ve indirme düğmesine basılır.
3. Yalnızca Hugging Face kökenine yönelik opsiyonel host izni, kullanıcı jesti sırasında Chrome/Edge tarafından sorulur. Reddedilirse indirme yok.
4. Tarayıcıdan kota ve yer kullanımı tahmini alınır. Bilinmiyor veya yeterli görünmüyorsa kurulum fail-closed biçimde reddedilir.
5. Dosyalar sabit commit URL'sinden parça parça alınır; büyük bir Buffer içinde SHA-256 hesaplamaya ihtiyaç duymayan artımlı doğrulayıcı çalışır. OPFS yazılır.
6. Her dosyanın aktarımı ve hash sonucu gösterilir; tüm zorunlu dosyalar doğrulanmadan READY işareti verilmez.
7. İptalde veya ağ/kota/hash hatasında yeni kurulum klasörü silinir; eski kayıt korunur.
8. Kullanıcı yeniden SHA denetimi veya model silme eylemini açıkça başlatabilir.

**Kritik dış engel:** Hugging Face büyük dosyaları CAS/CDN hostlarına yönlendirebilir. Sadece huggingface.co izninin tüm yönlendirme CORS kurallarını çözdüğü **varsayılmamalıdır**. Geniş https://*/* izni eklenmez. Bu zincir gerçek Chrome ve Edge'de doğrulanmadıkça kurulum özelliği ürün kabulü değildir; gerekirse resmî ağırlıkları kullanıcı tarafından seçilen dosyadan içe alma ayrı alternatif olarak geliştirilecektir.

## 5. İşlem hattı ve modelin gerçek çalışması

Yeni teknik dosyalar:
- shared/browser-model-catalog.mjs — sabit kimlik, sabit commit, model dosya listesi ve ağırlık hashleri.
- shared/incremental-sha256.mjs — akış halinde SHA-256, büyük ArrayBuffer gerektirmez.
- shared/browser-model-store.mjs — OPFS işlemleri, kota, model manifesti, atomik geçiş, hash denetimi, silme ve dosyayı Response olarak okuma.
- options/index.html / options/options.js — kullanıcı onayı, opsiyonel host yetkisi, backend seçimi, dosya aktarımı, iptal, yeniden doğrulama, silme.

**Kritik sınır:** Bu kodun model baytlarını OPFS'e saklayabilmesi ile ONNX Runtime'ın gerçek Türkçe model üretmesi farklıdır. Mevcut Issue #4 model worker'ının eski paket içi model URL'sini kullanması nedeniyle yeni OPFS deposunun Transformers.js v3.8.1 ile arayüzlenmesi ayrı entegrasyon koşuludur. OPFS'ten bir Response üretilebilmesi, kütüphanenin modelin tüm tokenizer/ONNX dosyalarını otomatik olarak bulduğu anlamına gelmez.

Transformers.js, customCache.match / put biçiminde önbellek özelleştirmesi sunar. Bu API'nin gerçek çalışma sırası, model dosyası URL anahtarı, dtype ve büyük dosya tüketimi **gerçek çalışma testinde** onaylanmalıdır. Bunu doğrulamadan model varsayılan motoru aktif hale getirilmez.

## 6. Kota, bellek ve depolama garantisi

İlk adımda boyut eşiği, ağırlık büyüklüğüne ek 100 MB metadata payı ve ek güvenlik katsayısıyla hesaplanır. Bu sayı bir kapasite öngörüsüdür; gerçek fiziksel boş disk veya toplam bellek tüketimi değildir.

- Dosyalar ağ akışından parça halinde OPFS'e yazılır, SHA-256 da parça parça hesaplanır.
- navigator.storage.estimate() tahmin bildirir; kullanım izni veya sonsuz kota değildir.
- navigator.storage.persist() kabul edilse bile profil silme/uzantı kaldırma gibi olaylardan koruyamaz.
- Modelin sıcak/soğuk başlatma süreleri, RAM ve GPU VRAM kullanımı henüz ölçülmedi.
- İndirme süresi ve aktarılan dosya sayısı gösterilir; toplam yüzde, Content-Length bilinmiyorsa kesin doğruluk iddiasıyla gösterilmez.
- Bir önceki modelden yenisine yükseltmede kısa süreli çift yer gereksinimi çıkabilir.

## 7. Kullanıcıya gösterilecek durumlar

| Durum | Kullanıcı anlamı | Karar |
| --- | --- | --- |
| NOT_INSTALLED | Tarayıcı model kaydı yok | İndirilebilir |
| CONSENT_REQUIRED | Açık onay verilmedi | İndirme yok |
| PERMISSION_DENIED | Hugging Face kökenine izin reddedildi | İndirme yok |
| QUOTA_UNKNOWN / INSUFFICIENT_STORAGE_QUOTA | Depolama tahmini yeterli değil | Kurulum yok |
| DOWNLOADING | Dosya bazlı MB ve sıra görünür | İptal edilebilir |
| VERIFYING | SHA doğrulama aşaması | Sürüm kaydı tamamlanmaz |
| INSTALLED_FILES_UNTESTED_RUNTIME | Dosyalar mevcut, üretken inference yapılmadı | Ürün AI PASS değil |
| MODEL_SHA256_MISMATCH | Ağırlık kaynak hashle uyuşmuyor | FAIL, yeni paket atılır |
| REMOVED | OPFS dosyaları kullanıcı isteğiyle silindi | Tekrar kurulabilir |
| INFERENCE_ACCEPTED | Ancak gerçek tarayıcı, dil ve ağ kanıtıyla alınabilir | Issue #4 kapısı |

## 8. Gizlilik ve mağaza koşulları

Uzantı JavaScript ve ONNX Runtime WASM kodunu **paketin içinde** bulundurmalıdır. Uzaktan çalıştırılabilir JS/WASM kodu indirilmez. Onnx ağırlıkları veri kategorisinde değerlendirilir; mağaza incelemesi ve kullanıcı verisi beyanı ayrıca yapılır. Kullanıcı e-posta/metni indirme sunucusuna gönderilmez. Yetkilerden yalnızca optional_host_permissions üzerinden Hugging Face kökeni istenir. Bu yaklaşım bile mağaza onayı garantisi değildir.

Gizlilik ve platform şartları TİCARİ-003; ürüne özel lisans TİCARİ-004; gerçek mağaza ve Windows kabulü TİCARİ-007 kapsamındadır.

## 9. Kabul tablosu

| Kapı | Kanıt durumu |
| --- | --- |
| Açık indirme onayı, izin/kota reddi, dosya akışı, SHA yardımcı kodu | KOD, sentetik CI kontrolü |
| Kurulu dosyanın OPFS üzerinden Chrome/Edge yeniden açmada görünmesi | HOLD |
| Büyük Hugging Face modelinin opsiyonel izin ve yönlendirmelerle gerçekten indirilmesi | HOLD |
| OPFS modelinin Transformers.js/ONNX Runtime tarafından offline yüklenmesi | HOLD |
| Modelin gerçek Türkçe 10/100/1000 çıktı üretmesi | Issue #4 HOLD |
| Bellek, GPU VRAM, streaming, zamanlama, bağımsız kaynak sadakati | Issue #4 HOLD |
| Metadata upstream hash ve eksiksiz model SBOM | PARTIAL/HOLD |
| Ticari mağaza/marka/gizlilik ve yayın onayı | HOLD |

**Genel karar: PARTIAL / GERÇEK CİHAZ HOLD.** Sentetik testlerin geçmesi, Chrome/Edge'de başarılı gerçek model kurulumu, üretim veya mağaza uygunluğu değildir. Issue #4 OPEN/HOLD olarak kalmalıdır.

## 10. Sıradaki tamamlayıcı aşamalar

- TİCARİ-002A: eksiksiz upstream model varlık listesi ve tüm metadata SHA'larını pinleme.
- TİCARİ-002B: CDN yönlendirme/CORS ve opsiyonel host iznini gerçek tarayıcıda doğrulama; gerekirse kullanıcı dosyası içe alma.
- TİCARİ-002C: OPFS/Transformers.js customCache adaptörünü gerçek offline inference ile doğrulama.
- TİCARİ-002D: çökme sonrası temizlik, sürüm yükseltme, stale dosya recovery, iptal/yeniden başlatma.
- TİCARİ-003 → TİCARİ-004 → TİCARİ-005 → TİCARİ-006 → TİCARİ-007, paralel Issue #4 gerçek model kabulü.

## 11. Resmî kaynaklar

- [Chrome Extensions Storage and Cookies](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)
- [Chrome Web Store MV3 gereksinimleri](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- [Chrome optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Transformers.js v3.8.1 env / customCache](https://huggingface.co/docs/transformers.js/v3.8.1/api/env)
- [Qwen3-0.6B-Instruct-ONNX model deposu](https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX)
