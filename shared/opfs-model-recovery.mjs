/** İşlem 004-C: Çökme/yarım kurulumdan kalan OPFS model dizinleri.
 * Varsayılan dryRun: hiçbir dosyaya dokunmaz.
 * Yalnız UUID biçimli kurulum klasörleri adaydır; aktif kayıt DAİMA korunur.
 * Aynı Web Lock, eşzamanlı kurulum/silme ile yarışmayı engeller.
 */
import {STORE_KEY,STORE_PREFIX} from './browser-model-catalog.mjs';

const depsDefault=()=>({storage:navigator.storage,local:chrome.storage.local,locks:navigator.locks});
const uuid=/^[a-f0-9]{32}$/i;
async function sizeDir(dir){
 let total=0;
 for await(const [_name,handle] of dir.entries()){
  if(handle.kind==='file')total+=(await handle.getFile()).size;
  else if(handle.kind==='directory')total+=await sizeDir(handle);
 }
 return total;
}
async function doScan(deps,remove){
 const manifest=(await deps.local.get(STORE_KEY))[STORE_KEY]||null;
 const activeId=typeof manifest?.installId==='string'?manifest.installId:null;
 let root,folder;
 try{
  root=await deps.storage.getDirectory();
  folder=await root.getDirectoryHandle(STORE_PREFIX);
 }catch(e){
  if(e?.name==='NotFoundError')return {orphanCount:0,removedCount:0,reclaimableBytes:0,unknownCount:0,activeProtected:Boolean(activeId),orphans:[]};
  throw e;
 }
 let reclaimableBytes=0,removedCount=0,unknownCount=0;
 const orphans=[];
 for await(const [name,handle] of folder.entries()){
  if(name===activeId)continue; // bozuk olsa bile aktif manifest otomatik silinmez
  if(handle.kind!=='directory'||!uuid.test(name)){unknownCount++;continue;}
  const bytes=await sizeDir(handle);
  reclaimableBytes+=bytes;
  orphans.push({name,bytes});
  if(remove){await folder.removeEntry(name,{recursive:true});removedCount++;}
 }
 return {orphanCount:orphans.length,removedCount,reclaimableBytes,unknownCount,activeProtected:Boolean(activeId),orphans};
}
export async function inspectModelOrphans(deps=depsDefault()){
 if(typeof deps.locks?.request!=='function')throw new Error('WEB_LOCKS_UNAVAILABLE');
 return deps.locks.request('okulens-model-v1',{mode:'exclusive'},()=>doScan(deps,false));
}
export async function cleanupModelOrphans({confirmed=false,deps=depsDefault()}={}){
 if(!confirmed)throw new Error('ORPHAN_CLEANUP_EXPLICIT_CONFIRMATION_REQUIRED');
 if(typeof deps.locks?.request!=='function')throw new Error('WEB_LOCKS_UNAVAILABLE');
 return deps.locks.request('okulens-model-v1',{mode:'exclusive'},()=>doScan(deps,true));
}
