import {CASES,fixtureSource,buildEvidence,preflightFidelity} from '../shared/acceptance-evidence.mjs';
import {localModelStatus,runLocalModel,preflightLocalModel} from '../shared/local-model-bridge.mjs';
import {browserModelStatus} from '../shared/browser-model-store.mjs';
import {wordCount} from '../shared/summarize.mjs';

const $=id=>document.getElementById(id);
let active=null;
let record=null;
let modelInfo={ready:false};
let browserReady=false;
const formatMs=n=>Number.isFinite(n)?Math.round(n)+' ms':'Ölçülmedi';
const formatMB=n=>Number.isFinite(n)?(n/1048576).toFixed(1)+' MB':'Ölçülmedi';
function heap(){
 const n=globalThis.performance?.memory?.usedJSHeapSize;
 return Number.isFinite(n)?n:null;
}
function resetCase(){
 const id=$('case').value;
 $('source').value=fixtureSource(id);
 $('words').textContent='Hedef '+CASES[id].targetWords;
 $('output').textContent='Bu vaka için henüz gerçek model çıktısı yok.';
 $('checks').textContent='Kaynak sadakati incelenmedi.';
 $('state').textContent='HOLD';
 $('elapsed').textContent='—';
 $('first').textContent='—';
 $('streams').textContent='—';
 $('heap').textContent='Ölçülmedi';
 $('run-status').textContent='Kullanıcı işlemini bekliyor.';
 $('download').disabled=true;
 record=null;
}
async function checkModel(){
 const [status,browser]=await Promise.all([localModelStatus(),browserModelStatus()]);
 modelInfo=status;
 browserReady=browser.ready;
 $('preflight').disabled=!browserReady;
 $('model-status').textContent=modelInfo.ready
  ?'Kurulum manifesti bulundu ('+(modelInfo.backends||[]).join('/')+'). SHA doğrulaması ve gerçek inference ayrıca gereklidir.'
  :'Kurulu model manifesti bulunmadı. Önce README içindeki açık onaylı model kurulumunu ve SHA kontrolünü yapın.';
 $('run').disabled=!modelInfo.ready;
}
function review(){
 return {
  cliShaVerified:$('sha').value==='yes',
  turkishQuality:$('turkish').value,
  factualSupport:$('factual').value,
  sourceCitationVerified:$('citations').value,
  reviewerNote:$('note').value
 };
}
function setBusy(value){
 $('run').disabled=value||!modelInfo.ready;
 $('preflight').disabled=value||!browserReady;
 $('cancel').disabled=!value;
 $('case').disabled=value;
 $('backend').disabled=value;
}
async function begin(){
 if(active)return;
 const caseId=$('case').value;
 const source=fixtureSource(caseId);
 const config=CASES[caseId];
 let partial='', final=null, error=null,streamCount=0,firstTokenMs=null;
 const events=[];
 const beginMs=performance.now();
 const before=heap();
 let peak=before;
 const controller=new AbortController();
 const timer=setInterval(()=>{const n=heap();if(n!==null)peak=Math.max(peak??0,n);},300);
 active={controller};
 setBusy(true);
 $('state').textContent='ÇALIŞIYOR';
 $('run-status').textContent='Modelin gerçek üretimi çalıştırılıyor…';
 $('output').textContent='Henüz token gelmedi.';
 $('checks').textContent='Sonuç bekleniyor.';
 $('download').disabled=true;
 $('streams').textContent='0';
 $('first').textContent='—';
 $('elapsed').textContent='—';
 try{
  final=await runLocalModel({
   title:'OkuLens kontrol vakası '+caseId,text:source,
   targetWords:config.targetWords,difficulty:config.level,preference:$('backend').value
  },{
   signal:controller.signal,
   onProgress(message){
    if(message.type==='stream'){
     streamCount++;
     const value=String(message.text||'');
     if(firstTokenMs===null&&value.trim()){firstTokenMs=performance.now()-beginMs;}
     partial=value;
     if(events.length<10000)events.push({type:'stream',charCount:value.length,phase:message.phase,step:message.step,total:message.total});
     $('output').textContent='[Geçici akış, nihai çıktı değil]\n'+partial;
     $('first').textContent=formatMs(firstTokenMs);
     $('streams').textContent=String(streamCount);
    }else if(message.type==='plan'){
     $('run-status').textContent='Plan: '+message.parts+' bölüm, '+message.mode+', '+message.backend;
    }else if(message.type==='loading'){
     $('run-status').textContent='Model yükleniyor ('+(message.backend||'yürütme')+')…';
    }
   }
  });
  $('output').textContent=final.text||'(Boş çıktı)';
  $('words').textContent=String(wordCount(final.text))+' / hedef '+config.targetWords;
  $('checks').textContent=JSON.stringify(preflightFidelity(source,final.text),null,2);
  $('state').textContent=final.text?'ÇIKTI ALINDI · İNCELEME BEKLİYOR':'BOŞ ÇIKTI';
  $('run-status').textContent='Üretim tamamlandı. Model sonucu ve kaynak sadakati insan incelemesi bekliyor.';
 }catch(e){
  error=e?.message||String(e);
  const cancelled=controller.signal.aborted;
  $('state').textContent=cancelled?'İPTAL EDİLDİ':'HATA';
  $('run-status').textContent=cancelled?'İptal çağrıldı, Worker sonlandırıldı.':'MODEL_ERROR: '+error;
  $('output').textContent='Kabul edilebilir gerçek model çıktısı alınamadı. Son geçici akış:\n'+partial;
  $('checks').textContent='Çıktı olmadan kaynak sadakati değerlendirilemez.';
 }finally{
  clearInterval(timer);
  const after=heap();
  peak=[peak,after].filter(Number.isFinite).reduce((a,b)=>Math.max(a,b),0)||null;
  const elapsedMs=performance.now()-beginMs;
  const metrics={
   elapsedMs,firstTokenMs,
   memoryKind:before!==null?'chromium-js-heap-estimate':'unavailable',
   heapBeforeBytes:before,peakHeapBytes:peak,heapAfterBytes:after
  };
  $('elapsed').textContent=formatMs(elapsedMs);
  $('heap').textContent=formatMB(peak)+' (JS heap)';
  $('first').textContent=formatMs(firstTokenMs);
  $('streams').textContent=String(streamCount);
  record={caseId,source,output:final?.text||'',events,metrics,
   model:final||modelInfo,error,streamCount};
  active=null;
  setBusy(false);
  $('download').disabled=false;
 }
}
async function beginPreflight(){
 if(active||!browserReady)return;
 const controller=new AbortController();
 active={controller};
 setBusy(true);
 $('preflight-result').textContent='OPFS dosyaları gerçek uzantı Worker’ında okunuyor. Model çıkarımı başlatılmıyor…';
 $('run-status').textContent='OPFS Worker ön kontrolü çalışıyor.';
 try{
  const result=await preflightLocalModel({signal:controller.signal});
  $('preflight-result').textContent=JSON.stringify(result,null,2);
  $('run-status').textContent='OPFS Worker dosya ön kontrolü tamamlandı. Gerçek ONNX üretimi / çevrimdışı çalışma hâlâ HOLD.';
 }catch(error){
  $('preflight-result').textContent='OPFS ön kontrol HATA: '+String(error?.message||error);
  $('run-status').textContent='Ön kontrol başarısız: model çalışıyor varsayılmayacak.';
 }finally{
  active=null;
  setBusy(false);
 }
}
function download(){
 if(!record)return;
 const report=buildEvidence({...record,review:review()});
 report.streamEventsObserved=record.streamCount;
 report.runtime={
  environment:'Chrome/Edge extension page',
  browserUserAgent:navigator.userAgent,
  backendPreference:$('backend').value,
  clientTimestamp:new Date().toISOString(),
  wasmAndWeightsBundledInRepo:false,
  networkCaptureStatus:'NOT_MEASURED',
  networkEvidenceSha256:null,
  offlineInferenceVerified:false
 };
 const bytes=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(bytes);
 const a=document.createElement('a');
 a.href=url;
 a.download='okulens-islem004-'+record.caseId+'-'+new Date().toISOString().slice(0,10)+'.json';
 a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 $('run-status').textContent='JSON raporu yerel olarak indirildi. Issue #4 hâlâ HOLD.';
}
$('case').addEventListener('change',resetCase);
$('preflight').addEventListener('click',()=>beginPreflight());
$('run').addEventListener('click',()=>begin().catch(e=>{$('run-status').textContent='LAB_ERROR: '+(e.message||e);}));
$('cancel').addEventListener('click',()=>active?.controller.abort());
$('download').addEventListener('click',download);
resetCase();
checkModel().catch(e=>{
 $('model-status').textContent='Model sorgusu başarısız: '+(e.message||e);
 $('run').disabled=true;
});
