/* Çıkarımsal uzun belge özetini UI thread'ini kilitlemeden hesaplar.
 * Ağ, dosya sistemi ve üretken ONNX erişimi yoktur.
 */
import {createDesktopSummary} from './summary-core.mjs';
self.onmessage=event=>{
 const {jobId,source,title,targetWords}=event.data||{};
 if(!Number.isSafeInteger(jobId))return;
 try{
  const result=createDesktopSummary(source,{title,targetWords});
  self.postMessage({jobId,type:'done',result});
 }catch(error){
  self.postMessage({jobId,type:'error',code:String(error?.message||error).slice(0,180)});
 }
};
