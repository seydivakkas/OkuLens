const keys = ['okulens:targetWords', 'okulens:difficulty'];
const values = await chrome.storage.local.get(keys);
document.getElementById('length').value = String(values[keys[0]] ?? 100);
document.getElementById('difficulty').value = String(values[keys[1]] ?? 'medium');
document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.local.set({
    [keys[0]]: Number(document.getElementById('length').value),
    [keys[1]]: document.getElementById('difficulty').value
  });
  document.getElementById('status').textContent = 'Ayarlar cihazda kaydedildi.';
});

import {localModelStatus} from '../shared/local-model-bridge.mjs';
async function refreshModel(){
  const state=await localModelStatus();
  document.getElementById('modelStatus').textContent=state.ready
    ? 'Model dosyaları mevcut: '+state.modelId+' ('+(state.backends||[]).join('/')+'). Çalışma doğrulaması bekleniyor.'
    : 'Model kurulmadı / manifest geçersiz. Üretken özet kapalı; yerel TextRank kullanılabilir.';
}
document.getElementById('copyInstall').addEventListener('click',async()=>{
  await navigator.clipboard.writeText(document.getElementById('installCommand').textContent.trim());
  document.getElementById('status').textContent='Kurulum komutları kopyalandı. İndirme siz komutu çalıştırmadan başlamaz.';
});
document.getElementById('checkModel').addEventListener('click',refreshModel);
refreshModel().catch(()=>{document.getElementById('modelStatus').textContent='Model denetimi başarısız.';});


// TİCARİ-002: kullanıcı onayı olmadan model indirimi başlatılmaz.
import {MODEL} from '../shared/browser-model-catalog.mjs';
import {browserModelStatus,quotaInfo,installBrowserModel,verifyBrowserModel,removeBrowserModel}
  from '../shared/browser-model-store.mjs';
let browserTask=null;
const el=id=>document.getElementById(id);
function setBrowserBusy(active){
 el('browserInstall').disabled=active;
 el('browserVerify').disabled=active;
 el('browserRemove').disabled=active;
 el('browserBackend').disabled=active;
 el('browserAbort').disabled=!active;
}
async function refreshBrowserModel(){
 const [status,quota]=await Promise.all([browserModelStatus(),quotaInfo()]);
 el('browserModelStatus').textContent=status.ready
  ?'OPFS model dosyaları kayıtlı: '+status.backend+' · yaklaşık '+(status.totalBytes/1048576).toFixed(1)+' MiB. Dosya varlığı incelendi; gerçek ONNX inference ve yeniden SHA doğrulaması ayrıca gerekli.'
  :'Tarayıcı model deposu: '+(status.reason||'KURULU_DEĞİL')+'. Üretken model henüz kullanıma hazır kabul edilemez.';
 el('browserStorage').textContent=quota.known
  ?'Tarayıcı depolama kotası: '+(quota.quota/1073741824).toFixed(2)+' GiB · kullanılabilir tahmin '+(quota.available/1073741824).toFixed(2)+' GiB. Bu değer gerçek fiziksel boş alan değildir.'
  :'Tarayıcı depolama kotası belirlenemedi. Güvenli kurulum engellenecek.';
 return status;
}
el('browserInstall').addEventListener('click',async()=>{
 if(browserTask)return;
 if(!el('browserModelConsent').checked){
  el('browserProgressDetail').textContent='MODEL_CONSENT_REQUIRED: Açık indirme onayı verilmedi.';
  return;
 }
 const backend=el('browserBackend').value;
 const size=MODEL.backend[backend].estimatedBytes;
 if(!size){el('browserProgressDetail').textContent='Desteklenmeyen backend.';return;}
 // Kullanıcı etkileşimi devam ederken yetki isteği başlatılır; asenkron
 // işlem başlatıldıktan sonra istemek Chrome kullanıcı jestini kaybedebilir.
 const permission=chrome.permissions.request({origins:['https://huggingface.co/*']});
 setBrowserBusy(true);
 let controller=null;
 try{
  const allowed=await permission;
  if(!allowed)throw new Error('MODEL_HOST_PERMISSION_DENIED');
  // Kalıcılık talebi best-effort: hayır ise indirilen model saklanabilir ancak silinebilir.
  const persistent=await navigator.storage.persist().catch(()=>false);
  el('browserProgressDetail').textContent=persistent
    ?'Kalıcı saklama isteği kabul edildi; indirme başlıyor.'
    :'Tarayıcı kalıcı saklama sözü vermedi; depolama baskısında dosyalar silinebilir.';
  controller=new AbortController();browserTask=controller;
  const result=await installBrowserModel(backend,{
   signal:controller.signal,
   onProgress(event){
    const n=event.totalFiles||1;
    el('browserProgress').value=Math.floor((event.index-(event.stage==='verified'?0:1))/n*100);
    el('browserProgressDetail').textContent=
      (event.stage==='verified'?'SHA doğrulandı: ':'İndiriliyor: ')+event.path+
      ' · '+(event.bytes/1048576).toFixed(1)+' MiB · dosya '+event.index+'/'+n;
   }
  });
  el('browserProgress').value=100;
  el('browserProgressDetail').textContent='Tarayıcı dosya kurulumu tamamlandı ('+
   (result.bytes/1048576).toFixed(1)+' MiB). Gerçek Transformers.js offline inference kabulü HOLD.';
 }catch(err){
  el('browserProgressDetail').textContent='Kurulum başarısız: '+String(err?.message||err)+
   '. Başarısız/yarım indirme aktif model olarak kaydedilmedi.';
 }finally{
  browserTask=null;setBrowserBusy(false);
  await refreshBrowserModel().catch(()=>{});
 }
});
el('browserAbort').addEventListener('click',()=>{
 if(browserTask){browserTask.abort();el('browserProgressDetail').textContent='İptal istendi, geçici indirme kaldırılacak.';}
});
el('browserVerify').addEventListener('click',async()=>{
 if(browserTask)return;
 setBrowserBusy(true);
 try{
  const result=await verifyBrowserModel({
   onProgress:e=>{el('browserProgressDetail').textContent='SHA kontrolü: '+e.path;}
  });
  el('browserProgressDetail').textContent=result.files+' dosya SHA-256 kontrolü başarılı. Gerçek ONNX model inference HALA HOLD.';
 }catch(e){el('browserProgressDetail').textContent='SHA doğrulama başarısız: '+String(e.message||e);}
 finally{setBrowserBusy(false);await refreshBrowserModel().catch(()=>{});}
});
el('browserRemove').addEventListener('click',async()=>{
 if(browserTask)return;
 if(!window.confirm('Tarayıcıda saklanan ONNX model dosyaları silinsin mi? Bu işlem geri alınamaz.'))return;
 setBrowserBusy(true);
 try{
  const r=await removeBrowserModel();
  el('browserProgress').value=0;
  el('browserProgressDetail').textContent=r.removed?'Model dosyaları silindi.':'Silinecek model bulunamadı.';
 }catch(e){el('browserProgressDetail').textContent='Silme işlemi başarısız: '+String(e.message||e);}
 finally{setBrowserBusy(false);await refreshBrowserModel().catch(()=>{});}
});
refreshBrowserModel().catch(e=>{
 el('browserModelStatus').textContent='Tarayıcı model durumu okunamadı: '+String(e.message||e);
});
