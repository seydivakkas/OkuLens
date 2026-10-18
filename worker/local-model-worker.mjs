/* Chrome/Edge extension worker: modeli SAYFA bağlamında değil, izole uzantıda çalıştırır.
 * Kullanıcı eylemiyle başlar. Uzaktan model/JS isteği KAPALI.
 */
import {createGenerationPlan,runGenerativePlan} from '../shared/generative-plan.mjs';
import {browserModelStatus,openBrowserModelResponse} from '../shared/browser-model-store.mjs';
import {STORE_KEY} from '../shared/browser-model-catalog.mjs';
import {createLocalModelCache} from '../shared/local-model-response-cache.mjs';
const ID='onnx-community/Qwen3-0.6B-Instruct-ONNX';
const WEIGHT_SHAS={
 'onnx/model_q4f16.onnx':'4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d',
 'onnx/model_q4.onnx':'a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d'
};
let runtime,model,loadedBackend,activeJob=null;
function notify(jobId,type,payload={}){postMessage({jobId,type,...payload});}
async function prepare(urls,preference,jobId,browserRecord){
 if(!runtime){
  try{runtime=await import('../vendor/transformers.runtime.mjs');}
  catch{throw new Error('RUNTIME_NOT_BUILT: npm run build:runtime gerekli.');}
 }
 let manifest;
 let browserDeps=null;
 if(browserRecord){
  // Dedicated Worker uzantı chrome.storage API'lerini kullanabilir varsayılmaz;
  // sayfanın doğruladığı küçük manifest kayıt olarak taşınır.
  browserDeps={storage:navigator.storage,local:{get:async()=>({[STORE_KEY]:browserRecord})}};
  const info=await browserModelStatus(browserDeps);
  if(!info.ready)throw new Error('BROWSER_OPFS_MODEL_UNAVAILABLE: '+info.reason);
  manifest={modelId:ID,revision:info.revision,license:browserRecord.license,
   installation:'user-consented-local',backends:[info.backend],files:browserRecord.files};
 }else{
  const response=await fetch(urls.manifest,{cache:'no-store'});
  if(!response.ok)throw new Error('MODEL_NOT_INSTALLED: paket içinde veya OPFS deposunda model yok.');
  manifest=await response.json();
 }
 if(manifest.modelId!==ID||manifest.installation!=='user-consented-local'||manifest.license!=='Apache-2.0')throw new Error('MODEL_MANIFEST_INVALID');
 const candidates=preference==='webgpu'?['webgpu']:preference==='wasm'?['wasm']:['webgpu','wasm'];
 const selected=candidates.find(candidate=>{
  if(candidate==='webgpu'&&!navigator.gpu)return false;
  const file=candidate==='webgpu'?'onnx/model_q4f16.onnx':'onnx/model_q4.onnx';
  return manifest.backends?.includes(candidate)&&manifest.files?.some(item=>item.path===file&&item.sha256===WEIGHT_SHAS[file]);
 });
 if(!selected)throw new Error('MODEL_BACKEND_UNAVAILABLE: GPU/WASM model paketi hazır değil.');
 if(navigator.deviceMemory && navigator.deviceMemory<4)throw new Error('INSUFFICIENT_DEVICE_MEMORY');
 if(model&&loadedBackend===selected)return {selected,manifest};
 // Varsayılan tarayıcı ayarı uzaktan modellere yönelebilir: katı şekilde kapat.
 const {env,pipeline}=runtime;
 env.allowRemoteModels=false;
 env.allowLocalModels=true;
 env.localModelPath=urls.modelBase;
 env.useBrowserCache=false;
 if(browserDeps){
  // Uzantının OPFS manifestindeki dosyalarla sınırlı, gözlemlenebilir cache.
  // Metadata/ONNX URL eşleşmesi yoksa yerel dosya varmış gibi davranma.
  const adapter=createLocalModelCache({
   modelBase:urls.modelBase,modelId:ID,
   allowedPaths:browserRecord.files.map(x=>x.path),
   loadFile:relative=>openBrowserModelResponse(relative,{deps:browserDeps}),
   onEvent:event=>notify(jobId,'loading',{stage:'OPFS_FILE_READ',path:event.path})
  });
  env.useCustomCache=true;
  env.customCache=adapter.customCache;
  const originalFetch=globalThis.fetch.bind(globalThis);
  globalThis.fetch=(input,options)=>adapter.guardedFetch(input,options,originalFetch);
 }else{
  env.useCustomCache=false;env.customCache=null;
 }
 env.backends.onnx.wasm.wasmPaths=urls.wasmBase;
 notify(jobId,'loading',{stage:'MODEL_LOADING',backend:selected});
 model=await pipeline('text-generation',ID,{
   device:selected, dtype:selected==='webgpu'?'q4f16':'q4',
   progress_callback:event=>{
     if(event?.status==='progress')notify(jobId,'loading',{stage:'MODEL_LOADING',backend:selected,progress:event.progress});
   }
 });
 loadedBackend=selected;
 return {selected,manifest};
}
async function preflight(message){
 const {jobId,urls,browserRecord}=message;
 if(!browserRecord)throw new Error('BROWSER_OPFS_MODEL_NOT_INSTALLED');
 const deps={storage:navigator.storage,local:{get:async()=>({[STORE_KEY]:browserRecord})}};
 const status=await browserModelStatus(deps);
 if(!status.ready)throw new Error('BROWSER_OPFS_MODEL_UNAVAILABLE: '+status.reason);
 const paths=browserRecord.files.map(x=>x.path);
 const adapter=createLocalModelCache({
  modelBase:urls.modelBase,modelId:ID,allowedPaths:paths,
  loadFile:relative=>openBrowserModelResponse(relative,{deps})
 });
 // Dosyaların kullanıcı profili OPFS alanından gerçekten okunabilir olup olmadığını
 // Worker içinde sınar; ağır ONNX dosyasını belleğe almaz veya model başlatmaz.
 for(const path of paths){
  const key=adapter.modelPrefix+path;
  const result=await adapter.customCache.match(key);
  if(!result?.ok)throw new Error('PREFLIGHT_MODEL_RESPONSE_INVALID: '+path);
  const expected=browserRecord.files.find(x=>x.path===path);
  const size=Number(result.headers.get('Content-Length'));
  if(size!==expected.bytes)throw new Error('PREFLIGHT_MODEL_FILE_SIZE_MISMATCH: '+path);
 }
 notify(jobId,'preflight',{
  result:{stage:'PREFLIGHT_FILES_READABLE',modelId:ID,revision:browserRecord.revision,
   backend:status.backend,checkedFiles:paths.length,bytes:status.totalBytes,
   opfsCacheLookups:adapter.stats.lookups,opfsCacheHits:adapter.stats.hits,
   note:'Gerçek ONNX inference, model SHA tekrar hesaplama veya ağsız çalışma kanıtı DEĞİL.'}
 });
}
async function run(message){
 const {jobId,urls,preference,request}=message;
 if(activeJob)throw new Error('MODEL_BUSY');
 activeJob=jobId;
 try{
  const {selected,manifest}=await prepare(urls,preference,jobId,message.browserRecord);
  const plan=createGenerationPlan(request.text,{title:request.title,difficulty:request.difficulty,
    targetWords:request.targetWords,maxChars:request.maxChars||3500});
  notify(jobId,'plan',{parts:plan.chunks.length,mode:plan.mode,backend:selected});
  const runner={
   async generate(prompt,{maxNewTokens,onToken}){
    let streamer=null;
    if(runtime.TextStreamer)streamer=new runtime.TextStreamer(model.tokenizer,{
      skip_prompt:true,skip_special_tokens:true,
      callback_function:delta=>onToken(String(delta||''))
    });
    const output=await model([
      {role:'system',content:'Türkçe, kanıta bağlı ve kısa özetleme asistanı.'},
      {role:'user',content:prompt}
    ],{max_new_tokens:maxNewTokens,do_sample:false,
      ...(streamer?{streamer}:{})});
    const val=output?.[0]?.generated_text;
    if(Array.isArray(val))return val.at(-1)?.content||'';
    if(typeof val==='string')return val;
    throw new Error('MODEL_INVALID_OUTPUT');
   }
  };
  const result=await runGenerativePlan(plan,{runner,
   onProgress:info=>notify(jobId,'stream',{phase:info.phase,step:info.index,total:info.total,text:info.text})});
  notify(jobId,'done',{result:{...result,modelId:ID,modelRevision:manifest.revision,backend:selected}});
 }catch(error){
  notify(jobId,'error',{code:String(error?.message||error).slice(0,320)});
 }finally{activeJob=null;}
}
self.onmessage=event=>{
 const m=event.data;
 if(!Number.isInteger(m?.jobId)||!m.urls)return;
 if(m.type==='GENERATE'&&m.request){
  run(m).catch(e=>notify(m.jobId,'error',{code:String(e?.message||e)}));
 }else if(m.type==='PREFLIGHT'){
  preflight(m).catch(e=>notify(m.jobId,'error',{code:String(e?.message||e)}));
 }
};
