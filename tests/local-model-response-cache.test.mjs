import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalModelCache} from '../shared/local-model-response-cache.mjs';
import {preflightLocalModel} from '../shared/local-model-bridge.mjs';

const prefix='chrome-extension://testabc123/models/';
const modelId='onnx-community/Qwen3-0.6B-Instruct-ONNX';
const allowedPaths=['config.json','tokenizer.json','onnx/model_q4f16.onnx'];
function makeCache(){
 const reads=[];
 const cache=createLocalModelCache({
  modelBase:prefix,modelId,allowedPaths,
  loadFile:async path=>{reads.push(path);return new Response(path,{status:200});}
 });
 return {cache,reads};
}
test('yerel OPFS model URL anahtarı config / tokenizer / ONNX olarak çözümlenir',async()=>{
 const {cache,reads}=makeCache();
 for(const path of allowedPaths){
  const r=await cache.customCache.match(cache.modelPrefix+path);
  assert.equal(await r.text(),path);
 }
 assert.deepEqual(reads,allowedPaths);
 assert.equal(cache.stats.hits,3);
});
test('Request nesnesi ve sorgu parametresi cache anahtarında desteklenir',async()=>{
 const {cache}=makeCache();
 const r=await cache.customCache.match({url:cache.modelPrefix+'config.json?revision=fixed'});
 assert.equal(await r.text(),'config.json');
});
test('HTTPS kaynak isteği Worker içinde reddedilir, delegate çağrılmaz',async()=>{
 const {cache}=makeCache();let network=0;
 await assert.rejects(cache.guardedFetch('https://huggingface.co/some-model',{},()=>{
  network++;return {};
 }),/RUNTIME_REMOTE_FETCH_FORBIDDEN/);
 assert.equal(network,0);
 assert.equal(cache.stats.rejectedRemote,1);
});
test('başka extension kimliği model yükleme yetkisi alamaz',async()=>{
 const {cache}=makeCache();
 const url='chrome-extension://attacker/models/'+modelId+'/config.json';
 assert.equal(await cache.customCache.match(url),undefined);
 await assert.rejects(cache.guardedFetch(url,{},()=>({})),/INVALID_MODEL_ASSET_URL/);
});
test('OPFS listesinde olmayan model ağırlığı fail closed',async()=>{
 const {cache}=makeCache();
 await assert.rejects(
  cache.guardedFetch(cache.modelPrefix+'onnx/model_fp16.onnx',{},()=>({})),
  /LOCAL_MODEL_ASSET_NOT_LISTED/);
});
test('paket içi farklı extension dosyasını yerel delegate'e bırakır',async()=>{
 const {cache}=makeCache();let seen='';
 const value=await cache.guardedFetch('chrome-extension://testabc123/vendor/ort/ort.wasm',{},
  url=>{seen=url;return new Response('wasm',{status:200});});
 assert.equal(seen,'chrome-extension://testabc123/vendor/ort/ort.wasm');
 assert.equal(await value.text(),'wasm');
});
test('customCache put uzaktan gelen yanıtı kaydetmez',async()=>{
 const {cache}=makeCache();
 await assert.rejects(cache.customCache.put('x',new Response('')),/LOCAL_MODEL_CACHE_READ_ONLY/);
});
test('Worker OPFS ön kontrolünde gerçek model çağrısı olmadan dosya raporu gelir',async()=>{
 let worker,terminated=false;
 const state={ready:true,record:{revision:'rev',files:[{path:'config.json'}]}};
 const task=preflightLocalModel({
  findBrowserModel:async()=>state,getURL:path=>prefix+path,
  workerFactory:()=>{
   worker={terminate(){terminated=true},postMessage(msg){
    assert.equal(msg.type,'PREFLIGHT');
    assert.equal(msg.browserRecord,state.record);
    queueMicrotask(()=>worker.onmessage({data:{jobId:msg.jobId,type:'preflight',
     result:{stage:'PREFLIGHT_FILES_READABLE',checkedFiles:1}}}));
   }};return worker;
  }
 });
 const result=await task;
 assert.equal(result.stage,'PREFLIGHT_FILES_READABLE');
 assert.equal(result.checkedFiles,1);
 assert.equal(terminated,true);
});
test('kurulum kaydı yoksa Worker ön kontrolü başlamaz',async()=>{
 let called=false;
 await assert.rejects(
  preflightLocalModel({findBrowserModel:async()=>({ready:false}),
   workerFactory:()=>({postMessage(){called=true},terminate(){}}),getURL:path=>path}),
  /BROWSER_OPFS_MODEL_NOT_INSTALLED/);
 assert.equal(called,false);
});
test('ön test iptal edilirse Worker kesin sonlandırılır',async()=>{
 let terminated=false;
 const ctl=new AbortController();
 const task=preflightLocalModel({signal:ctl.signal,
  findBrowserModel:async()=>({ready:true,record:{files:[]}}),
  workerFactory:()=>({postMessage(){},terminate(){terminated=true;}}),getURL:p=>p
 });
 ctl.abort();
 await assert.rejects(task,/AbortError/);
 assert.equal(terminated,true);
});
