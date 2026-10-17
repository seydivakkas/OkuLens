import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText } from '../shared/hybrid-nlp.mjs';
const text = Array.from({length:40},(_,i)=>`Paragraf ${i+1} kapsamında yerel işlem mimarisi ve veri güvenliği için açık bir kanıt yolu incelenir. Kullanıcı seçtiği metne ait anlamlı sonuçları bekler.`).join('\n');
test('hibrit analiz bütçeyi aşmaz ve puanlı cümle döndürür',()=>{
  for(const budget of [10,100,1000]){const result=analyzeText(text,{title:'Veri güvenliği',targetWords:budget});assert.ok(result.actualWords<=budget);assert.ok(result.topSentences.length>0);assert.ok(result.sections>0);}
});
test('boş veri güvenli işlenir',()=>{const r=analyzeText('');assert.equal(r.actualWords,0);assert.equal(r.topSentences.length,0)});
test('kısa kaynak 1000 kelimeye yapay olarak genişletilmez',()=>{const r=analyzeText('Kısa bir kaynak metin burada bulunuyor.',{targetWords:1000});assert.ok(r.actualWords<1000)});
