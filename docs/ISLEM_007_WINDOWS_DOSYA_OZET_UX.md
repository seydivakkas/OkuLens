# İşlem 007 — Windows TXT/MD dosya açma ve TextRank kalite düzeltmeleri

**Tarih:** 21 Ekim 2026  
**Kaynak:** Gerçek Windows kullanıcı testi: 18 kelimelik örneğin aşırı daraltılması, 260.000 karakter limitinde dosyanın reddedilmesi, dosya açıldığında özetin otomatik başlamaması.
**Durum:** Kod adayı; gerçek cihaz yeniden kabulü HOLD.

## Teknik değişiklik

- Kaynak kelime sayısı hedef kelime bütçesine sığıyorsa tüm metin korunur. TextRank hâlâ kaynak cümlelerini seçer; yeniden yazım veya olgu doğrulama yapmaz.
- Cümle seçiminde giriş, orta ve son bölgelerden temsil ve benzer cümle tekrarını azaltan MMR yaklaşımı kullanılır. Bu heuristik kalite geliştirmesidir, bağımsız kalitelendirme değildir.
- TXT/MD dosya okuma ile GUI karakter limiti 2 MiB sınırında tutarlı hâle getirildi; eski 260.000 karakter hatası giderildi.
- Uzun belgeler 110.000 karakterlik parçalarda işlenir. Kırpılmadan bütün belge analiz edilir; kısa özetin her bölümden cümle içermesi garanti edilmez.
- Dosya seçimi otomatik TextRank özeti üretir. Kullanıcı yeniden metin yapıştırmaz veya ayrıca bir butona basmaz.
- İşlem Electron renderer yerine yerel Web Worker üzerinde yürütülür.
- Ana özetleme düğmesi ve uzunluk seçimi yukarıya taşındı. Qwen indirme/SHA ayarları açılır alana alındı.
- Qwen modelinin gerçek Windows ONNX kabulü ayrı Issue #19 kapsamında HOLD; otomatik dosya özeti Qwen diye etiketlenmez.

## Windows regresyon kapıları

1. 18 kelimelik kaynak ve 100 kelime hedefinde kaynak metni gereksiz yere daraltmama.
2. Uzun kaynakta giriş/orta/son temsil ve tekrarlı cümle azaltma.
3. 260.000 karakterden büyük ancak 2 MiB'dan küçük UTF-8 TXT'nin eksiksiz okunup otomatik özetlenmesi.
4. Windows Electron GUI + IPC + Worker sentetik büyük TXT smoke testi.
5. Kullanıcı Windows'unda gerçek TXT/MD açma, otomatik özet, TXT kaydetme, kaynak sadakati ve ağsız kullanım ayrı kabulü.

**Son karar:** WINDOWS_FILE_UX_KOD_ADAY / CI_BEKLENIYOR / GERCEK_WINDOWS_KULLANICI_KABUL_HOLD / ONNX_HOLD / TICARI_YAYIN_HOLD.
