import {createDesktopSummary} from './summary-core.mjs';
import {wordCount} from '../shared/summarize.mjs';

const el=id=>document.getElementById(id);
let lastResult=null;
let processing=false;
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
 el('engine').textContent='Yerel çıkarımsal özet';
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
 for(const id of ['open','clear','summarize','length','source-text','source-title']){
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
el('summarize').addEventListener('click',()=>{
 if(processing)return;
 try{
  setBusy(true);
  const selected=Number(el('length').value);
  const source=el('source-text').value;
  const result=createDesktopSummary(source,{
   title:el('source-title').value,targetWords:selected
  });
  showResult(result);
  setStatus('Özet yalnızca cihazda oluşturuldu. '+result.actualWords+' kelime. ONNX kullanılmadı.');
 }catch(e){showEmpty();setStatus('Özetleme başarısız: '+String(e?.message||e));}
 finally{setBusy(false);}
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
