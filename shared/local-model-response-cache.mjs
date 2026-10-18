/** İşlem 004-D — Transformers.js v3.8.1 yerel URL/OPFS yanıt adaptörü.
 * Bu kod gerçek ONNX inference değil; kütüphane dosya çözümünü gözlemlenebilir
 * ve uzaktan istekleri reddedilebilir hale getirir.
 */
function address(input){
 if(typeof input==='string')return input;
 if(typeof input?.url==='string')return input.url;
 if(input instanceof URL)return input.href;
 return null;
}
const namePattern=/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/;
export function createLocalModelCache({
 modelBase,modelId,allowedPaths,loadFile,onEvent=()=>{}
}={}){
 if(typeof modelBase!=='string'||typeof modelId!=='string'||typeof loadFile!=='function')throw new TypeError('LOCAL_MODEL_CONFIG_INVALID');
 const base=new URL(modelBase);
 if(base.protocol!=='chrome-extension:')throw new Error('LOCAL_MODEL_ORIGIN_INVALID');
 if(!modelId.match(/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/))throw new Error('LOCAL_MODEL_ID_INVALID');
 const modelPrefix=new URL(modelId+'/',base).href;
 const trustedHost=base.hostname;
 const allowed=new Set(allowedPaths||[]);
 const stats={lookups:0,hits:0,misses:0,rejectedRemote:0};
 function resolve(input){
  const urlString=address(input);
  if(!urlString)return {kind:'invalid'};
  let url;
  try{url=new URL(urlString,base);}catch{return {kind:'invalid'};}
  if(url.protocol==='http:'||url.protocol==='https:')return {kind:'remote',url:url.href};
  if(url.hostname!==trustedHost||url.protocol!=='chrome-extension:')return {kind:'invalid'};
  if(!url.href.startsWith(modelPrefix))return {kind:'extension-other'};
  let relative;
  try{relative=decodeURIComponent(url.pathname.slice(new URL(modelPrefix).pathname.length));}
  catch{return {kind:'invalid'};}
  if(!namePattern.test(relative)||relative.split('/').includes('..'))return {kind:'invalid'};
  if(!allowed.has(relative))return {kind:'missing',relative};
  return {kind:'model',relative};
 }
 async function match(input){
  stats.lookups++;
  const r=resolve(input);
  if(r.kind!=='model'){stats.misses++;return undefined;}
  const response=await loadFile(r.relative);
  if(!response?.ok)throw new Error('OPFS_MODEL_RESPONSE_INVALID');
  stats.hits++;
  onEvent({type:'file-match',path:r.relative});
  return response;
 }
 async function guardedFetch(input,init,delegate){
  const r=resolve(input);
  if(r.kind==='remote'){stats.rejectedRemote++;throw new Error('RUNTIME_REMOTE_FETCH_FORBIDDEN');}
  if(r.kind==='model'){
   const response=await match(input);
   if(!response)throw new Error('BROWSER_OPFS_FILE_MISSING');
   return response;
  }
  if(r.kind==='missing')throw new Error('LOCAL_MODEL_ASSET_NOT_LISTED');
  if(r.kind==='invalid')throw new Error('INVALID_MODEL_ASSET_URL');
  if(typeof delegate!=='function')throw new TypeError('LOCAL_FETCH_DELEGATE_MISSING');
  return delegate(input,init);
 }
 const customCache={match,async put(){throw new Error('LOCAL_MODEL_CACHE_READ_ONLY');}};
 return {customCache,guardedFetch,resolve,stats,modelPrefix};
}
