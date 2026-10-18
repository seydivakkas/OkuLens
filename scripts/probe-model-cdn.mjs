/** Yalnız HTTP HEAD: büyük ONNX ağırlıklarını indirmeden redirect hedefini
 * raporlar. Gerçek Chrome/Edge izin/CORS testi yerine geçmez.
 */
import {MODEL} from '../shared/browser-model-catalog.mjs';
import {allowedModelDownloadHost} from '../shared/model-download-policy.mjs';
const findings=[];
for(const [backend,{weight}] of Object.entries(MODEL.backend)){
 const source='https://huggingface.co/'+MODEL.id+'/resolve/'+MODEL.revision+'/'+weight;
 const ctl=new AbortController();
 const timer=setTimeout(()=>ctl.abort(),45000);
 try{
  const response=await fetch(source,{method:'HEAD',signal:ctl.signal,redirect:'follow',
   credentials:'omit',referrerPolicy:'no-referrer'});
  const finalUrl=new URL(response.url);
  const info={backend,status:response.status,host:finalUrl.hostname,
   allowed:allowedModelDownloadHost(finalUrl.hostname),
   contentLength:response.headers.get('content-length')};
  findings.push(info);
  if(!response.ok||!info.allowed||finalUrl.protocol!=='https:')throw new Error('MODEL_WEIGHT_CDN_UNVERIFIED: '+backend);
 }finally{clearTimeout(timer);}
}
console.log(JSON.stringify({kind:'MODEL_WEIGHT_CDN_HEAD_ONLY',modelId:MODEL.id,revision:MODEL.revision,findings},null,2));
