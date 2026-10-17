# OkuLens — AI;DR Referans Arayüzünden Hibrit Ürüne Geçiş

## Kaynak ve tasarım kararı

Başvuru: `ai_dr_chrome_edge_manifest_v3_uzant_st_dyosu_canl_nlp_sim_lat_r.html` adlı kullanıcı HTML örneği (v1.1). Bu dosya bir **tasarım ve algoritma referansıdır**; uzantıya aynen kopyalanmamıştır. HTML, Tailwind CDN, Google Fonts ve sayfa içi inline script taşır. Bunları Manifest V3 uzantısına aynen almak, uzak kod ve CSP/paketleme gereksinimleriyle uyumsuzluk riski doğurur. Ayrı yerel CSS/JS modülleriyle yeniden üretildi.

## Referanstan aktarılan görünüm ve davranışlar

| Referans | OkuLens uygulaması | Kapsam |
|---|---|---|
| Koyu lacivert, gök mavisi/indigo kimlik | `panel/panel.css`, `studio/studio.css` | Uygulandı |
| Hibrit yüzen seçim balonu + native yan panel | `content/injected.js`, `panel/*` | Mevcut etkin-sekme kapsamında; yeni sitelerde sürekli çalışması için izin/onboarding geliştirilecek |
| 10 / 100 / 1000 kelime bütçesi | Panel düğmeleri + Studio önizleme | Uygulandı; hedef üst sınır, tam kelime garantisi değil |
| Kolay / Orta / Zor | Seçim düğmeleri | UI uygulandı, extractive motor üslup değiştirmez |
| Makale / E-posta / YouTube senaryoları | Studio örnek veriler ve içerik betiği | Studio tamam; canlı çıkarıcılar deneysel |
| TF-IDF anahtar kavramları | `shared/hybrid-nlp.mjs` | Uygulandı; model güveni olarak sunulmaz |
| TextRank cümle grafı | Bölüm bazlı PageRank + 5 üst cümle | Uygulandı; normalize edilmiş açıklayıcı puanlar |
| Sıkıştırma/okuma kazancı/işlem süresi | Panel ve Studio panoları | Yerel girdiye dayalı yaklaşık göstergeler |
| NLP graf incelemesi | Studio `NLP Graf Analizi` sekmesi | Uygulandı |
| Kaynak kodları / kurulum | Studio `Mimari & Kurulum` + README | Mimari ve kurulum var; HTML içi kod kopyalama kaldırıldı |
| Üretken yerel AI | Chrome Summarizer uygunluk kontrolü | İngilizce ve donanım uygunluğu olan sınırlı senaryolar |
| Çok dilli yerel ONNX mini model | Model adaptörü / dağıtım işi | PLAN, uygulanmış değil |
| YouTube imzalı caption çözümleme | DOM transkript fallback | İmzalı URL çözümleme henüz uygulanmadı |

## Kritik dürüstlük ve güvenlik sınırları

1. Kaynak HTML'de algoritma tabanlı **topic detection** ve `%confidence` vardı; bu yüzdeler istatistiksel olarak kalibre edilmiş model güveni değildir. Yeni üründe zorunlu ayrı topic-detection modülü yoktur.
2. Kaynak HTML'de şablonla üretilen `metodolojik çıkarım`, gerçek içerik kanıtı olmaksızın uzman yorumuna dönüşüyordu. Üretim sisteminde yeni sonuç uyduran şablonlar kaldırılmıştır.
3. Mini Transformer veya WebGPU/ONNX indirildiği/çalıştığı iddia edilmez. `shared/native-ai.mjs` desteklenen İngilizce koşullarda yerleşik API'yi kullanabilir; diğer durumlarda açık biçimde `hybrid-extractive` görünür.
4. Çıkarımsal 10 kelimelik özet, kesilen cümle olabilir. Kaliteli üretken sentez değildir.
5. Service worker kalıcı durum yuvası değildir. `chrome.storage.session` ve `chrome.storage.local` kullanılır; büyük kaynak metinleri otomatik kalıcı depoya alınmaz.
6. Native Side Panel uzantı kökeninde izoledir; seçili metin balonu ise sayfaya eklenen Shadow DOM içinde kısmen izoledir. Host sayfa/sayfa izinleri eksiksiz izolasyon garantisi değildir.
7. Studio yerel örnek metin kullanır; gerçek Chrome/Edge ve Gmail/YouTube uçtan uca kabulü ayrı aşamadır.

## Önerilen sonraki teslim sırası

- **P2:** Readability'nin lisansı ile proje içine paketlenmesi, `activeTab` ve gerekli dinamik izinlerle makale çıkarımı.
- **P3:** Gmail/Outlook aktif zincir seçimi, gözetleyici yaşam döngüsü ve izin/gizlilik sınırları.
- **P4:** YouTube caption erişimi, dil seçimi ve zaman damgalarının gerçek doğrulaması.
- **P5:** İndirilebilir/çevrimdışı çok dilli ONNX modeli, model hash ve RAM/VRAM ölçümü; üretken Türkçe destek kanıtı.
- **P6:** Gerçek streaming/iptal, map-reduce, kaynak pasaj bağlantıları ve kalite kıyaslaması.
- **P7:** Windows Chrome/Edge cihaz kabulü ve yükleme izinleri denetimi (son aşama).
