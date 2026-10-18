# TİCARİ-001 — OkuLens Ürün ve Lisans Stratejisi

**Mühendislik karar kimliği:** COMMERCIAL-PRODUCT-BOUNDARY-V1  
**Tarih:** 18 Ekim 2026  
**Kapsam:** Kod sahipliği, mevcut MIT hakları, Free/Pro/Business sürüm sınırları, yeni kapalı kaynak modüller, dağıtım politikası.  
**Durum:** Teknik ürün mimarisi önerisi oluşturuldu; telif hak zinciri, marka, EULA, satış ve hukuk onayı **HOLD**.

> Bu doküman ileride ticari ürün geliştirilebilmesi için teknik ve yönetsel gereksinim sözleşmesidir. Hukuki görüş, telif devri, yeni yazılım lisansı, fiyat taahhüdü veya piyasaya sürme izni değildir. Bu aşamada mevcut LICENSE dosyası, kamuya yayımlanmış MIT sürümleri ve üçüncü kişilerin kazanılmış lisans hakları değiştirilmez.

## 1. Ticari vizyon ve ayrışma

OkuLens, Windows 10/11 öncelikli Chrome ve Edge Manifest V3 uzantısı olarak okunabilir web sayfalarını, kullanıcı isteğiyle açık mesajları ve video transkriptlerini yerel-öncelikli şekilde özetler. Başlıca hedef; Türkçe kullanımı, müşteri bilgisayarında çalışmayı, kaynakla ilişkilendirilebilir sonucu ve kullanıcı kontrolünü bir arada sunmaktır.

- **Free:** Açık çekirdek ve temel deneyim; ücretsiz.
- **Pro:** Yeni geliştirilmiş ek iş akışları ve özellikler; tek seferlik ücretli kullanıcı lisansı **hipotezi**.
- **Business:** Şirket içi kullanım, özelleştirme, çevrimdışı lisanslama, kurulum ve destek; kurum veya cihaz bazlı lisans/hizmet sözleşmesi **hipotezi**.

Üretken AI, WebGPU/WASM ve kaynak sadakati bugün ticari olarak doğrulanmış değildir. Issue #4 açık/HOLD kalır. “Hiçbir veri hiçbir zaman dışarı çıkmaz”, “kesin doğru özet”, “bütün videolarda çalışır” ve “tamamen çevrimdışı” gibi kesin pazarlama vaatleri gerçek ağ, model ve kaynak incelemesi olmadan kullanılmaz.

Zorunlu bulut/ücretli LLM API, aylık abonelik, otomatik telemetri veya her açılışta sunucu lisans denetimi ürün ilkesi olarak **kabul edilmez**. İlk model dosyası indirmesi ve olası ödeme hizmeti ayrıca kullanıcı isteğine bağlı olabilir.

## 2. Bugünkü GitHub gerçekleri

Kaynak: seydivakkas/OkuLens, main, 18 Ekim 2026.

| Konu | Doğrulanan gerçek | Sonuç |
| --- | --- | --- |
| Depo görünürlüğü | Public | Geçmiş kaynak koduna erişim kamuya açıktır |
| Lisans dosyası | LICENSE: MIT; “Copyright (c) 2026 OkuLens contributors” | MIT bildirim/izin koşulları korunur |
| Paket bildirimi | package.json: license MIT; private true | npm private bayrağı proprietary telif veya özel GitHub deposu anlamına gelmez |
| Kaynak çıkarımı | Readability, Gmail/Outlook ve YouTube DOM adaptörleri | Mevcut kodun MIT hakları korunur; platform şartları ayrıca uygulanır |
| Özetleme | TF-IDF, TextRank, mevcut ONNX entegrasyon iskeleti, 10/100/1000 hedefleri | Gelecekte sırf bu mevcut kodu gizleyerek münhasır Pro hakkı iddia edilmez |
| Üçüncü taraf | Readability / Transformers.js Apache-2.0; ONNX Runtime MIT; Qwen ONNX model kartı Apache-2.0 | Lisans, patent/marka, NOTICE, model kartı, SHA ve gerçek dağıtım sınırları ayrı denetlenir |
| Ticari uygunluk kontrolü | docs/TICARI_KULLANIM_POLITIKASI.md ve commercial:* betikleri | Otomatik lisans envanteri var; ticari hukuk ve paket yayını onayı değildir |
| Gizlilik | docs/GIZLILIK_POLITIKASI_TASLAK.md | Yayımlanabilir politika değil |
| Kaynak hakları | Genel “contributors” telif satırı | Bütün hakların tek kişide olduğu kanıtlanmış değildir |

Bu doküman önceden bulunan [ticari kullanım ve bağımlılık kabul politikası](TICARI_KULLANIM_POLITIKASI.md) ile birlikte uygulanır; onun yerine geçmez.

## 3. MIT lisansının korunacak sınırları

1. Mevcut yayımlanmış OkuLens kaynak kodu MIT lisanslıdır; kullanıcıların bu sürümleri kullanma, kopyalama, değiştirme, dağıtma ve ticari kullanma izinleri sonradan tek taraflı geri alınmaz.
2. MIT altında mevcut kodu bir ücretli dağıtıma dahil etmek mümkündür; ilgili telif ve lisans bildirimleri korunmalıdır.
3. Bir uzantıda mevcut MIT işlevini ödeme düğmesiyle kilitlemek, kamuya açık kodun başkaları tarafından MIT kapsamında kullanılmasını veya fork edilmesini engellemez.
4. Bugünkü TF-IDF/TextRank, 1000 kelime seçeneği, ONNX adaptörü, kaynak pasaj planlayıcısı, mevcut e-posta/video çıkarıcıları ve kabul laboratuvarı zaten kamuya sunulmuş kod kapsamındadır. Geleceğin Pro teklifini yalnızca bunların “özel mülkiyet” olduğu iddiasına dayandırma.
5. Yayımlanmış MIT metninin ilerideki projeye hangi hakları sağladığıyla, ileride **yeni üretilen** yazılımın nasıl lisanslanacağı ayrı konulardır.
6. Telif hakkı sahipliği ve kodu farklı şartlarla yeniden lisanslama yetkisi için katkı veren her kişi/kurumun hakları ayrıca doğrulanır. MIT, herkesin bütün hakların sahibi olduğu anlamına gelmez.
7. Geçmiş bir sürümle ilgili “MIT iptal edildi” duyurusu, geçmiş kullanıcı haklarını kaldırmak için kullanılmaz.

**Önerilen tercih:** Mevcut OkuLens Core MIT olarak devam eder; ücretli teklif ya gerçek yeni kod/iş akışı ve ayrı lisansla ya da kurulum, kalite, destek ve özelleştirme hizmetiyle farklılaşır.

## 4. Hak sahipliği ve üçüncü taraf varlık envanteri

Genel telif satırı, GitHub repo yöneticiliği, commit yazarlığı veya herhangi bir PR'ın birleştirilmiş olması tek başına münhasır hak sahipliği kanıtı **değildir**.

| İnceleme alanı | Kanıt yöntemi | Kabul |
| --- | --- | --- |
| İlk kaynak kod | İlk commitler, daha önceki paketler, dış projelerden alınan bölümler | Kaynak kimliği ve telif sahibinin belgelenmesi |
| Dış katkılar | PR/commit geçmişi, kişinin yazılı lisans veya katkı izni | İlgili kodun ticari modülde kullanım yetkisi |
| İş/staj/üniversite kapsamı | Uygulanabilir sözleşmelerin, işveren ve kurum haklarının uzman incelemesi | Gerekli izin veya devir kanıtı |
| Üçüncü taraf kod, font, ikon, görsel | Bileşen bazında orijinal lisans, sürüm, attribution/NOTICE | Yeniden dağıtım hakları |
| AI ile üretilen içerik/kod | Gerçek kaynaklar, uyarlama, önceki örnek ve hak ihlali değerlendirmesi | Koşulları net, izlenebilir katkı |
| Model ağırlıkları ve veri | Upstream model soy ağacı, kart, sabit commit, lisans, SHA | Yeniden dağıtım/indirme koşulları |
| OkuLens adı ve logo | TÜRKPATENT ve ilgili pazarlarda benzerlik/tescil incelemesi | Kullanım uygunluğu |
| Müşteri için geliştirilen özel modül | Sözleşme ve üçüncü taraf hakları | Satış, yeniden kullanım, bakım yetkilerinin açıklığı |

**Durum:** Yukarıdaki gerçek sahiplik belgeleri bağımsızca doğrulanmadan telif mülkiyeti, marka uygunluğu veya çift lisanslama yetkisi PASS olarak ilan edilmez.

### Dış katkı politikası

Mevcut CONTRIBUTING.md otomatik telif devri veya CLA teşkil etmez. Core'a gelen yeni dış katkılar için katkı sahibinin yazma hakkı, proje lisansını anladığı ve yeni ticari hak kısıtı getirmediği teyit edilir. Pro/Business için ayrı hakla yayımlanması planlanan yeni özel kodun dış katkısı, gerekli yazılı hak devri veya lisanslama yetkisi netleşene kadar kabul edilmez. Başka bir lisansla yeniden yayımlama düşünülürse gerçek hak sahiplerinin rızası/izinleri gerekir; bu belge o rızayı oluşturmaz.

## 5. Önerilen kod/depo mimarisi

~~~text
OkuLens ürün ailesi
|
+-- OkuLens Core [bugünkü kamu GitHub deposu / MIT]
|   +-- Mevcut Chrome/Edge arayüzü
|   +-- İçerik çıkarımı ve TF-IDF/TextRank
|   +-- Mevcut ONNX model adaptörü
|   +-- 10/100/1000 hedefleri, sentetik testler, kabul laboratuvarı
|
+-- OkuLens Pro [GELECEK / henüz ayrı telifli kod yok]
|   +-- Yeni gelişmiş belge koleksiyonları ve karşılaştırma
|   +-- Yeni iddia–kaynak–rapor denetim iş akışları
|   +-- Yeni gelişmiş rapor/evidence ürün özellikleri
|   +-- İlgili kodun kendi ticari lisans/eşlik eden bildirimleri
|
+-- OkuLens Business [GELECEK / henüz ayrı ürün yok]
    +-- Kuruma özel politikalar / şirket içi ayarlar
    +-- Çevrimdışı imzalı lisans doğrulama
    +-- Özel kurulum ve destek sözleşmesi
    +-- Müşteri izniyle yerel entegrasyonlar
~~~

- Core MIT olarak kamuya açık kalır.
- Pro/Business özel kodu için **ayrı erişimli depo ve farklı bir ticari lisans sözleşmesi** adaydır. Hak sahipliği kesinleşmeden ikinci repo açmak veya LICENSE değiştirmek gerekmez.
- Mevcut MIT çekirdeğin içine Pro'ya özel yeni işlev gömülürse telif ve dağıtım sınırları dosya/paket bazında açıkça ayrılır; tek repo altında gizli lisans değiştirme yapılmaz.
- Chrome/Edge MV3 mağaza paketinde çalışan mantık incelenebilir ve kendi içinde olmalı; uzaktan indirilen JavaScript ile gizli premium özellik sağlanmaz. Aynı anda tüm kodun istemcide bulunduğu durumda kopyalamaya karşı mutlak teknik koruma vaat edilmez.
- İşletmeler için olası Windows yardımcı uygulaması veya self-hosted bileşen **yeni kapsamdır**; mevcut manifest native-messaging/host izinlerine sahipmiş gibi sayılmaz.

## 6. Free / Pro / Business ürün özellikleri sözleşmesi

Bu tablo **gelecekteki ürün ayrımı tasarımıdır**; hazır, doğrulanmış veya satılan bir ürünü anlatmaz. Özelliklerin etkinleştirilmesi mevcut MIT izinlerini değiştirmez.

| Özellik / teslim | Free — Core | Pro — yeni geliştirmeler | Business |
| --- | --- | --- | --- |
| Seçili metin ve temel makale çıkarımı | Mevcut açık çekirdek | Core ile birlikte | Core ile birlikte |
| TF-IDF/TextRank ve mevcut kelime bütçeleri | Mevcut MIT haklarıyla | Korunur | Korunur |
| Gmail/Outlook/YouTube DOM çıkarıcıları | Deneysel, kaynak kullanıcı isteğiyle | Core ile birlikte | Core ile birlikte |
| Bugünkü ONNX üretken altyapı kodu | Mevcut açık çekirdek; gerçek üretim HOLD | Münhasır ücretli hak iddiası YOK | Aynı |
| Yeni çoklu belge karşılaştırma çalışma alanı | Henüz yok | **Pro aday modül** | Dahil edilebilir |
| Yeni gerekçe/iddia bazlı kaynak inceleme ve rapor | Henüz yok | **Pro aday modül** | Kurumsal akışlarla |
| Yeni gelişmiş rapor şablonları / oturum koleksiyonları | Henüz yok | **Pro aday modül** | Kurumsal şablonlar |
| İmzalı çevrimdışı lisans ve özellik yetkisi | Gerekli değil | TİCARİ-004 | TİCARİ-004 |
| Kurum politikası ve dağıtım yönetimi | Yok | Yok | Yeni Business adayı |
| Kurulum, müşteri eğitimi, özelleştirme | Topluluk dokümantasyonu | Ayrı opsiyonel hizmet | Sözleşmeli hizmet |

**Ticari fark:** Aynı açık kaynak fonksiyonunu pazarlama adı değiştirerek değil; yeni güvenilir iş akışları, müşteri desteği, kurulum/dağıtım kolaylığı, yeni lisanslanmış geliştirmeler ve ölçülen kullanıcı değeriyle oluştur.

### Ürün sınırlarının kullanıcıya yansıtılması

- Ücretsiz sürüm bilerek işe yaramaz hâle getirilmez.
- Model kurulu değilse veya yetersizse “Üretken Pro başarıyla çalıştı” denmez; TextRank fallback doğru etiketlenir.
- Kısa/uzun özet hedefleri **kesin kelime vaadi** değildir.
- Kaynak pasaj kimliği, tekil iddiaları otomatik doğrulayan kanıt sayılmaz.
- “Kolay/Orta/Zor”, gerçek Türkçe model sonuçları olmadan doğrulanmış yeniden yazım yeteneği diye pazarlanmaz.

## 7. Fiyatlandırma ve lisanslama hipotezleri

| Paket | Ticari düşünce | Henüz belirlenmemiş unsurlar |
| --- | --- | --- |
| Free | Ücretsiz | Sürüm desteği ve kullanım koşulları |
| Pro | Tek seferlik ürün lisansı | Fiyat, cihaz sayısı, lisans devri, iade, güncelleme dönemi, destek sınırları |
| Business | Firma/cihaz başına lisans veya kurulum sözleşmesi | Kullanıcı/cihaz tanımı, SLA, özelleştirme, eğitim, faturalandırma ve destek |

Zorunlu aylık abonelik/LLM API faturası istenmiyor. Buna rağmen ödeme işlem hizmetinin bir komisyonu olabilir; “hiçbir üçüncü taraf maliyeti yok” gibi mutlak ifade kurulmaz. “Ömür boyu sınırsız güncelleme” ve “sınırsız ücretsiz destek” taahhüdü verilmez. Nihai fiyat ve müşteri ödeme isteği TİCARİ-005 pilotuyla doğrulanır.

## 8. Çevrimdışı lisans sistemi için teknik sözleşme girdileri — TİCARİ-004

**Aday tasarım, henüz uygulanmadı:**

- Yerelde doğrulanan, üretici özel anahtarıyla imzalı lisans dosyası: licenseId, edition, product, featureRights, issuedAt, geçerliyse updateThrough/versionRange ve isteğe bağlı kurum/cihaz bilgileri.
- Gizli imzalama anahtarı asla GitHub deposuna veya tarayıcı paketine konmaz; istemci yalnızca doğrulama için açık anahtarı taşır.
- Lisans okunamadığında, yoksa veya imza geçersizse **Free çalışmaya devam eder**, sadece gerçekten yeni ücretli modüller devre dışı kalır.
- Merkezi sunucuya her çalıştırmada bağlanma yok; otomatik kullanıcı belgesi gönderimi yok.
- Kurulu modelin dosya lisansı ile OkuLens Pro ürün lisansı **farklı şeylerdir**.
- Saat manipülasyonu, cihaz değişimi, yedekleme, anahtar yenileme ve lisans paylaşımı için açık tehdit modeli ve müşteri sözleşmesi hazırlanır.
- İstemci tarafı lisans kontrolü mutlak kopya engelleme sağlamaz.

## 9. Dağıtım ve sürüm politikası

| Kanal | Ürün paketi | Sınır |
| --- | --- | --- |
| GitHub | MIT açık çekirdek | Mevcut lisans hakları ve telif bildirimleri korunur |
| Chrome Web Store | İleride paketli Free/Pro | Çalışma kodu kendi paketinde; MV3 uzaktan yürütülen kod yasağı; veri beyanı |
| Microsoft Edge Add-ons | İleride aynı ürün ailesi | Ayrı mağaza inceleme, veri ve destek gereklilikleri |
| Windows şirket içi kurulum | Gelecekte Business | Kurulum, lisans, güncelleme ve güvenlik sözleşmesi |
| Özel ticari bileşen | Yeni hakla oluşturulan kod | Ayrı EULA ve katkı/telif yetkisi |
| Model ağırlıkları | Şimdilik kullanıcı onaylı yerel indirme | SHA, lisans, önbellek, kalıcı depolama; mağaza uygunluğu TİCARİ-002 |

Chrome Manifest V3, harici kaynaklardan çalıştırılabilir kod yüklenmesini kısıtlar. Uzak model verisi ve tarayıcı içi model yürütme politikası ayrıca incelenir; “model ağırlığı varsa her türlü çalıştırılabilir mantık indirilebilir” sonucu çıkarılamaz.

Ticari paket için önceden oluşturulmuş otomatik kapılar korunur:

~~~powershell
npm run check
npm test
npm run commercial:check
npm run build:runtime
npm run commercial:notices
npm run commercial:release-check
~~~

Bu komutların geçmesi, hukuk/marka/KVKK/Gmail–YouTube kullanım hakkı ve gerçek Windows model kabulünün geçtiği anlamına gelmez.

## 10. TİCARİ-001 / TİCARİ-007 kabul ve HOLD matrisi

| Kapı | Bu adımda sağlanan | Ticari yayımlama için |
| --- | --- | --- |
| Ürün yönü | Free/Pro/Business mimari ayrımı yazılı | İşletme sahibi stratejik onayı |
| MIT | Geçmiş kamu lisansı koruma kararı yazılı | Mevcut tüm paketlerde bildirimlerin denetlenmesi |
| Telif sahipliği | Denetlenecek kalemler tanımlı | **HOLD** — özgün hak sahipleri/katkıcı sözleşmeleri |
| Pro kapalı kod | Yeni modüller için sınır önerisi yazılı | **HOLD** — telif, EULA, repo/dağıtım kararları |
| Marka | Tescil/benzerlik taraması iş olarak kaydedildi | **HOLD** — ilgili resmî inceleme |
| Mağaza uyumlu model | TİCARİ-002 bağımlılığı yazılı | **HOLD** |
| KVKK/gizlilik/platform şartları | TİCARİ-003 bağımlılığı yazılı | **HOLD** |
| Çevrimdışı lisans | TİCARİ-004 soyut sözleşme girdisi yazılı | **HOLD** |
| Ticari değer ve ödeme | TİCARİ-005 pilot ihtiyacı yazılı | **HOLD** |
| Gerçek Türkçe ONNX/sadakat | Issue #4 bağımlılığı kaydedildi | **HOLD** |
| Yayın/paket/Windows kabul | TİCARİ-006/007 bağımlılığı kaydedildi | **HOLD** |

**Kesin kapanış politikası:** Bu belge ana dala alınsa bile TİCARİ-001'in yazılı strateji kısmı hazırlanmış sayılır; mülkiyet, fiilî ticari haklar ve satışa hazır olma **HOLD** kalır. Mevcut LICENSE dosyası değiştirilmez. Issue #4 gerçek Windows Chrome/Edge, Türkçe doğruluk, bellek, streaming ve kaynak sadakati doğrulanıncaya kadar **OPEN / HOLD** kalır.

## 11. Sıradaki işler

1. **TİCARİ-002:** Chrome/Edge mağaza uyumlu, Node.js gerektirmeyen, kullanıcı onaylı model indirme, kalıcı depolama, sürüm güncelleme ve kaldırma tasarımı.
2. **TİCARİ-003:** Gizlilik/KVKK veri haritası, Chrome/Edge beyanları, Gmail/YouTube platform hakkı ve güvenlik.
3. **TİCARİ-004:** İmzalı çevrimdışı lisans dosyası ve Pro yetkileri.
4. **TİCARİ-005:** Ücretli ürüne ödeme isteğinin gerçek kullanıcı pilotuyla sınanması.
5. **TİCARİ-006:** Mağaza paketleri, SBOM, üçüncü taraf bildirimleri, yayımlama belgeleri.
6. **TİCARİ-007:** Gerçek Windows/Chrome/Edge, model performansı, kaynak sadakati ve ticari yayın kabulü.

## 12. Kaynaklar

**GitHub içi:** [LICENSE](../LICENSE), [CONTRIBUTING.md](../CONTRIBUTING.md), [Ticari Kullanım Politikası](TICARI_KULLANIM_POLITIKASI.md), [Üçüncü Taraf Model Envanteri](THIRD_PARTY_MODELS.md), [Gizlilik Taslağı](GIZLILIK_POLITIKASI_TASLAK.md), [İşlem 004-A](ISLEM_004A_GERCEK_MODEL_KABUL.md), [Issue #4](https://github.com/seydivakkas/OkuLens/issues/4).

**Resmî ve referans metinleri:** [OSI MIT](https://opensource.org/license/mit), [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0), [Chrome MV3 gereksinimleri](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements), [Chrome Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use).

Bu belgeler telif mülkiyetine veya yazılım sözleşmesine özgü hukuk incelemesinin yerine geçmez.
