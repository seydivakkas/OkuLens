/** OkuLens Windows W-P1 — kullanıcının AppData dizininde hash sabitli model deposu.
 * Büyük dosyalar streaming indirilir; dosya sistemi uygulama çalışırken yereldir.
 * Model yalnız açıkça install çağrılırsa indirilir.
 */
import {mkdir,readFile,writeFile,rename,rm,stat,open} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {MODEL,assetsFor,makeRemoteURL} from '../shared/browser-model-catalog.mjs';

const allowedHost=h=>h==='huggingface.co'||h.endsWith('.huggingface.co')||
 h==='hf.co'||h.endsWith('.hf.co');
const hex=/^[a-f0-9]{64}$/;
const allowedFile=p=>typeof p==='string'&&/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(p)&&
 !p.split('/').includes('..');
const backendValid=b=>Object.hasOwn(MODEL.backend,b);
const maxBytes=a=>a.path.startsWith('onnx/')?Math.ceil(MODEL.backend[
 a.path.includes('q4f16')?'webgpu':'wasm'].estimatedBytes*1.1):100*1024*1024;
async function fileHash(file,{signal}={}){
 const fs=await import('node:fs');
 const hash=createHash('sha256');let bytes=0;
 const stream=fs.createReadStream(file,{highWaterMark:1024*1024});
 if(signal)signal.addEventListener('abort',()=>stream.destroy(new Error('AbortError')),{once:true});
 for await(const block of stream){if(signal?.aborted)throw new Error('AbortError');bytes+=block.length;hash.update(block);}
 return {sha256:hash.digest('hex'),bytes};
}
function dirs(root,b){return {dir:join(root,'qwen-'+b),manifest:join(root,'qwen-'+b,'manifest.json')};}
export async function desktopModelStatus(root,backend='webgpu'){
 if(!backendValid(backend))throw new Error('MODEL_BACKEND_INVALID');
 const {dir,manifest}=dirs(root,backend);
 try{
  const record=JSON.parse(await readFile(manifest,'utf8'));
  if(record.modelId!==MODEL.id||record.revision!==MODEL.revision||
     record.backend!==backend||record.license!==MODEL.license||
     !Array.isArray(record.files))throw new Error('MODEL_MANIFEST_UNTRUSTED');
  const expected=assetsFor(backend);
  if(record.files.length!==expected.length)throw new Error('MODEL_MANIFEST_INCOMPLETE');
  let bytes=0;
  for(const asset of expected){
   const entry=record.files.find(x=>x.path===asset.path);
   if(!entry||entry.sha256!==asset.sha256||!hex.test(entry.sha256)||
     !Number.isSafeInteger(entry.bytes)||entry.bytes<1)throw new Error('MODEL_SHA_RECORD_INVALID');
   const f=await stat(join(dir,...asset.path.split('/')));
   if(!f.isFile()||f.size!==entry.bytes)throw new Error('MODEL_SIZE_MISMATCH');
   bytes+=f.size;
  }
  return {ready:true,backend,modelId:MODEL.id,revision:MODEL.revision,
   bytes,verifiedByReadback:false,files:expected.length,record};
 }catch(e){
  if(e?.code==='ENOENT')return {ready:false,backend,reason:'MODEL_NOT_INSTALLED'};
  return {ready:false,backend,reason:String(e?.message||e).slice(0,120)};
 }
}
export async function verifyDesktopModel(root,backend,{signal,onProgress=()=>{}}={}){
 const status=await desktopModelStatus(root,backend);
 if(!status.ready)throw new Error(status.reason);
 const dir=dirs(root,backend).dir;
 for(const [index,asset] of assetsFor(backend).entries()){
  const {sha256,bytes}=await fileHash(join(dir,...asset.path.split('/')),{signal});
  const entry=status.record.files.find(x=>x.path===asset.path);
  if(sha256!==asset.sha256||sha256!==entry.sha256||bytes!==entry.bytes)throw new Error('MODEL_SHA256_MISMATCH '+asset.path);
  onProgress({stage:'verified',path:asset.path,index:index+1,total:status.files});
 }
 return {verified:true,backend,files:status.files,revision:MODEL.revision};
}
export async function installDesktopModel(root,backend,{
 signal,onProgress=()=>{},fetcher=fetch
}={}){
 if(!backendValid(backend))throw new Error('MODEL_BACKEND_INVALID');
 if(signal?.aborted)throw new Error('AbortError');
 const existing=await desktopModelStatus(root,backend);
 if(existing.ready)throw new Error('MODEL_ALREADY_INSTALLED_VERIFY_FIRST');
 await mkdir(root,{recursive:true});
 const dir=dirs(root,backend).dir;
 // Eski bozuk klasör üzerine yazılmaz; önce kullanıcı denetimi gerekir.
 try{await stat(dir);throw new Error('MODEL_INCOMPLETE_DIRECTORY_REQUIRES_REPAIR');}
 catch(e){if(e.code!=='ENOENT')throw e;}
 const stage=join(root,'.install-'+randomUUID());
 const expected=assetsFor(backend),record=[];
 await mkdir(stage,{recursive:true});
 try{
  for(const [index,asset] of expected.entries()){
   if(signal?.aborted)throw new Error('AbortError');
   const url=makeRemoteURL(asset.path);
   let response;
   try{response=await fetcher(url,{signal,cache:'no-store',
    credentials:'omit',referrerPolicy:'no-referrer',redirect:'follow'});}
   catch(e){if(signal?.aborted)throw new Error('AbortError');throw new Error('MODEL_NETWORK_OR_CORS_FAILED: '+String(e.message).slice(0,100));}
   if(!response?.ok||!response.body)throw new Error('MODEL_HTTP_'+(response?.status||0));
   let endpoint;try{endpoint=new URL(response.url||url);}catch{throw new Error('MODEL_REDIRECT_INVALID');}
   if(endpoint.protocol!=='https:'||!allowedHost(endpoint.hostname))throw new Error('MODEL_REDIRECT_HOST_UNAPPROVED');
   const dest=join(stage,...asset.path.split('/'));
   await mkdir(dirname(dest),{recursive:true});
   const handle=await open(dest,'wx');
   const h=createHash('sha256');let bytes=0;
   try{
    for await(const chunk of response.body){
     if(signal?.aborted)throw new Error('AbortError');
     bytes+=chunk.byteLength;
     if(bytes>maxBytes(asset))throw new Error('MODEL_FILE_TOO_LARGE '+asset.path);
     const buf=Buffer.from(chunk);
     h.update(buf);
     let offset=0;
     while(offset<buf.byteLength){
      const {bytesWritten}=await handle.write(buf,offset,buf.byteLength-offset);
      if(!bytesWritten)throw new Error('MODEL_DISK_WRITE_INCOMPLETE');
      offset+=bytesWritten;
     }
     onProgress({stage:'downloading',path:asset.path,index:index+1,total:expected.length,bytes});
    }
   }finally{await handle.close();}
   const sha256=h.digest('hex');
   if(bytes<1||sha256!==asset.sha256)throw new Error('MODEL_SHA256_MISMATCH '+asset.path);
   record.push({path:asset.path,bytes,sha256});
   onProgress({stage:'verified',path:asset.path,index:index+1,total:expected.length,bytes});
  }
  const manifest={schemaVersion:1,modelId:MODEL.id,revision:MODEL.revision,
   license:MODEL.license,backend,files:record,createdAt:new Date().toISOString(),
   inferenceVerified:false};
  await writeFile(join(stage,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  await rename(stage,dir);
  return {ready:true,backend,files:record.length,
   bytes:record.reduce((n,x)=>n+x.bytes,0),inferenceVerified:false};
 }catch(e){await rm(stage,{recursive:true,force:true}).catch(()=>{});throw e;}
}
export async function removeDesktopModel(root,backend,{confirmed=false}={}){
 if(!confirmed)throw new Error('MODEL_REMOVE_CONFIRMATION_REQUIRED');
 if(!backendValid(backend))throw new Error('MODEL_BACKEND_INVALID');
 await rm(dirs(root,backend).dir,{recursive:true,force:true});
 return {removed:true,backend};
}
export async function modelFileForRequest(root,backend,relative){
 if(!backendValid(backend)||!allowedFile(relative))return null;
 const status=await desktopModelStatus(root,backend);
 if(!status.ready||!assetsFor(backend).some(x=>x.path===relative))return null;
 return resolve(dirs(root,backend).dir,...relative.split('/'));
}
export {MODEL};
