# OkuLens — Katkı ve Üçüncü Taraf Kod Kabulü

OkuLens ileride ücretli/kurumsal ürün olarak dağıtılabileceği için yeni katkılar ticari kullanım ve dağıtım haklarını sınırlamamalıdır.

## Kod gönderen herkes için

- Kendinize ait olduğunu ve katkı yapma hakkına sahip olduğunuzu bildiğiniz kodu gönderin.
- Stack Overflow, blog, başka GitHub reposu, temalı şablon, ücretli tasarım dosyası ve AI tarafından üretilen metin/kod **otomatik olarak hakları temizlenmiş** sayılmaz. Üçüncü taraf kaynak/telif bildirimlerini gizlemeyin.
- Dış kütüphaneleri kopyalayıp gömmek yerine, ilgili sürümün lisansı ve NOTICE koşullarını belgeleyin.
- GPL/AGPL/LGPL/SSPL/BSL/NonCommercial türleri veya bilinmeyen lisanslar için önceden teknik ve hukuk incelemesi gerekir.
- Resim, ikon, font, veri seti ve model ağırlıkları koddan bağımsız varlıklar olarak lisans envanterine girer.
- Kullanıcı, kurumsal müşteri veya gerçek e-posta içeriğini test fixture'larına/issue'lara/CI loglarına eklemeyin.
- Bir PR'da kullanılan yeni bileşenin adı, sürümü, upstream lisans bağlantısı, paketlenip paketlenmediği ve ticari dağıtım etkisi açıklanmalıdır.
- `npm run commercial:check`, `npm run check`, `npm test` ve mevcut CI akışları korunur.

## Katkı sahipliği ve lisans değişikliği

Halihazırda yayımlanmış OkuLens kodu MIT lisanslıdır. MIT lisansının mevcut kopyalar için tanıdığı hakları daha sonra tek taraflı geri alma beklentisiyle çalışmayın.

Ayrı bir kapalı kaynak/çift lisanslı ürün için katkı verenlerin telif ve lisans hakları ayrıca düzenlenebilir. Bu dosya **otomatik telif devri, CLA veya başka bir açık lisansın iptali değildir**; hak sahiplerinin açık rızası gerekir. Yeni dış katkılar kabul edilmeden ticari lisans stratejisi belirlenmelidir.

## PR inceleme kontrolü

- [ ] Her yeni kod/model/veri/görsel/font kaynağı listelendi.
- [ ] Ticari kullanım ve yeniden dağıtım hakkı doğrulandı.
- [ ] Özgün lisans ve NOTICE korunuyor.
- [ ] Windows Chrome/Edge / MV3 dağıtımıyla çelişki yok.
- [ ] Harici API anahtarı, ücretli servis, bilinmeyen telemetri eklenmedi.
- [ ] Güvenlik/kişisel veri kapsamı güncellendi.
- [ ] Gerçek kabul olmadan PASS yazılmadı.

Ana referanslar: [Ticari Kullanım Politikası](docs/TICARI_KULLANIM_POLITIKASI.md) ve [TİCARİ-001 Ürün ve Lisans Stratejisi](docs/TICARI_001_URUN_VE_LISANS_STRATEJISI.md).

Yeni Pro/Business kodunun telif sahipliği ve lisansına dair yazılı dayanak belirlenmeden kapalı kaynak ürün adına dış katkı kabul edilmez; mevcut MIT katkı hakları geriye dönük değiştirilmez.
