/* Uzantı yan panelinde isteğe bağlı yerel model çalıştırma köprüsü.
 * Her iş ayrı Worker üzerinde; iptal Worker.terminate() ile kesinleştirilir.
 * Bu yol model kurulu değilken sahte üretim gerçekleştirmez.
 */
import {browserModelStatus} from './browser-model-store.mjs';

function failure(code){const error=new Error(code);error.code=code;return error;}
export async function localModelStatus(getURL=path=>chrome.runtime.getURL(path),fetcher=fetch){
 try{
  const response=await fetcher(getURL('models/model-manifest.json'),{cache:'no-store'});
  if(!response.ok)throw new Error('PACKAGED_MODEL_NOT_INSTALLED');
  const manifest=await response.json();
  if(manifest.modelId!=='onnx-community/Qwen3-0.6B-Instruct-ONNX'||manifest.installation!=='user-consented-local')return {ready:false,code:'MODEL_MANIFEST_INVALID'};
  const present=manifest.backends||[];
  return {ready:present.length>0,backends:present,modelId:manifest.modelId,license:manifest.license,revision:manifest.revision};
 }catch{
  try{
   const browser=await browserModelStatus();
   if(browser.ready)return {ready:true,source:'browser-opfs',backends:[browser.backend],
    modelId:browser.record.id,license:browser.record.license,revision:browser.revision,
    warning:'Model dosyaları kayıtlı; gerçek ONNX inference ayrıca kabul edilmeli.'};
  }catch{}
  return {ready:false,code:'MODEL_NOT_INSTALLED'};
 }
}
export function runLocalModel(request,{signal,onProgress=()=>{},workerFactory=()=>new Worker(new URL('../worker/local-model-worker.mjs',import.meta.url),{type:'module'}),getURL=path=>chrome.runtime.getURL(path)}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(failure('AbortError'));return;}
  let worker,settled=false;
  const jobId=Date.now()+Math.floor(Math.random()*100000);
  const finish=(err,result)=>{
   if(settled)return;
   settled=true;
   signal?.removeEventListener('abort',abort);
   worker?.terminate();
   if(err)reject(err);else resolve(result);
  };
  const abort=()=>finish(failure('AbortError'));
  try{
   worker=workerFactory();
   signal?.addEventListener('abort',abort,{once:true});
   worker.onerror=e=>finish(failure('MODEL_WORKER_ERROR: '+(e.message||'Worker başlatılamadı')));
   worker.onmessage=e=>{
    const msg=e.data;
    if(msg?.jobId!==jobId||settled)return;
    if(msg.type==='loading'||msg.type==='plan'||msg.type==='stream')onProgress(msg);
    if(msg.type==='done')finish(null,msg.result);
    if(msg.type==='error')finish(failure(msg.code||'MODEL_GENERATION_FAILED'));
   };
   Promise.resolve().then(()=>browserModelStatus()).catch(()=>null).then(browser=>{
   if(settled)return;
   worker.postMessage({
    browserRecord:browser?.ready?browser.record:null,
    type:'GENERATE',jobId,
    urls:{
     modelBase:getURL('models/'),
     manifest:getURL('models/model-manifest.json'),
     wasmBase:getURL('vendor/ort/')
    },
    preference:request.preference||'auto',
    request:{
     title:String(request.title||'').slice(0,300),
     text:String(request.text||'').slice(0,260000),
     targetWords:request.targetWords,
     difficulty:request.difficulty,
     maxChars:request.maxChars||3500
    }
   });
   }).catch(e=>finish(e));
  }catch(e){finish(e);}
 });
}
