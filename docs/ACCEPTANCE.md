# OkuLens — Kabul Matrisi

Durum sözcükleri: `PASS` kanıtlı gerçek kabul; `PARTIAL` kapsam sınırlı; `HOLD` kanıt yok; `FAIL` testte ihlal.

## Yerel kaynak kontrolleri

- [x] `manifest.json` JSON sözdizimi geçerli.
- [x] JavaScript modülleri Node `--check` ile sözdizimi taramasından geçti.
- [x] Extractive motorunun 7 adet saf fonksiyon testi yerel ortamda geçti (18.10.2026).
- [x] Uzaktan LLM API istemcisi kaynak kodunda yok.
- [x] Readability.js 0.6.0 paket entegrasyonu (kod + sentetik kontrol).
- [ ] Canlı makale sitelerinde gerçek Chrome/Edge doğrulaması (son kabul).
- [ ] Model dosyası / Türkçe üretken ONNX motoru.
- [ ] Unit + e2e tarayıcı testleri.

## Gerçek cihaz (henüz HOLD)

- [ ] Windows 11 Chrome stable panel açılışı.
- [ ] Windows 11 Edge stable panel açılışı ve tekrar açma.
- [ ] Makale seçimi ve yüzen balon yerleşimi.
- [ ] Gmail SPA rota değişikliği / kapsama doğruluğu.
- [ ] Outlook farklı DOM varyantları.
- [ ] YouTube manual/ASR/transkriptsiz vaka.
- [ ] 10/100/1000 kelime hedef sapması ölçümü.
- [ ] Native AI İngilizce ve yerel fallback doğru etiketleniyor.
- [ ] Sıfır üçüncü taraf AI ağ isteği kaydı.
- [ ] Engelli site, worker sonlandırma, tab kapama, panel yeniden açma.
- [ ] Erişilebilirlik ve Windows kullanıcı kabulü.

**Genel durum:** `HOLD` — gerçek tarayıcı kabulü yapılmadı. Yerel Node kontrolü ürün kabulü olarak yorumlanmaz.
