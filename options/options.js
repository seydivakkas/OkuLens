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
