import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesktopSummary,DESKTOP_TARGETS,DESKTOP_MAX_CHARS} from '../desktop/summary-core.mjs';
import {wordCount} from '../shared/summarize.mjs';

const source=Array.from({length:55},(_,i)=>
 'Bölüm '+i+' yerel belge özetleme işlemini internet olmadan gerçekleştirir. '+
 'Kaynak metnin doğruluğu ayrıca incelenmelidir.').join('\n');

test('Windows P0 10,100,1000 yerel kelime hedefleriyle kaynak temelli özet üretir',()=>{
 for(const n of DESKTOP_TARGETS){
  const result=createDesktopSummary(source,{title:'Yerel özetleme',targetWords:n});
  assert.ok(result.actualWords>0);
  assert.ok(result.actualWords<=n);
  assert.equal(result.actualWords,wordCount(result.text));
  assert.ok(['hybrid-extractive','extractive'].includes(result.engine));
  assert.doesNotMatch(result.engine,/onnx|remote|cloud|generative/i);
 }
});
test('metin çok kısa ise kaynak uydurmadan aynen korunur',()=>{
 const result=createDesktopSummary('Bu kısa kaynak.',{targetWords:100});
 assert.equal(result.text,'Bu kısa kaynak.');
 assert.equal(result.actualWords,3);
});
test('iki kelimelik kaynak hibrit seçici boş verse bile saklanır',()=>{
 const result=createDesktopSummary('Merhaba dünya.',{targetWords:10});
 assert.equal(result.text,'Merhaba dünya.');
 assert.equal(result.engine,'extractive');
});
test('boş kaynak kabul edilmez',()=>{
 assert.throws(()=>createDesktopSummary('  '),/DESKTOP_EMPTY_SOURCE/);
});
test('yalnız 10,100,1000 kelime hedefleri kabul edilir',()=>{
 assert.throws(()=>createDesktopSummary(source,{targetWords:50}),/DESKTOP_TARGET_INVALID/);
 assert.throws(()=>createDesktopSummary(source,{targetWords:'100'}),/DESKTOP_TARGET_INVALID/);
});
test('çok uzun kaynak bellek yükü oluşturmadan reddedilir',()=>{
 assert.throws(()=>createDesktopSummary('x'.repeat(DESKTOP_MAX_CHARS+1)),/DESKTOP_SOURCE_TOO_LARGE/);
});
test('kaynak yalnız gerçek metin olmalıdır',()=>{
 assert.throws(()=>createDesktopSummary({text:'kişisel veri'}),/DESKTOP_SOURCE_NOT_TEXT/);
});
test('Electron masaüstü güvenliği Node, IPC ve dış ağı sınırlıyor',async()=>{
 const fs=await import('node:fs/promises');
 const main=await fs.readFile(new URL('../desktop/main.cjs',import.meta.url),'utf8');
 const preload=await fs.readFile(new URL('../desktop/preload.cjs',import.meta.url),'utf8');
 const html=await fs.readFile(new URL('../desktop/index.html',import.meta.url),'utf8');
 assert.match(main,/nodeIntegration:false,contextIsolation:true,sandbox:true/);
 assert.match(main,/webSecurity:true/);
 assert.match(main,/setPermissionRequestHandler/);
 assert.match(main,/onBeforeRequest/);
 assert.match(main,/desktop:open-text/);
 assert.match(main,/desktop:save-summary/);
 assert.match(main,/validateSender/);
 assert.doesNotMatch(preload,/exposeInMainWorld\(['"]ipcRenderer/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<script[^>]+https?:\/\//);
});
