import test from 'node:test';
import assert from 'node:assert/strict';
import {planChunks,createGenerationPlan,runGenerativePlan,chooseTokenLimit} from '../shared/generative-plan.mjs';
import {localModelStatus,runLocalModel} from '../shared/local-model-bridge.mjs';

const source = Array.from({length:40},(_,i)=>
  'Bölüm '+i+' kapsamında sistem yerel olarak çalışır. Model kullanımı açık onay ve kaynak doğruluğu gerektirir.').join('\n');

test('bağlam boyutuna göre birden çok ayrı kaynak bölümü ve kimlik üretir',()=>{
 const parts=planChunks(source,{maxChars:330});
 assert.ok(parts.length>2);
 assert.equal(parts[0].id,'C001');
 assert.ok(parts.every(p=>p.text.length<=330&&p.words>0));
 assert.ok(parts.every((p,i)=>i===0||p.startChar>=parts[i-1].startChar));
});
test('çok uzun kelime/satır bile bağlamı aşmaz',()=>{
 const parts=planChunks('a'.repeat(3000),{maxChars:400});
 assert.ok(parts.length>1);
 assert.ok(parts.every(p=>p.text.length<=400));
});
test('model planı yalnızca 10 100 1000 bütçeleri ve geçerli düzeyi kabul eder',()=>{
 assert.throws(()=>createGenerationPlan(source,{targetWords:99}),/INVALID/);
 assert.throws(()=>createGenerationPlan(source,{difficulty:'fake'}),/INVALID/);
 assert.ok(chooseTokenLimit(100,'reduce')>0);
});
test('yalnızca model runner gerçek metin üretebilir; yoksa hata',async()=>{
 const p=createGenerationPlan(source,{targetWords:100,maxChars:600});
 await assert.rejects(runGenerativePlan(p),/MODEL_RUNNER_UNAVAILABLE/);
});
test('üretken çok parçalı özet map-reduce ve kaynak izlerini korur',async()=>{
 const p=createGenerationPlan(source,{targetWords:100,maxChars:850});
 let calls=0;const phases=[];
 const result=await runGenerativePlan(p,{runner:{async generate(prompt,{maxNewTokens,onToken}){
  calls++;
  assert.ok(maxNewTokens>0);
  const stage=prompt.includes('önceki pasaj özetlerini')?'reduce':'map';
  phases.push(stage);
  onToken('Örnek ');onToken('özet.');
  return 'Örnek özet.';
 }}});
 assert.equal(result.engine,'local-onnx-generative');
 assert.ok(calls>=p.chunks.length);
 assert.ok(phases.includes('reduce'));
 assert.equal(result.provenance.length,p.chunks.length);
 assert.ok(result.sections[0].sourceIds.length>1);
 assert.ok(result.warnings.some(s=>s.startsWith('MODEL_OUTPUT_UNVERIFIED')));
});
test('1000 kelime derin çıktı pasajları tek tek kimliklendirir',async()=>{
 const p=createGenerationPlan(source,{targetWords:1000,maxChars:850});
 const result=await runGenerativePlan(p,{runner:{async generate(){return 'Kaynak temelli kısa nokta.';}}});
 assert.ok(result.sections.length>1);
 assert.match(result.text,/\[C001\]/);
});
test('iptal edilmiş sinyalde model çağrılmaz',async()=>{
 const p=createGenerationPlan(source,{targetWords:10,maxChars:900});
 const ctl=new AbortController();ctl.abort();
 await assert.rejects(runGenerativePlan(p,{runner:{async generate(){throw Error('never');}},signal:ctl.signal}),/Abort/);
});
test('kurulu olmayan model açık durum bildirir',async()=>{
 const s=await localModelStatus(()=>'chrome-extension://abc/models/model-manifest.json',async()=>({ok:false}));
 assert.equal(s.ready,false);
 assert.equal(s.code,'MODEL_NOT_INSTALLED');
});
test('model köprüsü streaming ve nihai çıktıyı ayırır, worker sonlanır',async()=>{
 let w,closed=false;
 const workerFactory=()=>{
  w={terminate(){closed=true},postMessage(msg){
   queueMicrotask(()=>{
    w.onmessage({data:{type:'stream',jobId:msg.jobId,text:'kısmi'}});
    w.onmessage({data:{type:'done',jobId:msg.jobId,result:{text:'tam özet'}}});
   });
  }};return w;
 };
 let updates=0;
 const value=await runLocalModel({text:'Kaynak',targetWords:10,difficulty:'medium'},{workerFactory,getURL:s=>s,onProgress:()=>updates++});
 assert.equal(value.text,'tam özet');
 assert.equal(updates,1);
 assert.ok(closed);
});
test('model köprüsü iptal edildiğinde çalışanı durdurur',async()=>{
 let closed=false;
 const ctl=new AbortController();
 const pending=runLocalModel({text:'Kaynak',targetWords:10,difficulty:'medium'},{
  signal:ctl.signal,workerFactory:()=>({postMessage(){},terminate(){closed=true;}}),getURL:x=>x
 });
 ctl.abort();
 await assert.rejects(pending,/AbortError/);
 assert.ok(closed);
});
