/** İşlem 004-C: sabitlenmiş Hugging Face commitindeki küçük model metadata
 * dosyalarının SHA-256 değerlerini bağımsız kurulumda raporlar.
 * Model ağırlığı İNDİRMEZ. CI ağ hatasında durum FAIL olmalıdır.
 */
import {createHash} from 'node:crypto';
import {MODEL,assetsFor} from '../shared/browser-model-catalog.mjs';
const metadata=assetsFor('webgpu').filter(x=>!x.path.startsWith('onnx/'));
const result={modelId:MODEL.id,revision:MODEL.revision,hashes:{}};
for(const asset of metadata){
 const url='https://huggingface.co/'+MODEL.id+'/resolve/'+MODEL.revision+'/'+asset.path;
 const ctl=new AbortController();
 const timeout=setTimeout(()=>ctl.abort(),120000);
 try{
  const response=await fetch(url,{signal:ctl.signal,redirect:'follow',credentials:'omit'});
  if(!response.ok||!response.body)throw new Error('HTTP '+response.status);
  const reader=response.body.getReader(),hash=createHash('sha256');
  let bytes=0;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    hash.update(value);bytes+=value.length;
    if(bytes>100*1024*1024)throw new Error('METADATA_TOO_LARGE');
   }
  }finally{reader.releaseLock();}
  result.hashes[asset.path]={sha256:hash.digest('hex'),bytes,
   upstreamUrlHost:new URL(response.url).hostname};
 }finally{clearTimeout(timeout);}
}
console.log(JSON.stringify(result,null,2));
