import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesktopSummary,splitDesktopSections,DESKTOP_MAX_CHARS} from '../desktop/summary-core.mjs';
import {analyzeText} from '../shared/hybrid-nlp.mjs';
import {normalizeText,wordCount} from '../shared/summarize.mjs';
import {runDesktopExtractive} from '../desktop/extractive-client.mjs';

test('18 kelimelik metni 100 kelime bütçesinde sebepsiz tek cümleye indirmez',()=>{
 const src='mustafa kemal atatürk kendisi çok bir mimar. okul hayatı boyunca çalışmış, tüm savaşları kazanmış mücadele yılları zor geçmiş.';
 const result=createDesktopSummary(src,{targetWords:100});
 assert.equal(result.text,normalizeText(src));
 assert.equal(result.actualWords,wordCount(src));
});
test('10 kelime bütçesi kısa metinde sınırı aşmaz; üretken düzeltme yapmaz',()=>{
 const src='Birinci cümle uzun bir cümledir. İkinci cümle farklı bir bilgiyi açıklar. Üçüncü cümle sonradan yazılır.';
 const result=createDesktopSummary(src,{targetWords:10});
 assert.ok(result.actualWords<=10);
 assert.equal(result.engine,'hybrid-extractive');
});
test('100 kelimelik uzun kaynakta ilk, orta ve son bölgeden bilgi aranır',()=>{
 const a=Array.from({length:12},(_,i)=>'Giriş bölümünde yerel kaynak belgeleri '+i+' güvenle yönetilir.').join(' ');
 const b=Array.from({length:12},(_,i)=>'Orta bölümünde ağ kesildiğinde işlemler '+i+' durmadan sürer.').join(' ');
 const c=Array.from({length:12},(_,i)=>'Son bölümünde çıktılar '+i+' bağımsız doğrulanır.').join(' ');
 const r=analyzeText(a+' '+b+' '+c,{targetWords:100});
 assert.ok(r.actualWords<=100);
 assert.match(r.text,/Giriş/);
 assert.match(r.text,/Orta/);
 assert.match(r.text,/Son/);
});
test('260 bin karakteri aşan TXT belgesini ilk parçaya sessizce kırpmaz',()=>{
 const piece=i=>'Bölüm '+i+' önemli yerel belge içeriğidir. Kayıt '+i+' kaynağa bağlı kalır.\n';
 const src=Array.from({length:5500},(_,i)=>piece(i)).join('');
 assert.ok(src.length>260000);
 assert.ok(src.length<DESKTOP_MAX_CHARS);
 const result=createDesktopSummary(src,{targetWords:100});
 assert.ok(result.sourceSections>=3);
 assert.equal(result.processedChars,normalizeText(src).length);
 assert.ok(result.actualWords>0&&result.actualWords<=100);
 assert.ok(result.warnings.some(x=>x.includes('tamamında incelendi')));
});
test('2 MiB karakter sınırında sessiz kırpma yerine açık hata',()=>{
 assert.throws(()=>createDesktopSummary('X'.repeat(DESKTOP_MAX_CHARS+1),{targetWords:100}),
  /DESKTOP_SOURCE_TOO_LARGE/);
});
test('bölüm sınırları tüm karakterleri kayıpsız kapsar',()=>{
 const src=Array.from({length:500},(_,i)=>'Bölüm '+i+' karar kaydı. ').join('');
 const rows=splitDesktopSections(src,1100);
 assert.ok(rows.length>=2);
 assert.equal(rows[0].startChar,0);
 assert.equal(rows.at(-1).endChar,src.length);
 for(let i=1;i<rows.length;i++)assert.equal(rows[i-1].endChar,rows[i].startChar);
});
test('TextRank Worker gerçek sonucu ile döner, iş bitince sonlandırılır',async()=>{
 let worker,terminated=false;
 const p=runDesktopExtractive('Kısa kaynak.',{targetWords:100},{
  workerFactory:()=>{
   worker={terminate(){terminated=true},postMessage(msg){
    queueMicrotask(()=>worker.onmessage({data:{jobId:msg.jobId,type:'done',
     result:{text:'Kısa kaynak.',actualWords:2,sourceSections:1}}}));
   }};return worker;
  }
 });
 assert.equal((await p).text,'Kısa kaynak.');
 assert.equal(terminated,true);
});
test('TextRank Worker iptal ve hata için sahte başarılı sonuç oluşturmaz',async()=>{
 const controller=new AbortController();let stopped=false;
 const p=runDesktopExtractive('Deneme.',{targetWords:10},{signal:controller.signal,
  workerFactory:()=>({postMessage(){},terminate(){stopped=true;}})});
 controller.abort();
 await assert.rejects(p,/AbortError/);
 assert.equal(stopped,true);
 await assert.rejects(runDesktopExtractive('Deneme.',{targetWords:10},{
  workerFactory:()=>({terminate(){},postMessage(msg){
   queueMicrotask(()=>this.onmessage({data:{jobId:msg.jobId,type:'error',code:'SOURCE_FAILED'}}));
  }})
 }),/SOURCE_FAILED/);
});
test('Windows dosya açma IPC eski 260k sınırını kaldırdı',async()=>{
 const {readFile}=await import('node:fs/promises');
 const main=await readFile(new URL('../desktop/main.cjs',import.meta.url),'utf8');
 const html=await readFile(new URL('../desktop/index.html',import.meta.url),'utf8');
 const renderer=await readFile(new URL('../desktop/renderer.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(main,/METIN_EN_FAZLA_260000_KARAKTER/);
 assert.match(main,/METIN_EN_FAZLA_2_MIB_KARAKTER/);
 assert.match(html,/maxlength="2097152"/);
 assert.match(renderer,/if\(opened\)await summarizeNow\(\{fileAuto:true\}\)/);
 assert.match(html,/id="model-settings"/);
});
