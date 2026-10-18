/* TİCARİ-002 — Chrome/Edge extension origin OPFS model yöneticisi.
 * Uzak istek ancak açık installBrowserModel() çağrısında yapılır.
 * Model metadata küçük chrome.storage.local kaydıdır; ONNX baytları sadece OPFS'dedir.
 */
import {IncrementalSHA256} from './incremental-sha256.mjs';
import {fetchModelAsset} from './model-download-policy.mjs';
import {MODEL, STORE_KEY, STORE_PREFIX, STORAGE_LAYOUT,assetsFor,makeRemoteURL} from './browser-model-catalog.mjs';

const LIMIT_MULTIPLIER=1.35;
const MAX_METADATA_BYTES=100*1024*1024;
const approxTotal=backend=>MODEL.backend[backend].estimatedBytes+MAX_METADATA_BYTES;

const defaultDeps=()=>({
 storage:navigator.storage,
 local:chrome.storage.local,
 locks:navigator.locks,
 fetcher:fetch
});
async function entryDir(storage,installId,{create=false}={}){
 const root=await storage.getDirectory();
 const folder=await root.getDirectoryHandle(STORE_PREFIX,{create});
 return folder.getDirectoryHandle(installId,{create});
}
async function parentAndFile(folder,relative,{create=false}={}){
 const bits=relative.split('/');
 let dir=folder;
 for(const part of bits.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create});
 return [dir,bits.at(-1)];
}
async function removeInstall(storage,installId){
 try{
  const root=await storage.getDirectory();
  const folder=await root.getDirectoryHandle(STORE_PREFIX);
  await folder.removeEntry(installId,{recursive:true});
 }catch(e){if(e?.name!=='NotFoundError')throw e;}
}
async function getManifest(local){return (await local.get(STORE_KEY))[STORE_KEY]||null;}
export async function browserModelStatus(deps=defaultDeps()){
 try{
  const record=await getManifest(deps.local);
  if(!record)return {ready:false,reason:'BROWSER_MODEL_NOT_INSTALLED'};
  if(record.schemaVersion!==STORAGE_LAYOUT||record.id!==MODEL.id||record.revision!==MODEL.revision
     ||!Object.hasOwn(MODEL.backend,record.backend))return {ready:false,reason:'BROWSER_MODEL_MANIFEST_INVALID'};
  const expected=assetsFor(record.backend);
  if(!Array.isArray(record.files)||record.files.length!==expected.length)return {ready:false,reason:'BROWSER_MODEL_MANIFEST_INCOMPLETE'};
  const dir=await entryDir(deps.storage,record.installId);
  for(const asset of expected){
   const stored=record.files.find(x=>x.path===asset.path);
   if(!stored||!/^[a-f0-9]{64}$/.test(stored.sha256)||
      (asset.sha256&&stored.sha256!==asset.sha256))return {ready:false,reason:'BROWSER_MODEL_HASH_RECORD_MISMATCH'};
   const [parent,name]=await parentAndFile(dir,asset.path);
   const file=await (await parent.getFileHandle(name)).getFile();
   if(file.size!==stored.bytes)return {ready:false,reason:'BROWSER_MODEL_SIZE_MISMATCH'};
  }
  return {ready:true,backend:record.backend,revision:record.revision,
   totalBytes:record.files.reduce((n,x)=>n+x.bytes,0),installId:record.installId,
   shaStatus:'RECORD_ONLY',record};
 }catch(e){return {ready:false,reason:'BROWSER_MODEL_MISSING_OR_EVICTED',details:String(e?.message||e)};}
}
export async function quotaInfo(storage=navigator.storage){
 const {usage,quota}=await storage.estimate();
 if(!Number.isFinite(quota)||!Number.isFinite(usage)||quota<=0)return {known:false,usage:null,quota:null,available:null};
 return {known:true,usage,quota,available:Math.max(0,quota-usage)};
}
export async function installBrowserModel(backend,{
 onProgress=()=>{},signal,deps=defaultDeps()
}={}){
 if(!Object.hasOwn(MODEL.backend,backend))throw new RangeError('INVALID_MODEL_BACKEND');
 if(typeof deps.locks?.request!=='function')throw new Error('WEB_LOCKS_UNAVAILABLE');
 if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');
 return deps.locks.request('okulens-model-v1',{mode:'exclusive',signal},async()=>{
  const before=await browserModelStatus(deps);
  const estimate=await quotaInfo(deps.storage);
  const expected=approxTotal(backend);
  if(!estimate.known)throw new Error('STORAGE_QUOTA_UNKNOWN');
  if(estimate.available<expected*LIMIT_MULTIPLIER)throw new Error('INSUFFICIENT_STORAGE_QUOTA');
  const uuid=globalThis.crypto?.randomUUID?.();
  if(!uuid)throw new Error('SECURE_RANDOM_REQUIRED');
  const installId=uuid.replaceAll('-','');
  const folder=await entryDir(deps.storage,installId,{create:true});
  const results=[], assets=assetsFor(backend);
  try{
   for(let i=0;i<assets.length;i++){
    const asset=assets[i];
    if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');
    const response=await fetchModelAsset(asset.path,{
     fetcher:deps.fetcher,signal,
     onHost:hostname=>onProgress({stage:'cdn-host',host:hostname,
      path:asset.path,index:i+1,totalFiles:assets.length,bytes:0})
    });
    if(!response.ok||!response.body)throw new Error('MODEL_HTTP_'+response.status+' '+asset.path);
    // Onnx ağırlığına ait sabit SHA dosyanın hatasız ve beklenen sürümde olduğunun ön şartı.
    const max=asset.sha256?Math.ceil(MODEL.backend[backend].estimatedBytes*1.35):MAX_METADATA_BYTES;
    const [dir,name]=await parentAndFile(folder,asset.path,{create:true});
    const handle=await dir.getFileHandle(name,{create:true});
    const writer=await handle.createWritable();
    const reader=response.body.getReader();
    const hash=new IncrementalSHA256();
    let total=0,closed=false;
    try{
     while(true){
      if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.length;
      if(total>max)throw new Error('MODEL_FILE_TOO_LARGE '+asset.path);
      hash.update(value);
      await writer.write(value);
      if(total===value.length||total%(4*1024*1024)<value.length){
       onProgress({stage:'downloading',path:asset.path,index:i+1,totalFiles:assets.length,bytes:total});
      }
     }
     await writer.close();closed=true;
    }finally{
     reader.releaseLock();
     if(!closed)await writer.abort().catch(()=>{});
    }
    if(total===0)throw new Error('MODEL_EMPTY_FILE '+asset.path);
    const sha256=hash.digestHex();
    if(asset.sha256&&sha256!==asset.sha256)throw new Error('MODEL_SHA256_MISMATCH '+asset.path);
    results.push({path:asset.path,bytes:total,sha256,upstreamPinned:Boolean(asset.sha256)});
    onProgress({stage:'verified',path:asset.path,index:i+1,totalFiles:assets.length,bytes:total});
   }
   const record={schemaVersion:STORAGE_LAYOUT,id:MODEL.id,revision:MODEL.revision,
    backend,installId,license:MODEL.license,files:results,installedAt:new Date().toISOString(),
    status:'INSTALLED_FILES_UNTESTED_RUNTIME'};
   await deps.local.set({[STORE_KEY]:record});
   if(before.ready&&before.installId!==installId){
    await removeInstall(deps.storage,before.installId).catch(()=>{});
   }
   return {ready:true,backend,bytes:results.reduce((n,x)=>n+x.bytes,0),record,
    note:'SHA denetlendi; Transformers.js gerçek offline inference henüz ayrıca test edilmelidir.'};
  }catch(e){
   await removeInstall(deps.storage,installId).catch(()=>{});
   throw e;
  }
 });
}
export async function verifyBrowserModel({onProgress=()=>{},deps=defaultDeps(),signal}={}){
 const status=await browserModelStatus(deps);
 if(!status.ready)throw new Error(status.reason||'BROWSER_MODEL_NOT_INSTALLED');
 const dir=await entryDir(deps.storage,status.installId);
 for(const asset of status.record.files){
  if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');
  const [parent,name]=await parentAndFile(dir,asset.path);
  const file=await (await parent.getFileHandle(name)).getFile();
  const reader=file.stream().getReader(), hash=new IncrementalSHA256();
  let bytes=0;
  try{
   while(true){const {done,value}=await reader.read();if(done)break;
    if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');
    hash.update(value);bytes+=value.length;
   }
  }finally{reader.releaseLock();}
  if(bytes!==asset.bytes||hash.digestHex()!==asset.sha256)throw new Error('BROWSER_MODEL_INTEGRITY_FAILED '+asset.path);
  onProgress({stage:'verified',path:asset.path,bytes});
 }
 return {verified:true,files:status.record.files.length,backend:status.backend,
  note:'Dosyalar manifest SHA kayıtlarıyla tekrar karşılaştırıldı; metadata hashleri kurulumda oluşturulmuştu.'};
}
export async function removeBrowserModel(deps=defaultDeps()){
 if(typeof deps.locks?.request!=='function')throw new Error('WEB_LOCKS_UNAVAILABLE');
 return deps.locks.request('okulens-model-v1',{mode:'exclusive'},async()=>{
  const manifest=await getManifest(deps.local);
  if(!manifest)return {removed:false};
  await removeInstall(deps.storage,manifest.installId);
  await deps.local.remove(STORE_KEY);
  return {removed:true};
 });
}
/** Çalışan için, yalnızca listelenmiş dosyalarda OPFS -> Response adaptörü.
 * Transformers.js ile gerçek uyumluluk ayrıca Chrome/Edge kabulünde doğrulanır.
 */
export async function openBrowserModelResponse(relative,{deps=defaultDeps()}={}){
 const status=await browserModelStatus(deps);
 if(!status.ready)throw new Error(status.reason||'BROWSER_MODEL_NOT_INSTALLED');
 if(!status.record.files.some(x=>x.path===relative))throw new Error('UNLISTED_MODEL_FILE');
 const dir=await entryDir(deps.storage,status.installId);
 const [parent,name]=await parentAndFile(dir,relative);
 const file=await (await parent.getFileHandle(name)).getFile();
 const mime=relative.endsWith('.json')?'application/json':relative.endsWith('.jinja')?'text/plain':'application/octet-stream';
 return new Response(file,{status:200,headers:{'Content-Type':mime,'Content-Length':String(file.size)}});
}
