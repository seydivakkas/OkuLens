# OkuLens — Gizlilik Politikası Taslağı (Yayımlama Öncesi)

**TASLAK / Mağaza yayını için henüz onaylanmamıştır.**  
**Güncelleme:** 18 Ekim 2026  
**Ürün:** OkuLens, Chrome/Edge Manifest V3 tarayıcı uzantısı

> Nihai yayıncı tüzel kişi/unvan, iletişim adresi, politika URL'si ve veri sorumlusu bilgileri henüz belirlenmemiştir. Bu bilgiler gerçek yayımlama öncesinde tamamlanmalıdır. Bu taslak, mevcut depodaki kod incelemesine dayanır; gerçek cihaz ağı güvenliği ve bağımsız hukuk denetimi yapılmış değildir.

## 1. Hangi veriler işlenir?

Kullanıcı OkuLens üzerinden içerik özetlemeyi seçerse açık web sayfasının başlığı/URL'si, seçilen metin, okunabilir makale içeriği, görünür Gmail/Outlook mesaj gövdesi veya açık YouTube transkript segmentleri işlenebilir. E-posta gövdesinin kendisi kişisel veri içerebilir; OkuLens alıcı meta alanlarını kasıtlı çıkarmasa da mesaj metnindeki ad/adresleri otomatik anonimleştirmez.

Kullanıcının hedef kelime sayısı ve anlatım düzeyi `chrome.storage.local` ile cihaz tarayıcı profilinde saklanır. Üretilen makale/video özeti sekme bazlı `chrome.storage.session` içinde geçici tutulabilir. E-posta özetleri oturum önbelleğine yazılmaması için kodlanmıştır. Kullanıcının açık isteğiyle Markdown/JSON dışa aktarma oluşturulabilir; dosyaların sonraki saklanması ve paylaşılması kullanıcının kontrolündedir.

## 2. Veriler ne amaçla kullanılır?

Sayfayı çıkarmak, yerel TF-IDF/TextRank ya da isteğe bağlı kurulu ONNX modeliyle özet üretmek, kaynak zaman damgasını göstermek ve kullanıcıya sonuç sunmak. Kod şu anda geliştiriciye metin/ileti aktaran bir ticari analiz sunucusu veya reklam takibi tanımlamıyor. Bu beyan, son sürümde harici ağ taraması ve dağıtım bağımlılıkları denetlenmeden **kesin ağ garantisi** değildir.

## 3. İnternet bağlantısı

İsteğe bağlı Qwen ONNX modelinin ilk kurulumu sırasında kullanıcının açık komutuyla Hugging Face üzerinden model dosyaları indirilir. Bu indirme, özetlenmek istenen e-posta/metni modele göndermek için değildir. Derleme sırasında npm bağımlılıkları ağdan indirilebilir. Chrome yerleşik AI özelliği etkinleştirilirse tarayıcının kendi model dağıtım mekanizmasının ayrıca belgelenmesi gerekir. Reklam/analitik amaçlı otomatik veri paylaşımı kapsam dışıdır.

## 4. Üçüncü taraf platformlar

Gmail, Outlook ve YouTube içerikleri kullanıcıların açık oturumları içinde görünür DOM erişimiyle işlenebilir. OkuLens bu platformların sahibi veya resmî ortağı değildir. Bu hizmetlerin kullanım koşulları ve veri/ürün politikaları ayrıca uygulanır. Herhangi bir sağlayıcıdan kullanıcıya ait olmayan içeriğin satılması veya yeniden yayımlanması için izin çıktığı varsayılmaz.

## 5. Saklama ve silme

`chrome.storage.local` içindeki tercihler kullanıcı tarafından değiştirilebilir. `chrome.storage.session` verileri tarayıcı oturumuna bağlı geçicidir. Paneldeki `Temizle` düğmesi ilgili sekmenin saklı özetini kaldırır. Tarayıcı uzantısını kaldırma ve tarayıcı verisini silme seçenekleri kullanıcıya açıktır. Dışa aktarılan yerel dosyalar tarayıcı uzantısı tarafından otomatik silinmez. Model dosyaları kullanıcı isteğiyle `npm run model:remove -- --confirm` komutuyla kaldırılır.

## 6. Güvenlik, sınırlamalar, kullanıcı hakları

Hassas iş e-postaları/kişisel verileri işleyen kullanıcılar cihaz güvenliğini sağlamalıdır. Geliştirici, kullanıcı içeriğini destek amacıyla otomatik görmez. Güvenlik soruları, erişim/silme talepleri ve mevzuat kapsamındaki başvurular için **yayımlama öncesinde** gerçek yayıncı iletişim kanalı duyurulmalıdır. Model çıktısının doğruluğu garanti edilmez; kaynakla kontrol edilmelidir.

## 7. Ticari yayın için engelleyici eksikler

- Gerçek yayıncı/tüzel kişilik ve geçerli destek/iletişim adresi.
- Sürümde kullanılan bütün kodun gerçek ağ ve veri akışı denetimi.
- Chrome Web Store kullanıcı verisi sınıflandırması ve zorunlu politikaya erişilebilir URL.
- Türkiye KVKK ve varsa GDPR uygunluğunun uygulanabilirlik ve rol temelli uzman incelemesi.
- Gmail/Outlook/YouTube hizmet şartı ve tarayıcı mağaza kabul süreci.

**Karar:** Bu taslak tek başına ticari ürünün gizlilik hukuku uygunluğunu kanıtlamaz.
