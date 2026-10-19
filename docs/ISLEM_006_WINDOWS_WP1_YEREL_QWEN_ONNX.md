# İşlem 006 — Windows W-P1 Yerel Qwen ONNX Entegrasyonu

**Tarih:** 19 Ekim 2026
**Ana ürün:** OkuLens Windows masaüstü; Chrome/Edge uzantısı opsiyonel, ertelenmiş.
**Model:** onnx-community/Qwen3-0.6B-Instruct-ONNX; upstream commit 54250909aca286a05b9d013c8af7a21859ee6ead; Apache-2.0.
**Karar:** Kod ve sentetik CI adayı. Gerçek Windows ONNX/çevrimdışı Türkçe üretim ve ticari yayın HOLD.

## Neler kodlandı?

1. **desktop/model-store.mjs:** AppData klasörüne kullanıcının açık onayıyla 9 metadata + 1 ONNX dosyasını streaming indirir; tüm dosyaları upstream SHA-256 listesine göre doğrular. İndirme sürerken geçici klasör kullanılır ve yalnız tüm hashler doğruysa aktif manifest oluşturulur. Bozuk SHA, beklenmeyen yönlendirme hostu, eksik dosya ve iptal hata üretir; kurulum tamamlanmış gibi gösterilmez.
2. **desktop/main.cjs:** Yerel model ve paket içi Transformers.js/WASM dosyalarını sınırlı Electron özel protokolüyle açar. Renderer ve Worker için dış ağ engeli korunur; indirme Electron ana süreçte yalnız açık izinle yapılır. Model yönetimi IPC izinli ana pencereyle sınırlandırılır.
3. **desktop/model-worker.mjs:** @huggingface/transformers v3.8.1 üzerinden Qwen3 text-generation modelini paketli runtime ve Windows AppData modeliyle WebGPU q4f16 / WASM q4 olarak yüklemeyi ve gerçek token üretimini dener.
4. **desktop/onnx-client.mjs:** Her üretim için Worker açar; canlı aşama/akış bildirir ve iptalde Worker'ı sonlandırır. Gerçek model başarısız olursa TextRank'i ONNX diye göstermez.
5. **Windows arayüzü:** Mevcut TextRank motoru daima kalır; Qwen ONNX seçimi, açık indirme onayı, SHA denetimi, silme, iptal ve 10/100/1000 üretim alanları eklenmiştir.
6. **Windows CI:** Paketli runtime/WASM üretimi ile geliştirme ve portable EXE smoke testleri. Bu test gerçek ONNX ağırlığı indirmez, model inference onaylamaz.

## Güvenlik ve sınırlar

- Kişisel makale/e-posta metni model indirme isteğine veya API'ye gönderilmez.
- Model dosyası kullanıcı klasöründe saklanır, programın taşınabilir paketine gömülmez.
- SHA-256 sabit upstream listesi, indirme sırasında doğrulanır. Sonradan bozulma ayrıca kullanıcı tarafından SHA doğrula ile denetlenir.
- Uygulama sunucu hesabı, API anahtarı veya bulut LLM gerektirmez.
- Electron renderer sandbox ve IPC gönderen çerçeve kontrolü korunur.
- Paketli JS/WASM'ın varlığı, gerçek Windows ONNX pipeline veya sıfır ağ trafiği kanıtı değildir.
- Windows GPU/VRAM, CPU/WASM, Türkçe model kalitesi, kaynak sadakati, streaming ve fiziksel kullanıcı kabulü henüz HOLD.

**Git dalı uyarısı:** PR #18 ana dala birleştirilene kadar aşağıdaki main komutları W-P1 kodunu içermez. PR taslak inceleme aşamasındadır; gerçek Windows için önce CI kontrolleri ve güvenli birleştirme gereklidir.

## Windows PowerShell — tek blok

OkuLens klasörü HOME altında değilse ilk satırı düzenle. Git ve Node.js 22.12+ kurulu olmalı.

~~~powershell
$ErrorActionPreference = "Stop"
$repo = Join-Path $HOME "OkuLens"
if (-not (Test-Path (Join-Path $repo ".git"))) {
  if (Test-Path $repo) { throw "OkuLens klasoru var ama Git deposu degil." }
  git clone https://github.com/seydivakkas/OkuLens.git $repo
  if ($LASTEXITCODE -ne 0) { throw "Git klon hatasi" }
}
Set-Location $repo
if (git status --porcelain) {
  git status --short
  throw "Yerel degisiklikler korunuyor; guncelleme durduruldu."
}
git switch main
if ($LASTEXITCODE -ne 0) { throw "Git main hatasi" }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw "Git guncelleme hatasi" }
npm.cmd install
if ($LASTEXITCODE -ne 0) { throw "npm install hatasi" }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Kod kontrol hatasi" }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Test hatasi" }
npm.cmd run build:runtime
if ($LASTEXITCODE -ne 0) { throw "ONNX Runtime paket hatasi" }
npm.cmd run desktop:start
~~~

Uygulama penceresinde önce TextRank çalıştır. Sonra WebGPU q4f16 seç ve indirme lisans/onay kutusunu okuyup işaretle. Kullanıcı isteğiyle **Modeli indir**, ardından **SHA-256 doğrula**, motoru **Qwen/ONNX** seç ve sentetik Türkçe bir metinle 10 kelime üretmeyi dene. İlk başarılı sonuçtan sonra bağlantıyı kes, uygulamayı yeniden açıp 10/100/1000 hedeflerini tekrar dene. Donanım ve kaynak sadakati ayrı kabul aşamalarıdır.

## Kabul matrisi

| Kapı | Durum |
| --- | --- |
| Windows P0 TextRank GUI / EXE | Önceki CI PASS |
| W-P1 model depolama, SHA, IPC, Worker | Kod + sentetik CI |
| Windows paketli Transformers.js/WASM | CI testine bağlı |
| Gerçek Windows GPU ve WASM Qwen token üretimi | HOLD |
| Ağ kesikken Türkçe 10/100/1000, streaming, RAM/VRAM | HOLD |
| Kaynak sadakati, imzalı installer ve ticari yayın | HOLD |

**Son karar: WINDOWS_WP1_KOD_CI_ADAY / GERCEK_ONNX_KABUL_HOLD / TICARI_YAYIN_HOLD.** MIT ve Free/Pro/Business ürün stratejisi korunur. Issue #4'ün tarayıcı/OPFS kabulü ayrı OPEN/HOLD kalır.
