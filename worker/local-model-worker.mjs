/* Chrome/Edge extension worker: modeli SAYFA bağlamında değil, izole uzantıda çalıştırır.
 * Kullanıcı eylemiyle başlar. Uzaktan model/JS isteği KAPALI.
 */
import {createGenerationPlan,runGenerativePlan} from '../shared/generative-plan.mjs';
const ID='onnx-community/Qwen3-0.6B-Instruct-ONNX';
const WEIGHT_SHAS={
 'onnx/model_q4f16.onnx':'4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d',
 'onnx/model_q4.onnx':'a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d'
};
let runtime,model,loadedBackend,activeJob=null;
function notify(jobId,type,payload={}){postMessage({jobId,type,...payload});}
async function prepare(urls,preference,jobId){
 if(!runtime){
  try{runtime=await import('../vendor/transformers.runtime.mjs');}
  catch{throw new Error('RUNTIME_NOT_BUILT: npm run build:runtime gerekli.');}
 }
 const response=await fetch(urls.manifest,{cache:'no-store'});
 if(!response.ok)throw new Error('MODEL_NOT_INSTALLED: npm run model:install gerekli.');
 const manifest=await response.json();
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
async function run(message){
 const {jobId,urls,preference,request}=message;
 if(activeJob)throw new Error('MODEL_BUSY');
 activeJob=jobId;
 try{
  const {selected,manifest}=await prepare(urls,preference,jobId);
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
 if(m?.type==='GENERATE'&&Number.isInteger(m.jobId)&&m.urls&&m.request){
  run(m).catch(e=>notify(m.jobId,'error',{code:String(e?.message||e)}));
 }
};
