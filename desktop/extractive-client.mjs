/** Tekil, iptal edilebilir yerel TextRank Worker köprüsü. */
export function runDesktopExtractive(source,{title='',targetWords=100},{
 signal,workerFactory=()=>new Worker(new URL('./extractive-worker.mjs',import.meta.url),{type:'module'})
}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new Error('AbortError'));return;}
  let worker,finished=false;
  const jobId=Math.floor(Math.random()*1e9);
  function finish(err,result){
   if(finished)return;
   finished=true;
   signal?.removeEventListener('abort',abort);
   worker?.terminate();
   if(err)reject(err);else resolve(result);
  }
  function abort(){finish(new Error('AbortError'));}
  try{
   worker=workerFactory();
   signal?.addEventListener('abort',abort,{once:true});
   worker.onerror=e=>finish(new Error('EXTRACTIVE_WORKER_ERROR: '+String(e?.message||'Worker çalışmadı')));
   worker.onmessage=e=>{
    const message=e.data;
    if(message?.jobId!==jobId)return;
    if(message.type==='error')finish(new Error(message.code||'EXTRACTIVE_UNKNOWN_ERROR'));
    else if(message.type==='done'){
     if(typeof message.result?.text!=='string'||!message.result.text.trim())
      finish(new Error('EXTRACTIVE_EMPTY_OUTPUT'));
     else finish(null,message.result);
    }
   };
   worker.postMessage({jobId,source,title,targetWords});
  }catch(e){finish(e);}
 });
}
