# OkuLens — Kabul Matrisi

Durum sözcükleri: `PASS` kanıtlı gerçek kabul; `PARTIAL` kapsam sınırlı; `HOLD` kanıt yok; `FAIL` testte ihlal.

## Yerel kaynak kontrolleri

- [x] `manifest.json` JSON sözdizimi geçerli.
- [x] JavaScript modülleri Node `--check` ile sözdizimi taramasından geçti.
- [x] Extractive motorunun 7 adet saf fonksiyon testi yerel ortamda geçti (18.10.2026).
- [x] Uzaktan LLM API istemcisi kaynak kodunda yok.
- [x] Readability.js 0.6.0 paket entegrasyonu (kod + sentetik kontrol).
- [ ] Canlı makale sitelerinde gerçek Chrome/Edge doğrulaması (son kabul).
- [x] Koşullu Qwen3-0.6B ONNX model Worker/planlayıcı ve SHA installer kodu, sentetik birim denetimleri.
- [ ] Model dosyası/Transfomers.js runtime yerel paketinin kurularak gerçek Türkçe model inference PASS edilmesi (HOLD).
- [ ] WebGPU q4f16 ve WASM q4 backend gerçek Windows tarayıcı kontrolleri (HOLD).
- [x] Model kabulü için sentetik vakalar, tarayıcı kabul arayüzü ve indirilebilir `decision: HOLD` kanıt şeması geliştirildi.
- [ ] Gerçek 10/100/1000 model çıktılarının, kaynak sadakatinin ve Kolay/Orta/Zor seviyelerinin bağımsız incelenmesi (HOLD).
- [ ] Gerçek streaming / ilk akış süresi ve iptal deneyinin Windows Chrome + Edge üzerinde ölçülmesi (HOLD).
- [ ] RAM/VRAM ve çevrimdışı çalışma ağ kayıtlarının ölçülmesi (HOLD).
- [x] Gmail/Outlook/YouTube ayırıcıları için sentetik birim testleri.
- [ ] Unit + e2e tarayıcı testleri (gerçek tarayıcı).

## Gerçek cihaz (henüz HOLD)

- [ ] Windows 11 Chrome stable panel açılışı.
- [ ] Windows 11 Edge stable panel açılışı ve tekrar açma.
- [ ] Makale seçimi ve yüzen balon yerleşimi.
- [ ] Gmail SPA rota değişikliği / kapsama doğruluğu (sentetik kod var, gerçek cihaz HOLD).
- [ ] Outlook farklı DOM varyantları (seçiciler sentetik doğrulandı, gerçek cihaz HOLD).
- [ ] YouTube manual/ASR/transkriptsiz vaka (transkriptsiz hata sentetik doğrulandı, gerçek video HOLD).
- [ ] 10/100/1000 kelime hedef sapması ölçümü.
- [ ] Native AI İngilizce ve yerel fallback doğru etiketleniyor.
- [ ] Model kurulduktan sonra sıfır üçüncü taraf AI ağ isteği kaydı (runtime denetlenmedi).
- [ ] Engelli site, worker sonlandırma, tab kapama, panel yeniden açma.
- [ ] Erişilebilirlik ve Windows kullanıcı kabulü.

**Genel durum:** `HOLD` — model gerçek inference ve Windows Chrome/Edge kabulü yapılmadı. Node sentetik testleri ürün/kalite kabulü olarak yorumlanmaz.
