# TİCARİ-003 — Gizlilik, KVKK Veri Akışı, Tarayıcı İzinleri ve Güvenlik Sözleşmesi

**Karar kaydı:** COMMERCIAL-PRIVACY-SECURITY-V1
**Tarih:** 18 Ekim 2026
**Ürün:** OkuLens 0.4.0, Windows öncelikli Chrome/Edge Manifest V3 uzantısı; Free/Pro/Business gelecek sürüm sözleşmesi
**Kapsam:** İstemci veri envanteri, GDPR/KVKK rol analizi, Chrome Web Store/Edge mağaza bildirimi, gizlilik arayüzü, izin/erişim azaltma, yerel saklama, tehdit modeli, teknik/insan kabul kapıları
**Durum:** Belge ve kod düzeyinde ön kontrol; **mevzuat/yayıncı kimliği/platform sözleşmesi/Windows cihaz ağ kaydı/gerçek ONNX ACCEPTANCE = HOLD**.

Bu metin **hukuki görüş, mağaza onayı, KVKK aydınlatma metninin nihai sürümü veya müşteriye yayımlanacak gizlilik politikası değildir**. KVKK'nın hangi faaliyet ve role hangi hukuki sebebi gerektirdiği gerçek yayıncı, kullanıcı kitlesi, kullanım amacı ve kurumsal müşteri sözleşmeleri ortaya konmadan otomatik belirlenemez. Model indirme için teknik onay, hukuken her veri işleme için geçerli açık rıza yerine geçmez.

İlgili belgeler: [TİCARİ-001](TICARI_001_URUN_VE_LISANS_STRATEJISI.md), [TİCARİ-002](TICARI_002_MODEL_KURULUM_VE_DEPOLAMA.md), [Gizlilik taslağı](GIZLILIK_POLITIKASI_TASLAK.md), [Ticari uygunluk politikası](TICARI_KULLANIM_POLITIKASI.md), [İşlem 004-B gerçek model kontrol planı](ISLEM_004B_TARAYICI_MODEL_DOGRULAMA.md), [Issue #4](https://github.com/seydivakkas/OkuLens/issues/4).

## 1. Tek amaç ve davranış ilkeleri

**Tek amaç adayı:** Kullanıcının isteğiyle aktif sayfada seçili metni, makaleyi, görünür e-posta mesaj gövdesini veya açılmış video transkriptini yerel-öncelikli olarak özetlemek, kullanıcıya inceleme/kopyalama/dışa aktarma sağlamak.

**Bağlayıcı teknik sınırlar:**
- E-posta veya metin kullanıcı komutu olmaksızın sürekli olarak toplanmaz. İzinler yalnızca gerekli kullanıcı işlevi için kullanılır.
- Gönderen/alıcı/meta alanları özel hedef olarak toplanmaz; buna rağmen **e-posta gövdesinin kendisi ad, adres, telefon, özel nitelikli veri veya diğer kişisel bilgi içerebilir**. Otomatik anonimleştirme olduğu iddia edilmez.
- Kaynak içerik özetleme için uzak ücretli LLM API'sine gönderilmez. Paketli model veya tarayıcı yerleşik model özellikleri varsa bunların gerçek ağ davranışı ayrıca kontrol edilir.
- Model ağırlığı yalnız kullanıcının açık indirme işlemiyle ağdan alınır; bu istekte özetlenecek metin bulunmaz. Hugging Face ve yönlendirme hostları IP/ağ isteği meta verilerini görebilir.
- İzinsiz reklam/analitik/izleme, veri broker'ına paylaşım, uzak debug loglarına kaynak metni gönderimi ve kullanıcının gerçek mesajlarının CI fixture'ına konması yasaktır.
- İsteğe bağlı indirme/onay, Chrome izin bildirimi, gizlilik aydınlatması ve KVKK hukuki sebebi ayrı süreçlerdir.
- Ücretli Pro lisans doğrulaması gelecekte çevrimdışı tasarlanacak; gizli belge içeriği lisans sunucusu veya ödeme sağlayıcısına yollanmaz.

## 2. Doğrulanan mevcut veri akış matrisi

Aşağıdaki tablo GitHub main kodundan elde edilen **tasarım ve kod gözlemidir**; henüz gerçek Windows Chrome/Edge ağ/disk incelemesi yapılmadı.

| Akış | Veri kategorisi | Tetikleyici/kaynağı | Kod ve yürütme | Saklama/erişim | Ağ/alıcısı | Risk / HOLD |
| --- | --- | --- | --- | --- | --- | --- |
| Seçili sayfa metni | Web içeriği; kişisel/özel nitelikli veri içerebilir | Aktif sekme, kullanıcı Özetle/Kaynağı al | content/injected.js → panel | Panel belleği; bazı sayfa özetleri session | Amaç dışı uzaktan gönderim tasarlanmamış | Gerçek ağ kaydı HOLD |
| Makale başlığı/URL ve gövde | URL'deki kimlik/arama parametreleri, web içeriği | Kullanıcı istekli Readability çıkarımı | content/article-extractor.js → panel | URL/özet sekme session kaydında bulunabilir | Uzak özetleme API yok | URL minimizasyonu ve session TTL HOLD |
| Gmail/Outlook gövdesi | **Kişisel ileti**, içerikte adres/sağlık vb. olabilir | Kullanıcının açtığı mesaj/konuşma kapsamı | content/email-extractor.js, panel | Varsayılan session özet kaydı yapılmaması tasarlandı; panel belleği geçici | Uzak ileti API yok | Gerçek DOM kapsama ve bellek temizliği HOLD |
| YouTube transkripti | Video içeriği, altyazı, zaman kodları, URL | Açık transkript paneli | content/youtube-extractor.js → panel | Geçici belge; bazı özetler session | Uzak STT/altyazı API yok | Platform şartları ve gerçek video HOLD |
| SPA değişiklik haberi | Sayfa URL'si; Gmail URL'si kişisel bağlam barındırabilir | URL veya görünür mesaj DOM değişimi | content/spa-monitor.js → extension panel | Mesaj anlık; yerel signature bir süre bellekte | **Yalnız uzantı içi mesaj** | Gereksiz URL alanının kaldırılması öncelik |
| Özet çıktısı ve kaynak pasaj kimliği | Kaynağın türetilmiş bilgisi; kişisel olabilir | Özetle | shared/*, panel, worker | Panel; makale/video için chrome.storage.session olası | Özet motoru yerel hedefli | Halüsinasyon/kanal denetimi HOLD |
| Tercihler | Kelime sayısı/anlatım düzeyi | Kullanıcı ayarı | options/options.js | chrome.storage.local (tarayıcı profili) | sync kullanılmıyor | Profil erişimi ve silme beklentisi |
| ONNX model dosyası | Model varlıkları, kullanıcı ileti içeriği değil | Kullanıcı onayı + opsiyonel Hugging Face izni | options, shared/browser-model-store.mjs | OPFS; küçük kimlik/SHA kaydı chrome.storage.local | Model indirmede Hugging Face ve olası CDN | CORS yönlendirme, SHA metadata, kalıcılık HOLD |
| Dışa aktarılan Markdown/JSON | Özet ve dolaylı kişisel bilgi | Kullanıcının Kopyala/İndir komutu | Panel/studio | Kullanıcının seçtiği dosya/pano | Yalnız kullanıcının sonraki paylaşımı | Güvenli dışa aktarım açıklaması |
| Kabul laboratuvarı raporu | Sentetik test / ileride gerçek veriye dönüşebilir | Kullanıcı isteği | studio/acceptance.js | Kullanıcının indirdiği JSON | Kendiliğinden sunucuya iletilmez | Gerçek içerik kullanımı için veri minimizasyonu |
| Gelecekte Pro lisansı | Kimlik/e-posta/cihaz ilişkisi bulunabilir (henüz uygulama yok) | Ayrı satın alma/kurulum | TİCARİ-004 adayı | Henüz tanımlanmadı | Ödeme sağlayıcısı ayrı olabilir | İşleme rolü, süre, aktarımlar, EULA HOLD |

**Süre ilkesi:** Geçici kaynak metin panel kapandığında bellekte kalmayacak şekilde tasarlanmalıdır; gerçek browser bellek/çökme davranışı ayrıca ölçülür. chrome.storage.session, yalnız tarayıcı oturumundan ibaret sayılmamalıdır: uzantı yeniden yüklenmesi/güncellenmesi/devre dışı kalmasıyla silinir; açıkken bazı makale/video özetleri saklanır. Dışa aktarılmış dosyaları uzantı kendiliğinden silemez. OPFS modeli ve küçük manifest kullanıcı isteğiyle kaldırılabilir; profil silme/eviction süreçleri farklıdır. **Yerelde saklanan içerik otomatik olarak şifreli, anonim veya erişilemez sayılmaz.**

## 3. Chrome/Edge izin ve veri erişim sözleşmesi

**Mevcut manifest izni:** activeTab, scripting, sidePanel, storage, contextMenus.  
**Opsiyonel host izinleri:** https://huggingface.co/* ve CI HTTP GET/HEAD denetiminde gözlenen https://us.aws.cdn.hf.co/* — yalnız model kurulumu isteyen kullanıcıya çalışma zamanında birlikte sorulur. Host zinciri Windows Chrome/Edge kabulü hâlâ HOLD.  
**Mevcut olmayanlar:** genel host_permissions, cookies, webRequest, history, debugger, uzaktan LLM API izni.

| İzin | Tek işlev | Erişim sınırı ve doğrulama |
| --- | --- | --- |
| activeTab | Kullanıcı jestinden sonra o sekmede seçili/kaynak metni almak | Kalıcı tüm siteler erişimi değildir; yeni sekme veya yetki kaybında açık hata |
| scripting | Readability veya e-posta/video çıkarıcılarını aktif sekmeye enjekte etmek | Yalnız desteklenen ve izin verilen sayfa; iç sayfalara erişim yok |
| sidePanel | Özetleme ve kaynak görünümü | Gereksiz ayrı pencere yok |
| storage | Tercih, geçici özet, küçük model manifesti | Hassas özetleri sync'e taşımama; storage.local içerik betiklerine varsayılan görünürlük sınırı ayrıca sıkılaştırılmalı |
| contextMenus | Kullanıcının seçili metinle açık komutu | Otomatik içerik toplama izni değildir |
| optional_host_permissions | Sabit revizyondaki model dosyasını Hugging Face üzerinden kullanıcı komutuyla indirmek | Yönlendirme/CORS doğrulaması olmadan ek geniş host izni yok |

**Daha sıkı erişim:** Chrome storage.local alanı varsayılan olarak content script tarafından okunabilir. Bu nedenle service-worker'da chrome.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'}) çağrısı hedeflenir. Storage API'nin desteklenmediği ortamda risk/uyumluluk ayrıca kaydedilir. Model manifestinde ileride lisans/hesap belirteci tutulmamalıdır; güvenli token saklama ayrı tehdit modeli gerektirir.

**Hata ve günlükler:** Model URL sorgu parametreleri, e-posta adresleri, gerçek kullanıcı metni veya auth bilgileri console, GitHub issue, test artefaktları ya da destek mesajına otomatik eklenmez. Hata kodu ve sabit güvenli olay türü yeterli tutulur.

## 4. KVKK hukuki rol ve yükümlülük analizi — karara bağlanmamış alanlar

**Kesin hukuk sebebi / rol ataması burada yapılmaz.** 6698 sayılı Kanun bakımından gerçek faaliyetler ve sorumlu taraflar belirlenmelidir.

1. **Bireysel kullanıcı:** Kişi kendi hesabındaki iletiyi yerel olarak işlerse geliştiriciye ham metin gönderilmiyor olabilir; bu, yazılım yayıncısının tüm kişisel veri yükümlülüklerinin otomatik sona erdiği anlamına gelmez. Web mağaza kullanıcı veri beyanı yine gerekir.
2. **Kurumsal müşteri:** Firma çalışan/üçüncü kişi mesajlarını işliyor olabilir. İşleme amaçlarını firma belirliyorsa veri sorumlusu veya başka rol analizine gidilir; OkuLens satıcısının veri işleyen olup olmadığı destek, erişim, telemetri ve sözleşmeye bağlıdır.
3. **Ödeme/lisans:** İleride ticari hesap ve fatura bilgisi toplanırsa bu verilerin veri sorumlusu, alıcı grubu, hukuki sebebi, saklama süresi ve yurt dışı aktarım yolu ayrı haritalanır.
4. **Özel nitelikli veri:** Mesaj gövdesinde sağlık, inanç, biyometrik bilgi vb. bulunabilir. 6698 sayılı Kanunun yürürlükteki 6. maddesi dikkate alınmalı; risk özel tedbirlerle incelenmelidir. “E-posta içeriğini tarama niyeti yok” bu riski ortadan kaldırmaz.
5. **Aydınlatma yükümlülüğü:** Gerçek veri sorumlusu/temsilcisi, amaç, alıcı kategorileri, toplama yöntemi/hukuki sebep ve ilgili kişi hakları nihai metinde bulunmalıdır. Hukuka uygunluk sebebi **her işlem için** uzman tarafından doğrulanır. Açık rıza gereken hâllerde aydınlatmadan ayrı elde edilmelidir.
6. **Yurt dışına aktarım:** Hugging Face model indirme isteği yalnız model verisi taşısa bile IP gibi bağlantı verileri söz konusu olabilir. Bu trafiğin teknik gerçekleri, veri sorumlusu rolü, hukuki dayanak ve varsa uluslararası aktarım yükümlülükleri ayrıca değerlendirilir. Türkiye/AB erişimi otomatik “uygun” sayılmaz.
7. **İlgili kişi hakları:** Erişim, düzeltme, silme, şikâyet/başvuru ve iletişim yöntemi yayıncı kimliğiyle birlikte netleştirilir; muhatap yokken nihai KVKK aydınlatması yayımlanmaz.

**Kanıt kaynakları:** KVKK Aydınlatma Yükümlülüğü Tebliği https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig ; kişisel veri işleme şartları https://www.kvkk.gov.tr/Icerik/4190/Kisisel-Verilerin-Islenme-Sartlari . Bu belge, mevcut mevzuatın uygulanma yorumunu değiştirmez.

## 5. Chrome Web Store ve Microsoft Edge mağaza uygunluğu

Chrome Web Store Limited Use ilkesi, web içerikleri ve kişisel ileti dahil kullanıcı verilerinin yalnızca mağazada açıkça anlatılan kullanıcı işlevi için işlenmesini, reklam hedefleme veya veri satışı için kullanılmamasını gerektirir. Mağaza sürümünde doğru gizlilik politikası URL'si ve Developer Dashboard beyanları gerekir. Microsoft Edge Add-ons için aynı ürünün ayrı mağaza sözleşmesi ve gereksinimleri incelenir.

**Ön satış kanıtları:**
- Gerçek geliştirici/yayıncı kimliği, e-posta ve destek adresi, yayımlanabilir gizlilik politikası URL'si.
- Tüm kaynak veri tiplerinin, açık kullanıcı eylemlerinin ve geçici/kalıcı saklamanın mağaza beyanlarıyla eşleşmesi.
- Yerel AI ağ izi, Hugging Face model indirme ve yerleşik tarayıcı AI modeli indirme davranışlarının ayrılması.
- YouTube/Gmail/Outlook hizmet şartları, kullanıcı yetkisi, veri/üçüncü taraf hakları ve telif araştırması.
- Chrome MV3 uzaktan çalıştırılabilir kod yasağı; model baytının kod değil veri olduğu ve uygulama işlevlerinin paket içi olduğu doğrulaması.
- Veri ihlali ve talep başvurusu yönlendirme kanalı; gizlilik değişikliğinde kullanıcı bildirimi.
- Paket lisans NOTICE/SBOM ve tekrarlanabilir build.

Kaynaklar: https://developer.chrome.com/docs/webstore/program-policies/policies , https://developer.chrome.com/docs/webstore/program-policies/limited-use , https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements .

## 6. Tehdit modeli ve tedbirler

| Tehdit | Olası etki | Teknik politika | Durum |
| --- | --- | --- | --- |
| Kötü amaçlı web içeriği/prompt injection | Model çıktısının yönlendirilmesi, yanlış bilgi | Kaynağı komut değil veri say; uzak sistem talimatı yürütme yok; kaynak denetimi | Prompt koşulu kodlu; gerçek değerlendirme HOLD |
| DOM veya yanlış konuşma kapsamı | Başkasının/yanlış mesajın özetlenmesi | Açık kullanıcı eylemi, kaynak kimliği ve görünürlük kontrolü, uyarı | Sentetik var; gerçek Gmail/Outlook HOLD |
| Gereksiz SPA URL aktarımı | URL'deki kişisel konu/kimlik bilgisinin yayılımı | Mesajda URL yerine sabit reason, sender.tab üzerinden sekme eşleştirme | Bu işlemde kod düzeltmesi |
| Tarayıcı uzantısı/content script erişimi | İstemediğimiz bağlamdan depolama okuma | chrome.storage.local TRUSTED_CONTEXTS | Bu işlemde aday sertleştirme |
| Model tedarik zinciri | Yanlış/bozuk ONNX yüklenmesi | Sabit revizyon ve ağırlık SHA; metadata upstream pin/HOLD | PARTIAL |
| CDN yönlendirmesi | Beklenmeyen köken/trafik | Dar opsiyonel host; tam yönlendirme test edilene kadar geniş izin yok | HOLD |
| OPFS artık dosyalar / kota | Diskin dolması / yetim model kalması | Atomik manifest ve silme; çökme recovery ayrı iş | PARTIAL/HOLD |
| Kaynak metninin log veya dışa aktarımı | Gizlilik ihlali | Kısıtlı hata kaydı; kullanıcı seçimiyle dışa aktar; hassas fixture yok | Kod/politika; gerçek denetim HOLD |
| Bilgisayar/profil ele geçirilmesi | Yerel özet/model/ayar erişimi | İşletim sistemi profil güvenliği; hassas bilgiyi gereksiz diske koyma | Sistem bağımlı |
| Yeni Pro/Business ödeme/lisans sistemi | Kimlik/satış verisi gereksiz aktarımı | Yerel doğrulanan imzalı lisans dosyası; ödeme akışı ayrı | TİCARİ-004 HOLD |

## 7. Asgari test ve kanıt planı

A. **Kaynak kontrolü:** Manifest izin listesi, isteğe bağlı host sınırı, dış çağrılar, loglama, storage API kullanımı ve dışa aktarımı dosya bazında izle.

B. **İzin reddi:** Hugging Face erişimi reddedilince model indirme başlamıyor mu? activeTab olmayan Gmail sekmesinde içerik okunmuyor mu? Her sonuca Chrome/Edge kanıt kaydı.

C. **Veri sızıntısı testi:** Gerçek veri yerine sentetik ad, adres, şifre benzeri işaretler barındıran e-posta fixture kullan. Özet, terminal logları, ağ istekleri, Chrome extension origin storage, OPFS ve JSON dışa aktarma ayrı denetlensin. Gerçek kullanıcı e-postası GitHub'a yüklenmesin.

D. **Çevrimdışı test:** Model, ağ açıkken kullanıcının açık onayıyla yüklendikten sonra ağ kesilerek aynı sabit Türkçe fixture ile Chrome ve Edge'de gerçek çıkarım çalıştırılır; uzaktan JS/LLM/model isteği 0 kaydedilir.

E. **Model dayanıklılığı:** İndirme kesintisi, SHA yanlışlığı, OPFS yeniden başlatma, kota, model silme, eski model geçişi ve sahipsiz dosyalar. Metadatanın upstream SHA kontrolü tamamlanmalı.

F. **Hukuk ve mağaza:** KVKK rol/hukuki sebep, özel nitelikli veri, destek iletişimi, mağaza formu, platform şartları ve yayımlanan paket bağımsız onaylanır.

**Kanıt formatı:** Her test için test ID, fixture sürümü, commit SHA, tarayıcı/OS sürümü, kullanıcı izni durumu, izin listesi, ağ izi dosyası SHA, sonuç, yeniden üretim adımı, incelemeci ve PASS/PARTIAL/HOLD/FAIL alanları. Gerçek kişisel içerik kanıt paketine dahil edilmez.

## 8. Fail-closed yayın kapıları

| Kapı | Kabul şartı | Mevcut |
| --- | --- | --- |
| P-01 Veri envanteri ve akış | Kaynak bazlı harita + ağ/diske gerçek cihaz kanıtı | Harita oluşturuldu, cihaz **HOLD** |
| P-02 İzin minimizasyonu | Manifest ve yetki reddi Windows Chrome/Edge | Kod/sentetik; cihaz **HOLD** |
| P-03 KVKK/GDPR | Yayıncı/rol/sebep/aydınlatma uzman onayı | **HOLD** |
| P-04 Chrome/Edge mağaza beyanı | Gerçek politikaya uygun kaynaklı bilgiler | **HOLD** |
| P-05 Model bütünlüğü | Ağırlık ve metadata upstream SHA + OPFS dayanıklılığı | **PARTIAL/HOLD** |
| P-06 Offline yerel üretim | Chrome + Edge gerçek ONNX Türkçe üretimi ve Network kaydı | Issue #4 **HOLD** |
| P-07 Kaynak sadakati / güvenlik | İddia inceleme, prompt injection, silme/iptal/yetim depo testi | **HOLD** |
| P-08 Ticari yayımlama | TİCARİ-001–007, paket NOTICE/SBOM, hak zinciri | **HOLD** |

**Genel karar:** TİCARİ-003 belge/teknik ön kontrol adımı ilerleyebilir; gerçek hukuk/mağaza/kullanıcı/veri ve model doğrulaması tamamlanmadıkça **TİCARİ YAYIN = HOLD**. Kod incelemesi veya yeşil CI bu kararı kendiliğinden değiştirmez.

## 9. Sonraki sıradaki işlemler

1. İşlem 004-B / TİCARİ-002 kabulü: tarayıcı model CDN/OPFS → Transformers.js gerçek akış; metadata SHA ve çökme sonrası temizlik.
2. TİCARİ-003 hukuk/yayın hazırlığı: gerçek veri sorumlusu, destek iletişimi, yayımlanabilir politika, mağaza formları, platform erişim şartları.
3. TİCARİ-004: çevrimdışı imzalı Pro/Business lisansı, hassas kullanıcı verisini işlemeyen yetki tasarımı.
4. TİCARİ-005: gönüllü, sentetik/veri-minimum pilot ve ücret ödeme isteği ölçümü.
5. TİCARİ-006/007: paket, lisans bildirimleri, gerçek Windows Chrome/Edge, ticari yayın kabulü.

## 10. Resmî kaynaklar

- KVKK Aydınlatma Tebliği: https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig
- KVKK kişisel verilerin işlenme şartları: https://www.kvkk.gov.tr/Icerik/4190/Kisisel-Verilerin-Islenme-Sartlari
- Chrome Web Store kullanıcı veri politikası: https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome Web Store Limited Use: https://developer.chrome.com/docs/webstore/program-policies/limited-use
- Chrome MV3: https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- Chrome storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome optional permissions: https://developer.chrome.com/docs/extensions/reference/api/permissions
