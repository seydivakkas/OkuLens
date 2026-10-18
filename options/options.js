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
