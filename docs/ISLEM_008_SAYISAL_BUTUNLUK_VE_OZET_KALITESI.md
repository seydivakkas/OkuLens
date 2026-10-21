# İşlem 008 — Sayısal Bütünlük ve Kaynak Odaklı Özet Kalitesi

**Tarih:** 21 Ekim 2026
**Temel kanıt:** Kullanıcının aynı kurgusal Denizkent Belediye Kütüphaneleri raporundan ürettiği 10, 100, 1000 kelimelik metinler. 10 kelimelik çıktı üçüncü bir hata türünü seçmiş; 100 ve 1000 kelimelik çıktılarda noktalı bütçeler '000 Türk lirasıydı' biçiminde kopmuştu.
**Kapsam:** Mevcut yerel TextRank/TF-IDF çıkarımsal motor; gerçek Qwen/ONNX eğitimini veya yeni harici API'yi kapsamaz.

## Kod değişiklikleri

1. **shared/summarize.mjs** artık cümle sınırını sadece cümle sonu noktalama + boşluk veya yeni satırda arar. Binlik ayırıcı, ondalık, saat, tarih ve para tutarı içindeki noktalardan kesme yapmaz. Dr./T.C. gibi sınırlı kısaltmaları ve 1. BAŞLIK gibi numaralı bölüm başlarını tek kaynak parçası olarak korur. Kaynak karakteri veya sayı hanesi silmez.
2. Aynı dosyanın wordTokens/wordCount işlevinde '1.800.000', '4,1', '31.12.2026' gibi sayısal ifadeler tek token sayılır. Önceki raporlardaki kelime sayılarıyla birebir aynı görünmesi garanti değildir; bu istenen düzeltmedir.
3. **shared/hybrid-nlp.mjs** cümle temsilini belgenin başındaki konu terimlerine, tüm belge genelindeki önem derecesine, numerik sonuçlara ve kaynak konumuna göre değerlendirir. 'Bu nedenle', 'Üçüncü tür' gibi bağlama muhtaç ifadeler kısa özette cezalandırılır.
4. **10 kelimelik seçim** ayrı yapılır: kısa bütçeye sığan konu odaklı en güçlü tam cümle arar. Hiçbir cümle sığmıyorsa kaynak cümlesinin başlangıcından kısaltma yapılır ve uyarı gösterilir; kaynak dışı sözcük üretilmez.
5. **100/1000 kelimelik seçim** MMR tekrar azaltma ve üç/sekiz belge bölgesi temsilini kullanır; bütçeyi aşmaz. Çok uzun belgelerin mevcut bölümleyici mimarisi korunur.
6. **tests/numeric-summary-fidelity.test.mjs** gerçek raporun bütçe/tarih/kişi/görev olgularından oluşturulmuş ayrı bir **kısa sentetik regresyon fikstürü** kullanır. Kullanıcının tam TXT metni ve özel raporları public GitHub'a yüklenmez.

## Kabul ayrımı

- Sayısal belirtecin cümle bölme sırasında bozulmaması otomatik olarak her önemli sayının 10/100/1000 kelimelik özette bulunmasını garanti etmez.
- Sınırlı kelime bütçesi nedeniyle bazı sayılar tamamen seçilmeyebilir. Bütün sayıların zorunlu korunması ayrı kaynak kanıtı/kritik veri politikasını gerektirir.
- TextRank kaynakta hatalı bir iddia varsa onu da aynen aktarabilir. Bu değişiklik otomatik fact-check veya üretken yeniden yazım değildir.
- Sentetik regresyon başarısı, kullanıcının bilgisayarında yeni Windows sürümüyle **aynı gerçek üç çıktı dosyasının** yeniden denenmesini ikame etmez.
- Windows Qwen/ONNX gerçek model inference, çevrimdışı kabul, VRAM ve ticari yayın HOLD; Issue #19 açık tutulur.

**Karar (CI öncesi):** SAYISAL_BUTUNLUK_KOD_ADAYI / OZET_KALITESI_SENTETIK_CI_BEKLENIYOR / WINDOWS_KULLANICI_YENIDEN_KABUL_HOLD / QWEN_ONNX_HOLD / TICARI_YAYIN_HOLD.

## Aynı TXT dosyasıyla tekrar üretilebilir 10/100/1000 deneyi

Kullanıcı kendi Windows bilgisayarında önceki kurgusal kaynak TXT'yi yerel klasörde tutar. Dosya internete yüklenmez. Tek PowerShell oturumunda, proje klasöründe:

~~~powershell
npm.cmd run summary:regression -- --input "C:\KENDI_DOSYA_YOLUN\OkuLens_Ozet_Kalite_Testi_Kurgusal_Rapor.txt"
~~~

Rapor `kanitlar/islem008` klasöründe `OkuLens-10-Ozet.txt`, `OkuLens-100-Ozet.txt`, `OkuLens-1000-Ozet.txt` ve `denetim.json` üretir. `kanitlar/` gitignore kapsamındadır. JSON, belge gövdesini içermez; hash, süre, seçilen sayısal değerler ve kelime bütçesi uygunluğunu kaydeder.

**Denetim sınırı:** Numerik belirteçlerin kaynaktan bulunması sayısal bağlamın doğru aktarıldığını veya özetin kaliteli olduğunu garanti etmez. Bütün çıktılar `qualityDecision=HOLD` ile başlar. Önceki üç gerçek çıktı dosyası GitHub'a eklenmez; karşılaştırma kullanıcı tarafından yapılır.
