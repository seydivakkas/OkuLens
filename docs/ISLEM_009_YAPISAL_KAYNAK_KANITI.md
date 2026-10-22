# İşlem 009 — Bölüm farkındalıklı, kaynak kanıtlı Windows TextRank özetleme

**Tarih:** 22 Ekim 2026  
**Birincil ürün:** OkuLens Windows masaüstü. Chrome/Edge uzantısı ertelenmiş isteğe bağlı destek olarak korunur.  
**Çalışma motoru:** Var olan yerel TF-IDF/TextRank; yeni ağır LLM, API anahtarı veya bulut çıkarımı eklenmedi.  
**Gerçek kullanıcı kalite kabulü:** HOLD.

## Kullanıcının yeni kararı: kurgusal kaynak dosyası GitHub'a alınacak

Kullanıcının açık isteği üzerine özgün **1.926 kelimelik / 16.526 bayt** kurgusal rapor şu yola eklendi:

`tests/fixtures/okulens-kurgusal-kutuphane-raporu.txt`

Kaynak SHA-256: `9972fdbbb651f6ac52830a903ae6fe99c52e50ac77b6663ff8b5128309ed97db`. Bu veri tamamen **kurgusaldır**, kişisel veya gerçek belediye verisi değildir. SHA regresyon testinde kontrol edilir. Özgün kaynak yanlışlıkla değiştirilirse test FAIL olur.

## Yapısal algoritma

`shared/structured-extractive.mjs` dosyası:
- En az üç numaralı büyük harfli belge başlığı varsa yapısal modu açar. Diğer kaynaklarda önceki `hybrid-nlp.mjs` davranışı korunur.
- Bölümleri (amaç/giriş, katılımcı, envanter, iş akışı, ölçüm, kaynak sadakati, bütçe, risk, karar) rol etiketleriyle işler.
- `ÖNEMLİ NOT`, ön bilgi metinleri ve `DEĞERLENDİRME İÇİN ANAHTAR NOKTALAR` gibi veri yerine değerlendirmenin nasıl yapılacağını anlatan meta alanları özet adaylığından çıkarır. **Kaynak metni silmez/değiştirmez.**
- Her bölümün cümle adaylarını mevcut `analyzeText()` TextRank/TF-IDF skorlarıyla değerlendirir, ayrıca sayısal olgu, ana konu, karar/yaygınlaştırma, bölüm tekrar cezası uygular.
- **10 kelime:** İlk anlamlı konu cümlesinden, kaynakta birebir bulunan en fazla 10 kelimelik bitişik alıntı. Yeni cümle veya iddia türetmez. Kısmi alıntı uyarısı vardır.
- **100 kelime:** Konu, katılımcı, doğrulanmış sonuç, ölçüm ve karar rolü adaylarını önce seçer; ancak bir kaynak cümlesinin bütünlüğünü koruyabilmek için bütçe sınırında bazı ölçütlerin atlanabileceğini kabul eder.
- **1000 kelime:** Çok sayıda bölümden giriş/sonuç/bütçe/risk/karar temsili, tekrarlı cümlelerin azaltılması.
- Seçilen ifadelerin her biri için `sourceEvidence`: `sectionId`, `sectionTitle`, `role`, `startChar`, `endChar`, `partial`, `numbers`. Karakter aralıkları açıkça **normalize edilmiş kaynak metne** göredir. `denetim.json` belge gövdesini ikinci kez kopyalamaz.
- Kaynak 10/100/1000 bütçesinin altındaysa önceki sözleşme korunur: kaynak uydurularak uzatılmaz ve farklı sonuç üretme iddiası olmaz.
- Uzun, başlıksız ve 260.000 karakteri aşan kaynaklarda önceki bölümleyici algoritma korunur; bu yeni modun bütün büyük belgelerde çalıştığı iddia edilmez.

## Somut otomatik kontrol

`tests/structured-source-evidence.test.mjs` gerçek özgün kurgusal TXT dosyasını doğrudan test eder. Test SHA-256 ve byte sayısı, bölüm/rol sınıflandırması, 10/100/1000 sınırı, hedef olgular, meta yönerge dışlanması, seçilen sayıların kaynağa eşleşmesi ve **her kaynak aralığının metinle birebir aynı olması** kontrollerini yapar.

Windows GitHub Actions içinde `npm run summary:regression -- --input tests/fixtures/okulens-kurgusal-kutuphane-raporu.txt --output-dir kanitlar/islem009` çalıştırılır. Çıktılar `OkuLens-Islem-009-Ozet-Kanitlari` adlı indirilebilir CI kanıt paketine yüklenir. `denetim.json` içinde hem kelime sınırı hem de kaynak kanıtı vardır.

## Kabul sınırları

**Otomatik PASS ≠ metnin anlamca yeterli olduğu iddiası.** Bir kaynaktaki sayılar değişmeden seçilse de önemli bir metrik atlanabilir veya farklı cümlelerin bağlamı ayrı kalabilir. 10 kelimelik kısmi kaynak alıntısı tam bir dilbilgisel cümle olmak zorunda değildir. 100 kelimelik bütçe, bütün sonuçları tek seferde kapsamayabilir; konuyla ilgili ana bulgular insan tarafından denetlenir.

Son kabul:
1. GitHub'da bütün Node testleri, Windows GUI, büyük TXT dosya açma, EXE smoke ve yeni SHA fikstür testleri PASS.
2. Kullanıcı gerçek Windows bilgisayarında **aynı 16.526 bayt, SHA sabitli TXT** ile 10/100/1000 üretimini tekrarlar.
3. Eski/yeni sonuçlar: 10 kelime konu, 100 kelime kritik sonuçlar ve karar, 1000 kelime bütçe/risk/sadakat/karar; her sayı kaynakla karşılaştırılır.
4. Kaynak sadakati, olumsuzluklar ve desteklenmeyen iddialar insan incelemesinden geçene kadar `QUALITY_HOLD`.
5. Gerçek Qwen/ONNX inference ve ticari yayımlama ayrı `HOLD`; W-P2 Issue #19 sürer.

**Mühendislik kararı (CI öncesi):** `ISLEM_009_KOD_ADAY / CI_BEKLENIYOR / KURGUSAL_KAYNAK_GITHUB_YUKLENDI / GERCEK_KULLANICI_KALITE_HOLD / ONNX_HOLD / TICARI_YAYIN_HOLD`.
