import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSummarySet} from '../scripts/yerel-ozet-regresyon.mjs';
const doc=[
 'Denizkent Belediyesi üç mahalle kütüphanesinde çevrimdışı çalışan belge özetleme pilotu düzenledi.',
 'Pilotun uygulandığı üç nokta Merkez, Sahil ve Üniversite mahalle kütüphaneleriydi.',
 'Çalışmaya 480 gönüllü kullanıcı katıldı ve 2.400 arama görevi değerlendirildi.',
 'Önceki işlem süresi 4,1 saniyeydi. Yeni işlem süresi 2,7 saniyeye indi.',
 'Kaynak sadakati ölçümünde 200 örneğin 184 tanesi testi geçti.',
 'Üst bütçe 1.800.000 Türk lirasıydı. Toplam harcama 1.560.000 Türk lirası oldu.',
 'Bu metnin sonundaki ayrıntı yalnızca bir değerlendirme örneğidir.'
].join(' ');
test('yerel rapor 10/100/1000 çıktıları üretir ve engine/model iddiası uydurmaz',()=>{
 const results=evaluateSummarySet(doc,{title:'Kütüphane pilot raporu'});
 assert.deepEqual(results.map(x=>x.targetWords),[10,100,1000]);
 assert.ok(results.every(x=>x.withinWordBudget));
 assert.ok(results.every(x=>x.numericProvenancePass));
 assert.ok(results.every(x=>x.qualityDecision==='HOLD'));
 assert.ok(results.every(x=>x.modelInference==='NOT_TESTED'));
 assert.ok(results.every(x=>x.output?.length>0));
});
test('yerel raporda noktalı sayı parçaları yeni sonuç olarak görünmez',()=>{
 const outputs=evaluateSummarySet(doc);
 assert.ok(outputs.every(x=>!/(?:^|\s)000 Türk lirası/.test(x.output)));
 assert.equal(outputs[2].output,doc);
});
