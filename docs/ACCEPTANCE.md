# OkuLens — Kabul Matrisi

Durum sözcükleri: `PASS` kanıtlı gerçek kabul; `PARTIAL` kapsam sınırlı; `HOLD` kanıt yok; `FAIL` testte ihlal.

## Yeni ana ürün: Windows Masaüstü P0 (İşlem 005)

**Öncelik değişti:** OkuLens önce Windows EXE/portable ZIP olarak geliştirilecektir. Aşağıdaki Chrome/Edge OPFS kabulleri korunmuş tarihsel uzantı doğrulama kayıtlarıdır; Windows P0 sürümünün bir önkoşulu değildir.

- [x] Electron masaüstü kabuğu ve iki panelli Türkçe arayüz kodlandı.
- [x] Ortak TF-IDF / TextRank motoruyla 10/100/1000 özet; TXT/MD açma ve TXT kaydetme kodlandı.
- [x] Renderer sandbox + contextIsolation, kısıtlı IPC, uzak HTTP engeli ve kaynak beyaz listesi kodlandı.
- [x] Portatif Windows x64 EXE/ZIP üretimi için Windows GitHub Actions iş akışı oluşturuldu.
- [ ] Gerçek Windows Electron GUI duman testinin CI'da kanıtlanması (CI sonucuna göre).
- [ ] Kullanıcı bilgisayarında Windows EXE açılışı, metin/dosya akışı ve ağsız çalışma fiziksel kabulü (HOLD).
- [ ] Yerel Qwen ONNX/VRAM/streaming ve kaynak sadakati (sonraki W-P1/W-P2 aşamaları, HOLD).
- [ ] Kurulum paketi imza, lisans/SBOM ve ticari yayın (HOLD).

[İşlem 005 Windows Masaüstü ana belge](ISLEM_005_WINDOWS_DESKTOP_P0.md)

## Önceki uzantı kabul kayıtları — ilk Windows sürümüne şart değildir

## Yerel kaynak kontrolleri

- [x] `manifest.json` JSON sözdizimi geçerli.
- [x] JavaScript modülleri Node `--check` ile sözdizimi taramasından geçti.
- [x] Extractive motorunun 7 adet saf fonksiyon testi yerel ortamda geçti (18.10.2026).
- [x] Uzaktan LLM API istemcisi kaynak kodunda yok.
- [x] Readability.js 0.6.0 paket entegrasyonu (kod + sentetik kontrol).
- [ ] Canlı makale sitelerinde gerçek Chrome/Edge doğrulaması (son kabul).
- [x] Koşullu Qwen3-0.6B ONNX model Worker/planlayıcı ve SHA installer kodu, sentetik birim denetimleri.
- [ ] Model dosyası/Transfomers.js runtime yerel paketinin kurularak gerçek Türkçe model inference PASS edilmesi (HOLD).
- [ ] WebGPU q4f16 ve WASM q4 backend gerçek Windows tarayıcı kontrolleri (HOLD).
- [x] Model kabulü için sentetik vakalar, tarayıcı kabul arayüzü ve indirilebilir `decision: HOLD` kanıt şeması geliştirildi.
- [ ] Gerçek 10/100/1000 model çıktılarının, kaynak sadakatinin ve Kolay/Orta/Zor seviyelerinin bağımsız incelenmesi (HOLD).
- [ ] Gerçek streaming / ilk akış süresi ve iptal deneyinin Windows Chrome + Edge üzerinde ölçülmesi (HOLD).
- [ ] RAM/VRAM ve çevrimdışı çalışma ağ kayıtlarının ölçülmesi (HOLD).
- [x] Gmail/Outlook/YouTube ayırıcıları için sentetik birim testleri.
- [ ] Unit + e2e tarayıcı testleri (gerçek tarayıcı).

## İşlem 004-E — Windows kabul ortam ve rapor paketi

- [x] PowerShell üzerinden Chrome ve Edge ortam dosyalarını ayrı kaydeden hazırlık betiği geliştirildi.
- [x] Veri taşıyan raporları yanlış PASS göstermeyen ve bağımsız kaynak/ağ/VRAM eksiğini açıklayan Node denetleyicisi geliştirildi.
- [x] Kanıt klasörü Git takibinden çıkarıldı; Windows AST ve HOLD çalışma kontrolleri CI kapsamına alındı.
- [ ] Kullanıcının gerçek Windows Chrome OPFS preflight ve tam ONNX üretim kanıtı (**HOLD**).
- [ ] Kullanıcının gerçek Windows Edge OPFS preflight ve tam ONNX üretim kanıtı (**HOLD**).
- [ ] Tam offline Türkçe 10/100/1000, streaming, RAM/VRAM, iki incelemeci kaynak sadakati (**HOLD**).

[İşlem 004-E Windows kabul paketi](ISLEM_004E_WINDOWS_KABUL_KANIT_PAKETI.md)

## İşlem 004-D — OPFS Worker Dosya/URL Ön Kontrolü

- [x] Yalnız paket içi model dosyalarını beyaz listeleyen, HTTP(S) uzak fetch'i engelleyen customCache adaptörü kodlandı.
- [x] OPFS Worker ön testi, iptal, ayrıntılı hata ve kullanıcı tarafından indirilen HOLD JSON kanıtı kodlandı.
- [x] Cache URL ve Worker taklit testleri eklendi.
- [ ] Chrome/Edge gerçek OPFS Worker ön testinin başarılı sonucuyla doğrulanması (**HOLD**).
- [ ] OPFS → Transformers.js tam model yükleme, gerçek internet kapalı Türkçe 10/100/1000 üretim, streaming, RAM/VRAM, bağımsız kaynak sadakati (**HOLD**).

[İşlem 004-D mühendislik belgesi](ISLEM_004D_OPFS_WORKER_PREFLIGHT.md)

## İşlem 004-C — CDN, Metadata, OPFS kurtarma

- [x] Dokuz upstream metadata dosyası sabit revizyondan Linux GitHub Actions ile indirilip SHA-256 pinlendi.
- [x] WebGPU/WASM ağırlıklarının yalnızca HTTP HEAD yönlendirme hostu ve content-length bilgileri Linux CI üzerinde doğrulandı: us.aws.cdn.hf.co.
- [x] Dar opsiyonel CDN izni ve metadata SHA kurulum fail-closed sözleşmesi kodlandı.
- [x] OPFS sahipsiz klasörleri kuru tara / açık onayla sil; aktif kurulum korunur (sentetik).
- [ ] Chrome/Edge gerçek CDN CORS/izin/ONNX tam dosya indirme kabulü (**HOLD**).
- [ ] Windows OPFS çökme sonrası temizlik, yeniden açma, tam model WebGPU/WASM yükleme (**HOLD**).
- [ ] Gerçek ağ kapalıyken Türkçe ONNX 10/100/1000, streaming/VRAM ve bağımsız kaynak sadakati (**HOLD**).

[İşlem 004-C kanıt belgesi](ISLEM_004C_CDN_METADATA_OPFS_RECOVERY.md)

## TİCARİ-003 — Gizlilik, KVKK ve modelin gerçek ağ kabulü

- [x] TİCARİ-003 veri sınıflandırması, izin matrisi, model indirme, session/OPFS ve tehdit modeli belgelendi.
- [x] SPA mesajlarından gereksiz URL alanı çıkarıldı; storage.local güvenilir uzantı bağlamlarına sınırlandırılacak biçimde başlatıldı.
- [x] Kabule ait JSON raporunda ağ ölçülmemişken kesin “dışarı gönderilmedi” iddiası kaldırıldı.
- [x] E-posta gövdesinin adres / kişisel veri içerebileceği kullanıcının gördüğü ekranda açıklandı.
- [ ] Gerçek Chrome/Edge Network, egress ve hassas içerik sızıntısı testi (HOLD).
- [ ] KVKK veri sorumlusu, hukuki sebep, aydınlatma ve ilgili kişi hakları uzman incelemesi (HOLD).
- [ ] Chrome Web Store ve Edge Add-ons veri kullanımı beyanlarının gerçek yayımlama paketiyle doğrulanması (HOLD).
- [ ] Hugging Face CDN/OPFS/Transformers.js gerçek Windows offline üretim kabulü (Issue #4 HOLD).

[İşlem 004-B tarayıcı model kabulü](ISLEM_004B_TARAYICI_MODEL_DOGRULAMA.md) · [TİCARİ-003 gizlilik sözleşmesi](TICARI_003_GIZLILIK_KVKK_GUVENLIK.md)

## TİCARİ-002 — Tarayıcı modeli depolama

- [x] OPFS yönetimi, indirme onayı ve sabit model kataloğu kodlandı.
- [x] Artımlı SHA-256, kota ve indirme reddi için sentetik Node testleri eklendi.
- [x] Ayarlar ekranından model silme / yeniden SHA kontrolü / iptal işlemleri bağlandı (kod).
- [ ] Hugging Face büyük modelin gerçek Chrome/Edge CDN/CORS/opsiyonel izin indirme kabulü (HOLD).
- [ ] OPFS dosyalarının gerçek tarayıcıda saklanması, silinmesi, evict ve yeniden açılma kabulü (HOLD).
- [ ] OPFS -> Transformers.js / ONNX Runtime adaptörünün gerçek Türkçe inference kabulü (HOLD).
- [ ] Upstream metadata SHA pinleme ve eksiksiz model kökeni (HOLD).

## Gerçek cihaz (henüz HOLD)

- [ ] Windows 11 Chrome stable panel açılışı.
- [ ] Windows 11 Edge stable panel açılışı ve tekrar açma.
- [ ] Makale seçimi ve yüzen balon yerleşimi.
- [ ] Gmail SPA rota değişikliği / kapsama doğruluğu (sentetik kod var, gerçek cihaz HOLD).
- [ ] Outlook farklı DOM varyantları (seçiciler sentetik doğrulandı, gerçek cihaz HOLD).
- [ ] YouTube manual/ASR/transkriptsiz vaka (transkriptsiz hata sentetik doğrulandı, gerçek video HOLD).
- [ ] 10/100/1000 kelime hedef sapması ölçümü.
- [ ] Native AI İngilizce ve yerel fallback doğru etiketleniyor.
- [ ] Model kurulduktan sonra sıfır üçüncü taraf AI ağ isteği kaydı (runtime denetlenmedi).
- [ ] Engelli site, worker sonlandırma, tab kapama, panel yeniden açma.
- [ ] Erişilebilirlik ve Windows kullanıcı kabulü.

**Genel durum:** `HOLD` — model gerçek inference ve Windows Chrome/Edge kabulü yapılmadı. Node sentetik testleri ürün/kalite kabulü olarak yorumlanmaz.
