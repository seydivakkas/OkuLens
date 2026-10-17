import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, wordCount, splitSentences, summarizeExtractive } from '../shared/summarize.mjs';

test('Türkçe tokenları sayar', () => { assert.equal(wordCount('İstanbul’dan açık-kaynak dünyasına 3 yeni araç'), 6); });
test('Görünmez karakterleri temizler', () => { assert.equal(normalizeText('A\u200Bb\n\n\n c'), 'Ab\n\n c'); });
test('Boş metinde sonuç boş', () => { assert.equal(summarizeExtractive('   ', 100).actualWords, 0); });
test('Kaynak kısa ise metni uydurmadan geri verir', () => {
  const r = summarizeExtractive('Çok kısa bir kaynak.', 100);
  assert.equal(r.text, 'Çok kısa bir kaynak.');
});
test('10 kelime bütçesi aşılmaz', () => {
  const src = Array.from({length: 40}, (_,i)=>`Deneme ${i} algoritma kaynak bağıntısı ve özet kalite ölçümü yapar.`).join(' ');
  const r = summarizeExtractive(src, 10);
  assert.ok(r.actualWords <= 10);
  assert.ok(r.actualWords > 0);
});
test('100 kelime bütçesi aşılmaz', () => {
  const src = Array.from({length: 40}, (_,i)=>`Deneme ${i} algoritma kaynak bağıntısı ve özet kalite ölçümü yapar.`).join(' ');
  const r = summarizeExtractive(src, 100);
  assert.ok(r.actualWords <= 100);
});
test('Cümle ayırma son cümleyi tutar', () => { assert.deepEqual(splitSentences('Birinci. İkinci! Üçüncü'), ['Birinci.', 'İkinci!', 'Üçüncü']); });
