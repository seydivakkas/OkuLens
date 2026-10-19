import {createDesktopSummary} from './summary-core.mjs';
import {wordCount} from '../shared/summarize.mjs';
import {runDesktopOnnx} from './onnx-client.mjs';

const el=id=>document.getElementById(id);
let lastResult=null;
let processing=false;
let modelBusy=false;
let inferenceController=null;
let modelAvailable=false;
const backend=()=>el('model-backend').value;
const setStatus=message=>{el('status').textContent=message;};
function updateSourceCount(){
 const n=wordCount(el('source-text').value);
 el('source-count').textContent=n+' kelime';
}
function showEmpty(){
 lastResult=null;
 el('result-content').hidden=true;
 el('empty').hidden=false;
 el('engine').textContent='Henüz oluşturulmadı';
}
function showResult(result){
 lastResult=result;
 el('empty').hidden=true;
 el('result-content').hidden=false;
 el('engine').textContent=result.engine==='local-onnx-generative'?'Qwen/ONNX · yerel üretken model':'Yerel çıkarımsal özet';
 el('result-note').textContent=result.engine==='local-onnx-generative'
 ?'Bu metin gerçek yerel modelin adayıdır. Kaynak sadakati ve gerçek ağsız Windows kabulü ayrıca doğrulanmalıdır.'
 :'Özet, kaynak cümlelerinden seçildi. ONNX veya üretken yeniden yazım değildir.';
 el('result-words').textContent=String(result.actualWords);
 el('compression').textContent=String(result.compression??0)+'%';
 el('duration').textContent=String(result.processingMs??0)+' ms';
 el('result-text').textContent=result.text;
 const keywords=el('keywords');
 keywords.replaceChildren();
 for(const kw of result.keywords||[]){
  const chip=document.createElement('span');
  chip.textContent=kw.word;
  keywords.append(chip);
 }
 if(!keywords.childElementCount){
  const none=document.createElement('span');none.textContent='Bu metinde yok';keywords.append(none);
 }
 el('warnings').textContent=(result.warnings||[]).join(' ');
}
function setBusy(active){
 processing=active;
 for(const id of ['open','clear','summarize','length','source-text','source-title','engine-mode','model-backend']){
  el(id).disabled=active;
 }
}
el('source-text').addEventListener('input',()=>{
 updateSourceCount();
 showEmpty();
});
el('length').addEventListener('change',showEmpty);
el('clear').addEventListener('click',()=>{
 el('source-text').value='';
 el('source-title').value='';
 updateSourceCount();
 showEmpty();
 setStatus('Metin temizlendi. Kaynak veya özet kalıcı olarak saklanmadı.');
});
el('open').addEventListener('click',async()=>{
 if(processing)return;
 try{
  setBusy(true);
  const chosen=await window.okulensDesktop.openText();
  if(chosen?.canceled){setStatus('Dosya seçimi iptal edildi.');return;}
  el('source-title').value=chosen.name.slice(0,300);
  el('source-text').value=chosen.text;
  updateSourceCount();showEmpty();
  setStatus('Yerel dosya açıldı: '+chosen.name+'. Hiçbir sunucuya yüklenmedi.');
 }catch(e){setStatus('Dosya açılamadı: '+String(e?.message||e));}
 finally{setBusy(false);}
});
el('summarize').addEventListener('click',async()=>{
 if(processing)return;
 const method=el('engine-mode').value;
 const selected=Number(el('length').value);
 const source=el('source-text').value;
 try{
  setBusy(true);
  if(method==='onnx'){
   if(!modelAvailable)throw new Error('MODEL_NOT_INSTALLED_VERIFY_SHA_FIRST');
   if(!source.trim())throw new Error('DESKTOP_EMPTY_SOURCE');
   const controller=new AbortController();inferenceController=controller;
   el('model-cancel').disabled=false;
   const started=performance.now();
   setStatus('Qwen ONNX yükleniyor; ilk yüklemede RAM/VRAM kullanımı artabilir…');
   const result=await runDesktopOnnx({
    text:source,title:el('source-title').value,targetWords:selected,backend:backend()
   },{signal:controller.signal,onProgress:p=>{
    if(p.type==='stage')setStatus('ONNX: '+p.stage+(p.progress?' ('+p.progress+'%)':''));
    if(p.type==='stream')setStatus('Gerçek model akışı: '+p.phase+' / '+p.step+' · '+p.partial.length+' karakter');
   }});
   result.processingMs=Math.round(performance.now()-started);
   result.compression=result.actualWords>0?Math.max(0,Math.round((1-result.actualWords/wordCount(source))*100)):0;
   showResult(result);
   setStatus('Qwen/ONNX metni üretildi. Bu tek çalışma gerçek Windows çevrimdışı/kaynak kabulü anlamına gelmez.');
  }else{
   const result=createDesktopSummary(source,{
    title:el('source-title').value,targetWords:selected
   });
   showResult(result);
   setStatus('Özet yalnızca cihazda oluşturuldu. '+result.actualWords+' kelime. ONNX kullanılmadı.');
  }
 }catch(e){showEmpty();setStatus('Özetleme başarısız: '+String(e?.message||e));}
 finally{inferenceController=null;el('model-cancel').disabled=true;setBusy(false);}
});
el('copy').addEventListener('click',async()=>{
 if(!lastResult)return;
 try{
  await navigator.clipboard.writeText(lastResult.text);
  setStatus('Özet panoya kopyalandı.');
 }catch(e){setStatus('Panoya kopyalama engellendi; metni seçerek elle kopyalayabilirsin.');}
});
el('save').addEventListener('click',async()=>{
 if(!lastResult)return;
 try{
  const result=await window.okulensDesktop.saveSummary(lastResult.text);
  setStatus(result?.canceled?'Kaydetme iptal edildi.':'Özet yerel diske kaydedildi: '+result.name);
 }catch(e){setStatus('Kaydetme başarısız: '+String(e?.message||e));}
});
updateSourceCount();
showEmpty();


function modelStatusMessage(data){
 modelAvailable=Boolean(data?.ready);
 el('model-status').textContent=modelAvailable
 ?'Kurulum bulundu ('+data.backend+'). Dosyalar kayıtlı; gerçek ONNX üretimi ayrıca sınanmalı.'
 :'Model kurulmadı veya eksik: '+(data?.reason||'Henüz indirilmedi');
 el('model-detail').textContent=modelAvailable
 ?'Diskte '+(data.bytes/1048576).toFixed(1)+' MiB; kayıt boyutları denetlendi. SHA tam tekrar okumak için doğrula.'
 :'Qwen indirmesi kullanıcının açık onayıyla başlar; metnin sunucuya gönderilmez.';
}
async function refreshModel(){
 try{modelStatusMessage(await window.okulensDesktop.modelStatus(backend()));}
 catch(e){modelAvailable=false;el('model-status').textContent='Model sorgulama hatası: '+String(e.message||e);}
}
el('model-backend').addEventListener('change',()=>refreshModel());
el('model-cancel').addEventListener('click',async()=>{
 if(inferenceController)inferenceController.abort();
 else await window.okulensDesktop.cancelModel();
});
window.okulensDesktop.onModelProgress(progress=>{
 el('model-progress').max=progress.total||10;
 el('model-progress').value=progress.index||0;
 el('model-detail').textContent=(progress.stage||'')+' · '+(progress.path||'')+
  (progress.bytes?' · '+(progress.bytes/1048576).toFixed(1)+' MiB':'');
});
el('model-install').addEventListener('click',async()=>{
 if(modelBusy||processing)return;
 if(!el('model-consent').checked){setStatus('Qwen indirmesi için önce açık onay kutusunu işaretle.');return;}
 modelBusy=true;el('model-install').disabled=true;el('model-cancel').disabled=false;
 try{
  setStatus('Qwen metadata ve ONNX ağırlığı sabit SHA ile indiriliyor…');
  const r=await window.okulensDesktop.installModel(backend(),true);
  setStatus('Model dosyaları indirildi ('+(r.bytes/1048576).toFixed(1)+' MiB); gerçek çıkarım hâlâ doğrulanmalı.');
 }catch(e){setStatus('Model kurulamadı: '+String(e.message||e));}
 finally{modelBusy=false;el('model-install').disabled=false;el('model-cancel').disabled=true;await refreshModel();}
});
el('model-verify').addEventListener('click',async()=>{
 if(modelBusy||processing)return;
 modelBusy=true;el('model-verify').disabled=true;el('model-cancel').disabled=false;
 try{
  const r=await window.okulensDesktop.verifyModel(backend());
  setStatus('Sabit Qwen upstream SHA-256 denetimi başarılı: '+r.files+' dosya. Model inference hâlâ kabul bekliyor.');
 }catch(e){setStatus('SHA-256 denetimi HATA: '+String(e.message||e));}
 finally{modelBusy=false;el('model-verify').disabled=false;el('model-cancel').disabled=true;await refreshModel();}
});
el('model-remove').addEventListener('click',async()=>{
 if(modelBusy||processing)return;
 if(!window.confirm('Yerel Qwen model dosyaları silinsin mi? Bu işlem geri alınamaz.'))return;
 try{await window.okulensDesktop.removeModel(backend(),true);setStatus('Model silindi.');}
 catch(e){setStatus('Model silinemedi: '+String(e.message||e));}
 await refreshModel();
});
refreshModel();
