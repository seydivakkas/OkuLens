# OkuLens — Mimari Geliştirme Notları

> Üst sözleşme `../README.md` dosyasındadır. Bu not, mevcut P0 kaynak bileşenleriyle hedef P1+ tasarımını ayırır.

## P0 gerçek yürütme akışı

1. Kullanıcı Chrome/Edge uzantı ikonunu tıklar; `chrome.sidePanel.setPanelBehavior` panel açılmasını sağlar.
2. `panel/panel.js` aktif sekme kimliğini alır ve `chrome.scripting.executeScript` ile `content/injected.js` enjekte etmeye çalışır. İzin yoksa kullanıcıya bildirir.
3. Content script seçimi veya DOM fallback'i çıkarır. E-posta ve YouTube yalnızca görünür/aktif içerikle deneysel çalışır.
4. Panel `chrome.tabs.sendMessage({type:'OKULENS_EXTRACT'})` aracılığıyla metni alır. Sayfa metni uzaktaki sunucuya gönderilmez.
5. `shared/native-ai.mjs`, yalnızca yerleşik modelin hazır olduğu İngilizce 10/100 görevlerinde native AI dener; diğer tüm durumlarda `shared/summarize.mjs` önemli özgün cümleleri seçer.
6. Tamamlanan özet `chrome.storage.session` içinde sekme id'si anahtarıyla tutulur; ham metin kalıcı depoya yazılmaz.
7. Tab değişince panel özet kaydını okur, URL değişmişse yanlış özet göstermez.

## P0 dosya sorumluluğu

| Dosya | Sorumluluk | Yapmaması gereken |
|---|---|---|
| `manifest.json` | Yetkiler, yan panel, uzantı bilgisi | Gereksiz geniş site yetkisi |
| `background/service-worker.js` | Kurulum, kullanıcı jesti, tab özet temizleme | DOM işleme ve yerel model çalıştırma |
| `content/injected.js` | Kullanıcı izinli sekmede metin çıkarma | Uzaktan LLM çağrısı, sayfa DOM'unu silme |
| `panel/panel.js` | UI / işlem / depolama / kullanıcı kontrolü | E-posta veya transkripti sessizce kalıcı saklama |
| `shared/native-ai.mjs` | Capability-gated native API | Türkçe destekli olduğunu varsayma |
| `shared/summarize.mjs` | Deterministik, çıkarımsal geri dönüş | Yeniden yazım iddia etme |
| `options/*` | Yerel tercihler | Kullanıcı verilerini senkronize etme |

## P1+ hedef ayrıştırma

```text
src/
  extractors/article.ts         # Readability clone-DOM + semantic fallback
  extractors/gmail.ts           # Scoped MutationObserver + message card extraction
  extractors/outlook.ts         # Varyantlı Outlook SPA adaptörü
  extractors/youtube.ts         # Transcript/caption strategy registry
  core/document-schema.ts      # Provenance koruyan normalleştirme
  core/chunker.ts              # Kaynak konumlarına göre section splitting
  core/scoring.ts              # Extractive prefilter, gerekirse TextRank
  core/synthesis.ts            # Map/Reduce ve kelime hedefi denetimi
  model/capabilities.ts        # Browser, language, device readiness
  model/builtin.ts             # Browser native Summarizer/Rewriter adapters
  model/local-onnx.ts          # Model v3/v4, WebGPU/WASM adapter
  model/model-manifest.ts      # SHA, provenance, license, cache
  protocol/messages.ts        # Tür güvenli, requestId'li mesajlar
  storage/session.ts          # TabID, navigation token, TTL
  security/sanitizer.ts        # XSS/prompt-injection sınırları
```

Her arayüz modaliteleri kendi dosyasında barındırır. P0 kodu prototiptir; hedef dosyalar hâlihazırda yoktur.

## Geliştirici agent için değişmezler

- Uzantı tüm teknik açıklama, issue, PR ve arayüzlerde Türkçe konuşur.
- Yoksa `chrome.*` API'si güvenli biçimde feature detect edilir; başka tarayıcıya ait API kör çağrılmaz.
- Gereksiz `offscreen` / `<all_urls>` / `unlimitedStorage` izni eklenmez.
- Gizli e-posta içeriği kullanıcı onayı olmadan kalıcı disk, hata kaydı, ağ/telemetriye yazılmaz.
- Readability her zaman clone DOM üzerinde çalışır.
- Prompt injection, kaynak metin sınırını aşamaz.
- Kelime bütçesi gerçek ölçüyle raporlanır; 1000 kelimeyi doldurmak için halüsinasyon üretilmez.
- İngilizce native AI desteği, Türkçe üretken destek iddiasına dönüştürülmez.
- Kaynak ve `jobId` sekme geçişinde karışmaz.
- Cihaz testi yapılmadan `PASS` etiketli performans/UX raporu yazılmaz.

## Bir sonraki kesin mühendislik işi

`P1-01`: Mozilla Readability'nin belirli sürümünü yerel paketle, lisans envanterine ekle, Readability.clone parse + `article/main/[role=main]` fallback ayrımını test et. Ardından seçicili e-posta ve YouTube çıkarıcılarını ayrı modüllere taşı.
