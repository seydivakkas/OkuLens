/** W-P1 Electron Worker bridge; no fake model output or implicit fallback. */
export function runDesktopOnnx(request,{
 signal,onProgress=()=>{},
 workerFactory=()=>new Worker(new URL('./model-worker.mjs',import.meta.url),{type:'module'})
}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new Error('AbortError'));return;}
  if(!['webgpu','wasm'].includes(request?.backend)) {reject(new Error('MODEL_BACKEND_INVALID'));return;}
  let worker,finished=false;
  const jobId=Math.floor(Math.random()*1e9);
  function finish(error,data){
   if(finished)return;finished=true;
   signal?.removeEventListener('abort',abort);
   worker?.terminate();
   if(error)reject(error);else resolve(data);
  }
  function abort(){finish(new Error('AbortError'));}
  try{
   worker=workerFactory();
   signal?.addEventListener('abort',abort,{once:true});
   worker.onerror=e=>finish(new Error('MODEL_WORKER_FAILED: '+(e?.message||'Worker failed')));
   worker.onmessage=e=>{
    const m=e.data;
    if(m?.jobId!==jobId||finished)return;
    if(m.type==='stage'||m.type==='stream')onProgress(m);
    if(m.type==='error')finish(new Error(m.code||'MODEL_INFERENCE_FAILED'));
    if(m.type==='done'){
     if(!m.result?.text?.trim())finish(new Error('MODEL_EMPTY_OUTPUT'));
     else finish(null,m.result);
    }
   };
   worker.postMessage({type:'GENERATE',jobId,
    backend:request.backend,
    targetWords:request.targetWords,
    title:String(request.title||'').slice(0,300),
    text:String(request.text||'').slice(0,260000),
    difficulty:'medium'
   });
  }catch(e){finish(e);}
 });
}
