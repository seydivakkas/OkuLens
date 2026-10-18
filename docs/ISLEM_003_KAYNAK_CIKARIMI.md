# İşlem 003 — Gmail, Outlook, YouTube ve SPA kaynak çıkarımı

**Bağlantı:** https://github.com/seydivakkas/OkuLens/issues/3
**Durum:** Uygulama ve sentetik kontrol; gerçek Windows Chrome/Edge kabulü HOLD.

## Gizlilik ve kullanıcı kararı

Gmail/Outlook mesajları, kullanıcı açıkça "Kaynağı al" veya "Özetle" eylemine bastığında aktif sekmedeki görünür DOM'dan alınır. Uzantı, uzak Gmail/Outlook API'lerine veya LLM servisine bağlanmaz. Alıcı/gönderen **meta alanları**, ekler ve kapalı mesajlar kasıtlı olarak çıkarılmaz. Gövde metninin içinde bir e-posta adresi geçiyorsa bu hâlâ gövde metninin parçasıdır; otomatik anonimleştirme yapılmaz. E-posta özetleri sekme oturum önbelleğine kaydedilmez; yan panelin geçici belleği kullanılır.

Kapsam seçimi:
- **Son görünür ileti:** Varsayılan, seçicilerin döndürdüğü son görünür ileti gövdesi. Gmail ve Outlook için "aktif ileti" iddiası DEĞİLDİR; sezgisel sonuç olduğu konusunda uyarı döner.
- **Görünür konuşma:** Açılmış ve DOM'da görülen gövdeler kronolojik DOM sırasıyla. Gizli/daraltılmış iletiler ve ekler kapsam dışındadır.

Kapsam sonucu, messageCount ve scopeLabel ile birlikte açıkça gösterilir. Bulunamayan gövdeye otomatik düz yazı yerleştirilmez; EMAIL_BODY_UNAVAILABLE uyarısı döner.

## YouTube

Çıkarım yalnızca kullanıcı tarafından açılmış transkript panelindeki segmentlerden yapılır. Platformun dahili Innertube/timedtext API'leri kullanılmaz; imzalı altyazı URL'si çözümlenmez, Video Data API anahtarı kullanılmaz. Her segmentin açık MM:SS veya HH:MM:SS damgası doğrulanır; parse edilemeyen veya boş metinli segment sessizce sahte timestamp ile doldurulmaz. Kapsam ses çözümleme (STT), altyazısız video veya kapalı transkript değildir.

Video URL'sinden 11 karakterlik video kimliği (watch ve shorts) çıkarılır. Segmente tıklanırken video kimliği mevcut oynatıcıyla yeniden karşılaştırılır; video değişmişse VIDEO_CHANGED döner. Bu sayede eski videonun saniyelerine yanlışlıkla atlama engellenir.

Hata kodları: TRANSCRIPT_UNAVAILABLE, TRANSCRIPT_PANEL_CLOSED_OR_CAPTIONS_UNAVAILABLE, TRANSCRIPT_TIMESTAMPS_OR_TEXT_UNREADABLE, TRANSCRIPT_SKIPPED_MALFORMED_SEGMENTS, TRANSCRIPT_TRUNCATED, YOUTUBE_VIDEO_ID_MISSING.

## SPA yaşam döngüsü

spa-monitor.js URL değişimlerini popstate, hashchange, yt-navigate-finish ve debounced MutationObserver üzerinden algılar; Gmail/Outlook görünür gövde değişikliğinin hafif parmak izini de izler. Tam mesaj metni bildirimlerde iletilmez. Yalnızca değişiklik tipi ve sayfa URL'si uzantının yan paneline ulaşır. pagehide olayında dinleyiciler kaldırılır ve observer.disconnect çağrılır. Yan panel, URL değişiminde veya kaynaktan gelen değişiklik mesajında sekme önbelleğini siler ve eski özetin geçerli kaynak gibi gösterilmesini engeller.

## Güvenlik sınırları ve kapsam dışı

- Chrome MV3 activeTab + scripting korunur; genel host izni talep edilmez. Daha önce verilmiş activeTab erişimi kaybolduysa kullanıcı uzantı araç çubuğu simgesinden yeniden başlatmalıdır. Yan panel içindeki düğmeler yeni activeTab izni VERMEZ.
- Kaynak metin uzantı arayüzünde textContent olarak gösterilir; üçüncü taraf HTML çalıştırılmaz.
- Özel DOM seçicileri hizmetler tarafından değiştirilebilir. Panelin "partial" durumunu başarı garantisi olarak yorumlamayın.
- YouTube kapalı transkript otomatik açılmaz. Gerekli izinler/platform koşulları aşılmaz.
- Çok uzun kaynaklarda sınırlama/kesme (200 bin karakter e-posta, 250 bin karakter ve 5000 segment YouTube) bilgilendirilir.
- Gerçek Gmail/Outlook/YouTube oturumu, çoklu mesaj doğruluğu, gizlilik ve SPA değişikliği kabulü sonraki son aşamadadır.

## Kontroller

npm run check
npm test

Mevcut makale ve temel NLP testlerine ek olarak kaynak çıkarıcıları için ayrı sentetik testler bulunur.
