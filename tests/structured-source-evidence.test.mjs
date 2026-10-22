import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseDocumentStructure,summarizeStructured} from '../shared/structured-extractive.mjs';
import {createDesktopSummary} from '../desktop/summary-core.mjs';
import {normalizeText,wordCount} from '../shared/summarize.mjs';
import {evaluateSummarySet} from '../scripts/yerel-ozet-regresyon.mjs';

const fixture=new URL('./fixtures/okulens-kurgusal-kutuphane-raporu.txt',import.meta.url);
const referenceSha='9972fdbbb651f6ac52830a903ae6fe99c52e50ac77b6663ff8b5128309ed97db';
async function source(){return readFile(fixture,'utf8');}
test('özgün 1.926 kelimelik kurgusal kaynak tam SHA ile aynı',async()=>{
 const bytes=await readFile(fixture);
 assert.equal(bytes.length,16526);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),referenceSha);
 assert.equal(wordCount(bytes.toString('utf8')),1926);
});
test('numaralı 13 bölüm ve meta değerlendirme metinlerini ayırır',async()=>{
 const parsed=parseDocumentStructure(await source());
 assert.equal(parsed.structured,true);
 assert.ok(parsed.sections.some(s=>s.role==='overview'));
 assert.ok(parsed.sections.some(s=>s.role==='participants'));
 assert.ok(parsed.sections.some(s=>s.role==='measurement'));
 assert.ok(parsed.sections.some(s=>s.role==='budget'));
 assert.ok(parsed.sections.some(s=>s.role==='fidelity'));
 assert.ok(parsed.sections.some(s=>s.role==='decision'));
 const tail=parsed.sections.find(s=>s.id===13);
 assert.equal(tail.role,'meta');
});
test('10 kelimelik sonuç, pilot ve çevrimdışı kütüphane konusuna bağlanır',async()=>{
 const r=createDesktopSummary(await source(),{targetWords:10});
 assert.ok(r.actualWords>0&&r.actualWords<=10);
 assert.match(r.text,/Denizkent Belediyesi/u);
 assert.match(r.text,/kütüphane/iu);
 assert.match(r.text,/çevrimdışı/iu);
 assert.doesNotMatch(r.text,/^Üçüncü tür/u);
 assert.equal(r.engine,'hybrid-extractive');
});
test('100 kelime kaynak gerçek sonuçları ve yaygınlaştırma kararını taşır',async()=>{
 const r=createDesktopSummary(await source(),{targetWords:100});
 assert.ok(r.actualWords<=100);
 assert.match(r.text,/Denizkent/iu);
 assert.match(r.text,/480/u);
 assert.match(r.text,/4,1/u);
 assert.match(r.text,/2,7/u);
 assert.match(r.text,/184/u);
 assert.match(r.text,/16/u);
 assert.match(r.text,/(?:yaygınlaştırma|onayı)/iu);
 assert.doesNotMatch(r.text,/Bu metnin kısa özetinde/iu);
});
test('1000 kelimede bütçe, kaynak doğruluğu, risk ve kararlar bulunur',async()=>{
 const r=createDesktopSummary(await source(),{targetWords:1000});
 assert.ok(r.actualWords<=1000);
 assert.ok(r.actualWords>750);
 for(const n of ['480','2.400','184','16','4,1','2,7','1.800.000','1.560.000','47'])
  assert.ok(r.text.includes(n),'Eksik sayı: '+n);
 assert.ok(r.sectionsRepresented>=8);
 assert.match(r.text,/yaygınlaştırma/iu);
 assert.doesNotMatch(r.text,/Bu metnin kısa özetinde/iu);
 assert.doesNotMatch(r.text,/Uzun özet beklentisinde/iu);
});
test('her seçilen cümlenin kaynak karakterleri birebir doğrulanabilir',async()=>{
 const raw=await source(),clean=normalizeText(raw);
 for(const targetWords of [10,100,1000]){
  const r=createDesktopSummary(raw,{targetWords});
  assert.ok(r.sourceEvidence.length>0);
  let previousEnd=-1;
  for(const entry of r.sourceEvidence){
   assert.ok(entry.startChar>=0 && entry.endChar>entry.startChar);
   assert.ok(entry.startChar>=previousEnd);
   previousEnd=entry.endChar;
   const quotation=clean.slice(entry.startChar,entry.endChar);
   assert.ok(r.text.includes(quotation));
   for(const n of entry.numbers)assert.ok(quotation.includes(n));
   assert.notEqual(entry.sectionId,13);
   assert.notEqual(entry.role,'meta');
  }
  assert.equal(r.numericProvenancePass,true);
 }
});
test('denetim verisi kaynak metnini değil yalnız kanıt aralıklarını kaydeder',async()=>{
 const report=evaluateSummarySet(await source(),{title:'OkuLens kurgusal test'});
 assert.equal(report.length,3);
 for(const r of report){
  assert.equal(r.modelInference,'NOT_TESTED');
  assert.equal(r.qualityDecision,'HOLD');
  assert.ok(r.withinWordBudget);
  assert.ok(r.sourceEvidence.length>0);
  assert.equal(r.sourceFormat,'normalized');
  assert.ok(!r.sourceEvidence.some(x=>'text' in x));
 }
});
test('başlıksız kısa metinde eski çıkarımsal algoritma korunur',()=>{
 const s='Pilot konusu hakkında kısa bir açıklamadır. İkinci cümle kaynak bilgi verir.';
 assert.equal(parseDocumentStructure(s).structured,false);
 assert.equal(summarizeStructured(s,{targetWords:10}),null);
 const result=createDesktopSummary(s,{targetWords:100});
 assert.equal(result.text,s);
});
test('metindeki sayılar kaynaktan olmayan hanelerle yeniden yazılmaz',async()=>{
 const raw=await source();
 for(const targetWords of [10,100,1000]){
  const r=createDesktopSummary(raw,{targetWords});
  assert.deepEqual(r.unexpectedNumbers,[]);
  assert.doesNotMatch(r.text,/(?:^|\s)000 Türk lirası/u);
 }
});
