# İşlem 004-A — Gerçek Türkçe model kabul ve kanıt protokolü

**Ana Issue:** https://github.com/seydivakkas/OkuLens/issues/4
**Durum:** Model gerçek cihazda denenmedikçe `HOLD`; birim ve paketleme CI başarıları ürün kabulü değildir.

## Ayrı kanıt sınıfları

| Kontrol | Kabul kanıtı | Kaçınılması gereken yanlış iddia |
| --- | --- | --- |
| Model kimliği, lisans ve SHA-256 | `npm run model:verify` çıktısı + `models/model-manifest.json` + kaynak revizyonu | Manifest tek başına dosyanın gerçekten kontrol edildiğini kanıtlamaz |
| Üretim | Gerçek ONNX inference, üretilmiş Türkçe JSON çıktı, kullanılan backend, donanım | Mock runner veya TextRank çıktısı gerçek ONNX sayılmaz |
| Streaming / iptal | İlk görünür akış olayı, akış sayısı, son metin ve yeniden başlatma | Son sonucu tek parça gösterme streaming kanıtı değildir |
| Performans | İlk akış süresi, toplam süre, JS heap, bağımsız RAM/VRAM ölçümü | JS heap == sistem RAM veya GPU VRAM değildir |
| Kaynak sadakati | İddia bazlı bağımsız inceleme ve kaynak pasaj kontrolü | C001/C002 bölüm kimliği gerçek atıf veya iddia kanıtı değildir |

## Aşama 004-A1 — Yerel kurulum

Proje kökünde Windows PowerShell:

```powershell
node --version
npm install
npm run build:runtime
npm run model:install -- --accept-license --backend=webgpu
npm run model:verify
```

WebGPU cihaz desteği yoksa yalnızca bilinçli kullanıcı kararıyla `npm run model:install -- --accept-license --backend=wasm` ve ardından `model:verify` kullanılmalı. İndirmeler ilk kez internet gerektirir; inference sırasında uzak API veya model indirme yapılmaması gerekir. Kurulum **kullanıcı onayı olmadan başlatılmamalıdır**.

İndirilen model kimliği: `onnx-community/Qwen3-0.6B-Instruct-ONNX`, kaynak revizyonu: `54250909aca286a05b9d013c8af7a21859ee6ead`. WebGPU q4f16 SHA256: `4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d`. WASM q4 SHA256: `a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d`. Sağlayıcı kaynağı: https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX/tree/54250909aca286a05b9d013c8af7a21859ee6ead .

## Aşama 004-A2 — Windows Chrome / Edge

1. `chrome://extensions` veya `edge://extensions` sayfasında geliştirici modunu açın ve projeyi **Paketlenmemiş öğe yükle** ile yükleyin.
2. Uzantının **Ayarlar** sayfasından `Gerçek Model Kabul Laboratuvarı` bağlantısını açın. Kabul sayfası: `studio/acceptance.html`.
3. 10, 100, 1000 kelime, Kolay Türkçe ve kaynak içi sahte komut vakalarının **her birini ayrı ayrı** çalıştırın. 1000 kelimelik vaka çok parçalıdır; donanıma göre uzun sürebilir. Yarım kalan vakaya PASS yazmayın.
4. Aynı vakaları Chrome ve Edge üzerinde ayrı oturumda deneyin; WebGPU ve varsa WASM sonucunu ayrı raporlayın.
5. Her vakada `JSON kanıt raporunu indir` eylemi ile çıktıyı ve telemetriyi saklayın. Raporda `decision: HOLD` yazılması bilinçlidir. Gizli e-posta veya kişisel belge kullanmayın.

### Beklenen kayıt alanları

`caseId`, `actualWords`, `targetWords`, `deviationWords`, `model.id`, `model.revision`, `model.backend`, `streamEvents`, `firstTokenMs`, `elapsedMs`, `memory.kind`, `memory.peakHeapBytes`, `fidelityPreflight`, `humanReview`, `error` ve `decision`.

Bu raporlama göreceli süre ve JS heap örnekleri içindir. Harici GPU ölçümü *otomatik alınmıyor*.

## Aşama 004-A3 — Bellek ölçümü

NVIDIA GPU varsa Windows terminalinde tarayıcıyı açmadan önce ve model aktifken VRAM değişimini ayrı kaydedin:

```powershell
nvidia-smi --query-gpu=timestamp,memory.used,utilization.gpu --format=csv -l 1
```

İlk model yükleme (cold) ile kurulu modelin aynı oturumdaki sonraki üretimini (warm) ayrı ölçün. Chrome ve Edge görev yöneticilerindeki toplam bellek ölçümleri süreç bazlıdır; uzantıdaki modelin münhasır bellek tüketimi kabul edilemez. `performance.memory.usedJSHeapSize` yalnızca desteklenen Chromium sürümlerinde JS heap tahminidir; VRAM değildir. GPU yoksa VRAM hücresi `NOT_MEASURED` olarak kalmalıdır.

## Aşama 004-A4 — Türkçe doğruluk / kaynak kontrolü

Aynı kaynakta, tercihen iki bağımsız değerlendirici:
- Türkçenin anlaşılırlığı ve Kolay/Orta/Zor ayrımı,
- 10/100/1000 hedefinden sapma (kesin kelime eşitliği beklenmez),
- Kaynakta bulunmayan kişi, sayı, tarih, nedensellik ve sonuç iddiaları,
- İlgili her iddianın özgün kaynak paragrafıyla eşleştirilmesi,
- Kaynak içi sahte komutun yanıtı saptırıp saptırmadığı,
- Uzun 1000 kelimelik çıktıda önemli bölümlerin temsil edilip edilmediği

ayrı ayrı gözden geçirilmelidir. Otomatik `numbersMissingFromSource` kontrolü *uyarıdır*, iddia doğrulama motoru değildir. Her iddia için kaynak konumunun gerçekten gösterildiği garanti değildir. Belirsiz bir iddia PASS olarak kaydedilemez.

## Aşama 004-A5 — Streaming / iptal / ağ

- Streaming testi: İlk akış olayı sayısı ve süresi sıfırdan büyük olmalıdır; gerçek token sınırları ile `TextStreamer` callback sınırları aynı kabul edilmez.
- İptal testi: Uzun vaka çalışırken `İptal et` düğmesine tıklayıp yeni model isteğini deneyin. Worker'ın sonlandırılması sentetik olarak testli, fakat gerçek GPU kaynak serbest bırakma henüz kanıtlanmadı.
- Çevrimdışı testi: Kullanıcı onaylı kurulum bittikten sonra ağ bağlantısını kesin, Chrome/Edge DevTools Network günlüğünde model üretimi sırasında harici model/LLM istekleri olmadığını doğrulayın. Kullanıcının yüklediği web sayfasının kendi ağ istekleri ayrı sınıftır.
- Güç/bellek baskısı: donanım eşiğinde açık hata ve **TextRank fallback**; kullanıcıya üretken AI çalışmış gibi etiket verilmemeli.

## Ön kabul matrisi

| Kapı | Durum |
| --- | --- |
| Saf planlayıcı, rapor biçimi ve sentetik test | CI sonucuna göre PASS veya FAIL |
| Gerçek SHA256 ve model runtime kurulumu | HOLD |
| Gerçek Türkçe ONNX metin üretimi | HOLD |
| 10 / 100 / 1000 ve seviyeler | HOLD |
| İlk akış, iptal, yeniden başlatma | HOLD |
| Sistem RAM ve GPU VRAM ölçümü | HOLD |
| Chrome ve Edge Windows 10/11 gerçek sonuçları | HOLD |
| Kaynak sadakati ve bağımsız inceleme | HOLD |

**Kapanış kuralı:** Bütün zorunlu kapılar kaynaklı biçimde PASS olmadan [Issue #4](https://github.com/seydivakkas/OkuLens/issues/4) kapatılmaz. Bir cihazda başarılı çıkarım olması, diğer cihazları veya üretim doğruluğunu otomatik doğrulamaz.
