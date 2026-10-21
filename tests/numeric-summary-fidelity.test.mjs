import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSentences,wordCount,wordTokens,summarizeExtractive} from '../shared/summarize.mjs';
import {analyzeText} from '../shared/hybrid-nlp.mjs';
import {createDesktopSummary} from '../desktop/summary-core.mjs';

const corpus=[
 'Denizkent Belediyesi, üç mahalle kütüphanesinde erişilebilir ve çevrimdışı çalışan bir belge arama ve okuma yardımcı sistemi denemek üzere 1 Nisan–30 Haziran 2026 dönemini kapsayan bir pilot program tasarladı.',
 'Pilotun uygulandığı üç nokta Merkez, Sahil ve Üniversite mahalle kütüphaneleriydi.',
 'Program kapsamında 480 gönüllü ve 12 görevli çeşitli belgelere erişti.',
 'Arşivde toplam 36.000 sayfalık kamuya açık belge bulundu.',
 'Pilot sırasında 2.400 örnek soru ve arama görevi değerlendirildi.',
 'Önceki ölçümde medyan süre 4,1 saniyeydi. Yeni akışta medyan süre 2,7 saniye oldu.',
 'Değerlendiriciler 200 belgeden 184 tanesinin başarılı olduğunu, 16 belgenin hata taşıdığını kaydetti.',
 'Üçüncü tür ise uzun tablolarda satır başlıklarının değerlerden ayrılmasıydı.',
 'Üst bütçe 1.800.000 Türk lirasıydı. Gerçekleşen harcama 1.560.000 Türk lirası oldu.',
 'Sahil şubesinde 47 dakika süren elektrik kesintisi yaşandı, yerel dosyalarda kayıp saptanmadı.',
 'Özetler incelenmeden genel yaygınlaştırmaya izin verilmeyeceği açıklandı.'
].join(' ');
const exactNums=source=>new Set(source.match(/\d+(?:[.,]\d+)*/gu)||[]);
test('binlik ayırıcı sayı ve para tutarı cümle içinden kaybolmaz',()=>{
 const input='Üst bütçe 1.800.000 Türk lirasıydı. Harcama 1.560.000 Türk lirası oldu.';
 assert.deepEqual(splitSentences(input),[
  'Üst bütçe 1.800.000 Türk lirasıydı.','Harcama 1.560.000 Türk lirası oldu.'
 ]);
 assert.equal(wordCount('1.800.000 TL ve 1.560.000 TL'),5);
});
test('ondalık, yüzde, tarih, para ve saat ifadeleri nokta yüzünden kesilmez',()=>{
 const source='Başarı %92,5 oldu. Tarih 31.12.2026 olarak yazıldı. Saat 14.30 olarak duyuruldu. Ölçüm 4.1 saniyeydi. Bütçe ₺1.800.000,50 idi.';
 const rows=splitSentences(source);
 assert.equal(rows.length,5);
 assert.ok(rows[0].includes('%92,5'));
 assert.ok(rows[1].includes('31.12.2026'));
 assert.ok(rows[2].includes('14.30'));
 assert.ok(rows[3].includes('4.1'));
 assert.ok(rows[4].includes('1.800.000,50'));
});
test('sayısal ifadeler tek kelime ve token olarak kalır',()=>{
 const values=wordTokens('2.400 1.800.000 4,1 31.12.2026 1.500,75');
 assert.deepEqual(values,['2.400','1.800.000','4,1','31.12.2026','1.500,75']);
 assert.equal(wordCount('2.400 görev ve 480 gönüllü'),5);
});
test('başlıktaki 1. numarası kaynak cümlesinden ayrılmaz',()=>{
 const rows=splitSentences('1. YÖNETİCİ ÖZETİ VE HEDEF\nDenizkent Belediyesi bir pilot hazırladı.');
 assert.equal(rows.length,2);
 assert.equal(rows[0],'1. YÖNETİCİ ÖZETİ VE HEDEF');
});
test('unvan ve kurum kısaltmaları cümleyi yanlış bölmez',()=>{
 const rows=splitSentences('Dr. Ayşe T.C. kurumundan belge aldı. Sonuç açıklandı.');
 assert.equal(rows.length,2);
 assert.equal(rows[0],'Dr. Ayşe T.C. kurumundan belge aldı.');
});
test('mevcut cümle ayırma ve satır sonu davranışı korunur',()=>{
 assert.deepEqual(splitSentences('Birinci. İkinci! Üçüncü'),['Birinci.','İkinci!','Üçüncü']);
 assert.deepEqual(splitSentences('Birinci satır\nİkinci satır'),['Birinci satır','İkinci satır']);
});
test('orijinal kaynaktaki numeric tokenlar üretimde bozulmaz',()=>{
 for(const targetWords of [10,100,1000]){
  const result=analyzeText(corpus,{title:'Denizkent kütüphane pilotu',targetWords});
  const sourceNums=exactNums(corpus);
  for(const n of exactNums(result.text)){
   assert.ok(sourceNums.has(n),'Özet kaynakta olmayan sayıyı üretti: '+n);
  }
  assert.ok(result.actualWords<=targetWords);
  assert.ok(!/(?:^|\s)000 Türk lirası/u.test(result.text));
 }
});
test('10 kelimelik özet pilot/kütüphane ana konusuna bağlıdır',()=>{
 const result=analyzeText(corpus,{title:'Denizkent kütüphane pilotu',targetWords:10});
 assert.match(result.text,/(?:Pilotun|kütüphane)/iu);
 assert.doesNotMatch(result.text,/^Üçüncü tür/u);
 assert.ok(result.actualWords>0&&result.actualWords<=10);
});
test('100 kelimelik özet 3 farklı belge bölgesiyle konu kurar',()=>{
 const r=analyzeText(corpus,{title:'Denizkent kütüphane pilotu',targetWords:100});
 assert.ok(r.actualWords<=100);
 assert.ok(r.actualWords>=20);
 assert.match(r.text,/Denizkent|Pilotun|kütüphane/iu);
});
test('1000 kelimelik bütçe küçük kaynağı uydurup genişletmez',()=>{
 const r=analyzeText(corpus,{targetWords:1000});
 assert.equal(r.text,corpus);
 assert.equal(r.actualWords,wordCount(corpus));
});
test('Windows masaüstü TextRank de bütün sayıların provenance zincirini korur',()=>{
 const r=createDesktopSummary(corpus,{title:'Denizkent kütüphane pilotu',targetWords:100});
 for(const n of exactNums(r.text))assert.ok(exactNums(corpus).has(n),n);
 assert.ok(r.actualWords<=100);
});
test('kaynak sayı uzunluğu ve özet kısaltma sırası korunur',()=>{
 const original='Üst bütçe 1.800.000 TL oldu. Harcama 1.560.000 TL gerçekleşti.';
 const result=summarizeExtractive(original,10);
 assert.ok(result.actualWords<=10);
 for(const n of exactNums(result.text))assert.ok(exactNums(original).has(n));
});
