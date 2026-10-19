/* W-P1: yalnız yerel Electron model varlıkları ve Transformers.js Worker.
 * Her istek kaynağı sabit; uzak Hugging Face indirmesi yalnız Electron ana
 * sürecinde açık kullanıcı onayı ile yapılır. Bu Worker hiçbir ağ indirmez.
 */
import {createGenerationPlan,runGenerativePlan} from '../shared/generative-plan.mjs';
import {wordCount} from '../shared/summarize.mjs';

const ID='onnx-community/Qwen3-0.6B-Instruct-ONNX';
let active=false;
function emit(jobId,type,extra={}){postMessage({jobId,type,...extra});}
async function execute(message){
 const {jobId,text,title='',targetWords=100,difficulty='medium',backend}=message;
 if(active)throw new Error('MODEL_BUSY');
 if(!['webgpu','wasm'].includes(backend))throw new Error('MODEL_BACKEND_INVALID');
 active=true;
 try{
  const {pipeline,env,TextStreamer}=await import('../vendor/transformers.runtime.mjs');
  env.allowRemoteModels=false;
  env.allowLocalModels=true;
  env.useBrowserCache=false;
  env.useCustomCache=false;
  env.localModelPath='okulens://desktop/model-assets/'+backend+'/';
  env.backends.onnx.wasm.wasmPaths='okulens://desktop/vendor/ort/';
  // Windows Electron içinde SharedArrayBuffer/COOP bağımlılığını kaldırır.
  // Performans kararı gerçek CPU/WASM kabulünde tekrar ölçülmelidir.
  env.backends.onnx.wasm.numThreads=1;
  emit(jobId,'stage',{stage:'MODEL_LOADING',backend});
  const generator=await pipeline('text-generation',ID,{
   device:backend,
   dtype:backend==='webgpu'?'q4f16':'q4',
   progress_callback:e=>{
    if(e?.status==='progress')emit(jobId,'stage',{stage:'MODEL_FILE_LOADING',progress:e.progress});
   }
  });
  emit(jobId,'stage',{stage:'MODEL_READY',backend});
  const plan=createGenerationPlan(text,{title,targetWords,difficulty,maxChars:3500});
  const runner={
   async generate(prompt,{maxNewTokens,onToken}){
    let streamer;
    if(TextStreamer)streamer=new TextStreamer(generator.tokenizer,{
     skip_prompt:true,skip_special_tokens:true,
     callback_function:delta=>onToken(String(delta||''))
    });
    const output=await generator([
     {role:'system',content:'Türkçe, kaynağa sadık ve açık bir özetleme asistanısın.'},
     {role:'user',content:prompt}
    ],{max_new_tokens:maxNewTokens,do_sample:false,...(streamer?{streamer}:{})});
    const value=output?.[0]?.generated_text;
    if(Array.isArray(value))return String(value.at(-1)?.content||'');
    if(typeof value==='string')return value;
    throw new Error('MODEL_INVALID_OUTPUT');
   }
  };
  const result=await runGenerativePlan(plan,{runner,onProgress:p=>emit(jobId,'stream',{
   partial:p.text,phase:p.phase,step:p.index,total:p.total
  })});
  emit(jobId,'done',{result:{...result,backend,modelId:ID,
   note:'Gerçek model çıktısıdır, kaynak sadakati bağımsız inceleme bekler.',
   measuredWordCount:wordCount(result.text)}});
 }finally{active=false;}
}
self.onmessage=e=>{
 const m=e.data;
 if(m?.type!=='GENERATE'||!Number.isSafeInteger(m.jobId))return;
 execute(m).catch(err=>emit(m.jobId,'error',{
  code:String(err?.message||err).slice(0,240)
 }));
};
