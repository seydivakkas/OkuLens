/** İşlem 004-C — yalnız kullanıcının kurulum komutu üzerine başlayan model isteği.
 * Uzak kod ve kullanıcı metni asla bu fonksiyona girmez. Yönlendirme hostları
 * gerçek Chrome/Edge'de kanıtlanmadı; desteklenmeyen hostta güvenli şekilde durur.
 */
import {makeRemoteURL} from './browser-model-catalog.mjs';

export function allowedModelDownloadHost(hostname){
 const host=String(hostname||'').toLowerCase();
 return host==='huggingface.co' || host.endsWith('.huggingface.co') ||
   host==='hf.co' || host.endsWith('.hf.co');
}
export function modelDownloadError(error){
 if(error?.name==='AbortError')return error;
 const message=String(error?.message||error);
 const code=/MODEL_REDIRECT_HOST_UNAPPROVED/.test(message)?'MODEL_REDIRECT_HOST_UNAPPROVED':
  /MODEL_HTTP_/.test(message)?message:
  /MODEL_RESPONSE_NOT_HTTPS/.test(message)?'MODEL_RESPONSE_NOT_HTTPS':
  /MODEL_RESPONSE_INVALID/.test(message)?'MODEL_RESPONSE_INVALID':
  /(?:fetch|network|cors|load|failed|permission|block)/i.test(message)?'MODEL_CDN_OR_CORS_BLOCKED':
  'MODEL_DOWNLOAD_FAILED';
 const output=new Error(code);output.code=code;return output;
}
export async function fetchModelAsset(relative,{
 fetcher=fetch,signal,onHost=()=>{}
}={}){
 const url=makeRemoteURL(relative);
 let response;
 try{
  response=await fetcher(url,{
   method:'GET',signal,cache:'no-store',redirect:'follow',
   credentials:'omit',referrerPolicy:'no-referrer'
  });
 }catch(e){throw modelDownloadError(e);}
 if(!response?.ok||!response.body){
  throw modelDownloadError(new Error('MODEL_HTTP_'+String(response?.status||0)+' '+relative));
 }
 // Yönlendirmeden sonra yalnızca beklenen HF alan adlarından TLS yanıtı kabul et.
 // Sunucunun yönlendirme hedefine tarayıcı fetch aşamasında erişemeyebilir.
 // Bu durumda upstream "CORS_BLOCKED" kaydı yazılır; geniş izin açılmaz.
 if(response.url){
  let final;
  try{final=new URL(response.url);}
  catch{throw modelDownloadError(new Error('MODEL_RESPONSE_INVALID'));}
  if(final.protocol!=='https:')throw modelDownloadError(new Error('MODEL_RESPONSE_NOT_HTTPS'));
  if(!allowedModelDownloadHost(final.hostname)){
   try{await response.body.cancel?.();}catch{}
   throw modelDownloadError(new Error('MODEL_REDIRECT_HOST_UNAPPROVED'));
  }
  onHost(final.hostname);
 }else{
  onHost('unobservable');
 }
 return response;
}
