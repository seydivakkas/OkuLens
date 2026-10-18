# İşlem 002 — Mozilla Readability ve güvenli makale çıkarımı

**Konu:** [Issue #2](https://github.com/seydivakkas/OkuLens/issues/2)
**Durum:** Kod ve sentetik doğrulama tamamlandı; gerçek Windows Chrome/Edge kabulü HOLD.

## Çalışma şekli

Makale çıkarımı yalnızca kullanıcının paneldeki Kaynağı al/Özetle eylemiyle başlar. activeTab ve scripting izinleri korunur; geniş host_permissions veya all_urls eklenmez.

Makale sayfalarında üç dosya sıralı yüklenir:
1. vendor/readability/Readability.js (Mozilla Readability 0.6.0, paketli)
2. content/article-extractor.js (klon DOM ayrıştırıcı)
3. content/injected.js (mevcut mesaj köprüsü)

E-posta ve YouTube çıkarıcıları Readability dosyasını yüklemez.

Readability.parse() yalnızca document.cloneNode(true) ile oluşturulan belge kopyasında çalışır. Ayrıştırılan HTML sayfaya veya panele doğrudan eklenmez; yalnızca düz metin, başlık hiyerarşisi, yazar ve yayın tarihi gibi metaveriler taşınır. Panel bunları güvenli textContent üzerinden gösterir.

## Hata yönetimi

Readability boş veya hata döndürürse sırasıyla article, main, role=main ve son olarak body kopyasında navigasyon/reklam/gereksiz öğeler temizlenerek fallback denenir. Bu sonuç status: partial ve ARTICLE_FALLBACK_USED ile etiketlenir.

En az 160 karakter ve 30 sözcüklük makale içeriği bulunmazsa status: unavailable, boş text ve ARTICLE_UNREADABLE döner; tahmin veya uydurma metin kullanılmaz.

35.000'den fazla öğede Readability tam belge klonu atlanır; 250.000 karakter aşılırsa ARTICLE_TRUNCATED uyarısı eklenir.

## Doğrulama

npm run check ve npm test sentetik kontrolleri kapsar. Canlı siteler, gerçek Windows Chrome/Edge, kaynak DOM mutasyon testi, SPA yaşam döngüsü, bellek ve kullanıcı kabulü sonraki aşamada ayrıca ölçülür.

## Lisans

Mozilla Readability 0.6.0: https://github.com/mozilla/readability/tree/0.6.0

Kaynak lisansı Apache-2.0; vendor/readability/LICENSE.md ile vendor/readability/NOTICE dosyaları eklenmiştir.
