# OkuLens — Ticari Kullanım ve Bağımlılık Kabul Politikası

**Sözleşme:** `COMMERCIAL-COMPATIBILITY-V1`  
**Yürürlük:** 18 Ekim 2026 itibarıyla yeni geliştirmelerde  
**Hedef:** Sonradan ücretli lisans, kurumsal dağıtım veya ticari mağaza sürümüne geçişte yeniden yazma ihtiyacını azaltmak.

> Bu doküman mühendislik lisans politikasıdır; bütün yargı alanlarında ticari uygunluk garantisi veya hukuki görüş değildir. Nihai satış, sözleşme, tescil ve dağıtım için hukuk incelemesi gerekir.

## 1. Kesin geliştirme kararları

- Windows 10/11 + Chrome/Edge Manifest V3 hedef platformları korunur.
- Ücretli/bulut LLM API'si, zorunlu hesap, gizli telemetri, abonelik gerektiren servis, kullanıcı API anahtarı ve zorunlu üçüncü taraf sunucu **yasak**.
- Yeni bileşen ticari kullanım, değişiklik ve **yeniden dağıtım** hakları kaynakla doğrulanmadan ürüne alınmaz.
- Tercih edilen kod lisansları: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD ve OSI onaylı BlueOak-1.0.0. CC0-1.0, Unlicense, Unicode-3.0 veya Zlib kullanım/kapsamına göre incelemeyle kabul edilebilir.
- GPL, AGPL, LGPL, SSPL, BSL/BUSL, Elastic License, Commons Clause, PolyForm, yalnızca araştırma/eğitim ve NonCommercial gibi ifadeler içeren bağımlılıklar **otomatik onaylanmaz**. Özellikle LGPL dinamik/statik bağlama yükümlülükleri hukuk incelemesi gerektirir. Kodda “free” yazması lisans değildir.
- `scripts/ticari-lisans-denetimi.mjs` npm ağacını ve esbuild'in gerçek `vendor/runtime-inputs.json` derleme girdilerini ayrı sınıflandırır. Geliştirmede HOLD bulguları raporlanıp CI sürdürülebilir; `--release` seçeneği sıkı engelleyici kapıdır. Bu sınıflandırma tek başına ticari lisans onayı değildir.
- Fiyatlandırma özgürlüğü ile telif mülkiyeti ayrıdır: ürünün kendi MIT lisansı ticari satışa izin verir ama yayımlanmış sürümlerin MIT haklarını geri almaz. Proprietary/dual-licensing kararı hak sahipleri ve geçmiş katkılar incelenmeden sessizce uygulanamaz.

## 2. Mevcut bileşen envanteri

| Parça | Kaynak/sürüm | Lisans ve değerlendirme | Ücretli dağıtım için yapılacak |
| --- | --- | --- | --- |
| OkuLens özel JS/HTML/CSS | `LICENSE` | MIT; kendi katkı sahipliği ayrı doğrulanmalı | Telif bildirimi korunur; gelecekte hak sahipliği/katkıcı izinleri incelenir |
| Mozilla Readability | 0.6.0 | Apache-2.0 | LICENSE ve NOTICE dağıtımda; varsa değişiklik bildirimleri |
| Transformers.js | 3.8.1 | Apache-2.0 | Uygulamada paketli JS ve varsa upstream NOTICE/lisans metinlerini dahil et |
| ONNX Runtime Web | Transformers.js bağımlılık ağacındaki sürüm | MIT | Paketli WASM/JS için doğru paket/lisans bildirimi |
| esbuild | 0.25.12 | MIT | Build-only; binary dağıtılıyorsa ek izin/bildirim ayrıca kontrol |
| Qwen3-0.6B-Instruct-ONNX | `onnx-community/Qwen3-0.6B-Instruct-ONNX`, rev. `54250909aca286a05b9d013c8af7a21859ee6ead` | Apache-2.0 model kartı; model köken zinciri Apache-2.0 görünüyor | Model kartı + upstream atıf zinciri + dosya hashleri + yeniden dağıtım şartları ayrıca kontrol |
| Platform DOM çıkarıcıları | Gmail/Outlook/YouTube | OkuLens kodu MIT olsa da üçüncü taraf **platform şartları ve telif** ayrıca geçerlidir | Erişim şekli, gizlilik, kullanıcı izni, mağaza politika incelemesi |

Model köken zinciri (ayrı ayrı kaynak kontrolü): `Qwen/Qwen3-0.6B` → `minpeter/Qwen3-0.6B-Instruct` → `onnx-community/Qwen3-0.6B-Instruct-ONNX`. Her model kartı Apache-2.0 gösterir; bu beyan modelin gerçek Türkçe performansını veya yeniden dağıtılan her veri/dosyanın hak sahipliğini tek başına garanti etmez.

## 3. Her yeni kütüphane/model için zorunlu inceleme

1. **Kaynak kimliği:** Upstream repo/kurum, gerçek sürüm etiketi veya sabit commit, yayınlayan ve alternatif çatal.
2. **Lisans:** İlgili sürümün özgün `LICENSE`, `NOTICE`, varsa model kartı, patent ve trademark koşulları.
3. **Haklar:** Kullanım, değişiklik, ücretli satış, paketleme/yeniden dağıtım, alt lisans, model ağırlığı sağlama ve özel türev ürün koşulları.
4. **Dahil etme:** Dağıtıma giren kod/WASM/ONNX dosyaları ve transient/bundled bağımlılıklar için SPDX/SBOM ve tam gerekli lisans bildirimleri.
5. **Teknik risk:** Aktif bakım, bilinen güvenlik açıkları, bağımlılık tedarik zinciri, SHA-256, platform runtime sınırları.
6. **Veri işleme:** Gizli kaynak, kullanıcı mesajları, URL ve yerel depolama; ağ erişimi, telemetry veya cloud erişiminin olup olmadığı.
7. **Kanıt:** İncelemeci, tarih, kaynak bağlantıları, gerçek kurulum/CI çıktısı, `PASS/PARTIAL/HOLD/FAIL`.
8. **Onay:** Ticari dağıtım kapısı ayrı; sentetik test PASS'ı hukuk PASS'ı değildir.

## 4. Chrome/Edge yayımlama ve KVKK/GDPR kontrolü

OkuLens Gmail/Outlook yazışma içeriği, açık web sayfası metni, URL ve YouTube altyazısıyla çalışır. Chrome Web Store kişisel ileti/website content gibi verileri hassas kullanıcı verisi kapsamına alır: **yerel işlem olsa dahi açık ve güncel gizlilik politikası ve gerekli mağaza beyanları zorunludur.** Kullanıcıya tam amaç, verinin kaynağı, geçici bellek, dışa aktarma, silme işlemi ve sınırlamalar açıklanır.

Aşağıdakiler tamamlanmadan ticari yayın yapılmaz:
- Ürün mağaza kimliği, yayıncı bilgisi, destek/iletişim ve nihai gizlilik politikası URL'si.
- Chrome Web Store veri kullanımı/beyanları ile kod davranışının eşleştirilmesi; minimum `activeTab` izni korunması.
- Gmail/Outlook/YouTube erişimi için güncel hizmet şartları ve gerekiyorsa platform yazılı izin/kısıtlama incelemesi. Metne erişebilmek yeniden dağıtım veya ticari veri satışı hakkı vermez.
- Avrupa kullanıcıları için gerekirse GDPR; Türkiye için KVKK ve veri sorumlusu/işleyen rolünün uzman incelemesi. Bu dosya mevzuat uygunluğu görüşü değildir.
- Runtime `Network` denetimi ve model ilk indirme ile çevrimdışı üretim aşamalarının ayrı gösterilmesi.
- Ürün adı/marka tescili ve tasarım/telif sahipliği araştırması; marka adının henüz kontrol edildiği veya tescilli olduğu iddia edilmez.
- Ticari sürüm için `package-lock.json` dosyasının Git deposunda sürümlenmesi ve `npm ci` ile tekrarlanabilir paketlenmesi. Şu anda sürümlenmiş lockfile yoktur; sıkı yayın kontrolü bunu engeller.
- Kullanıcının açık istemi olmadan e-posta/metin çekmeme; otomatik veri gönderme yok; yerel silme kontrollerinin çalışması.

## 5. Paketleme kapısı

Geliştirme:
```powershell
npm install
npm run check
npm test
npm run commercial:check
```

Dağıtım öncesi:
```powershell
npm run build:runtime
npm run commercial:notices
npm run commercial:release-check
```

Sonuçlar `build/ticari-uygunluk/` altındaki envanter ve uyarılarda saklanır. Bu klasör `gitignore` kapsamındadır; kullanıcı verisi veya model ağırlığı GitHub'a gönderilmez. Dış hukuk/marka/gizlilik/model kabul kapılarının raporu **manuel** kapatılır.

## 6. Kesin ticari sürüm durumu

| Kapı | Güncel durum |
| --- | --- |
| Temel bağımlılıkların ilk lisans sınıflandırması | PARTIAL |
| Otomatik npm lisans envanteri ve sürüm kanıtı | Kod/CI |
| Dağıtım paketine lisans bildirimlerinin eklenmesi | Kod/CI, gerçek artefakt kabulü HOLD |
| Qwen model dosyası SHA ve dağıtım telif incelemesi | HOLD |
| Mağaza gizlilik politikası ve yayıncı bilgisi | HOLD |
| Gmail/Outlook/YouTube hizmet şartları ve veri hakları | HOLD |
| Üretken model Windows Chrome/Edge nihai kabulü | HOLD |
| Ticari sürüm yayımlama | **HOLD** |

## Kaynaklar

- https://choosealicense.com/licenses/mit/
- https://www.apache.org/licenses/LICENSE-2.0
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- https://huggingface.co/Qwen/Qwen3-0.6B
- https://huggingface.co/minpeter/Qwen3-0.6B-Instruct
- https://huggingface.co/onnx-community/Qwen3-0.6B-Instruct-ONNX


### 18 Ekim 2026 — CI lisans ön taraması

Gerçek browser bundle girdilerini ayıran CI çalışmasında **56 kurulu npm paketi**, **5 paket-ağacı inceleme kaydı** ve **54 üçüncü taraf bildirim dosyası** raporlandı. Tarayıcıya dağıtılan JS/WASM bileşenlerinde bilinen eksik lisans metni bu taramada **0**; rapor durumu `READY_FOR_LEGAL_REVIEW` **yalnızca derleme lisansı ön incelemesi** anlamına gelir. LGPL lisanslı `@img/sharp-libvips-linux-x64` kurulu ağaçta bulunur ancak mevcut esbuild tarayıcı girdilerine dahil görünmüyor. Bu durum, son paket ve dinamik yükleme incelemesi olmadan mutlak yokluk garantisi değildir.

Ticari satış kararı halen `HOLD`: sürüm kontrolünde lockfile, gerçek model ve tarayıcı testi, platform şartları, gizlilik/marka/yayıncı bilgileri ve hukuk incelemesi tamamlanmadı.
