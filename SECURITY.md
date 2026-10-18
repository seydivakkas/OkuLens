# Güvenlik bildirimi

OkuLens, kullanıcı tetiklemeli ve yerel-öncelikli çalışma amacına sahiptir. v0.4.0 prototipi tam güvenlik / Windows Chrome-Edge / KVKK / mağaza denetiminden geçmemiştir; ticari yayın HOLD.

Bir güvenlik sorunu fark ederseniz ayrıntılı exploit/kişisel e-posta içeriğini herkese açık GitHub issue'suna koymayın. GitHub güvenlik bildirim özelliği etkinse özel vulnerability report kullanın; değilse proje sahibinden özel iletişim kanalı isteyin.

- Sayfa içeriği güvenilmeyen girdidir.
- Varsayılan üretken veri akışı uzak LLM API'sine gönderilmez.
- Yetkiler asgari tutulur; geniş host erişimi önceden onay gerektirir.
- Gerçek kullanıcı verileri test fixtures olarak git deposuna eklenmez.

## TİCARİ-003 gizlilik ve sorumlu açıklama sınırları

- Kullanıcı isteğiyle açılan e-posta gövdesi ad, e-posta adresi ve özel nitelikli kişisel veri içerebilir; bu metin otomatik anonimleştirilmez.
- İzinler activeTab/scripting ile sınırlandırılır; model indirmesi ayrı Hugging Face opsiyonel host iznidir.
- chrome.storage.local yalnızca TRUSTED_CONTEXTS erişimiyle başlatılır; bunun gerçek Chrome/Edge teyidi ve sürüm uyumu ayrı kabul kapısıdır.
- Model ilk indirmede çevrimiçi olabilir, ancak ağsız üretim henüz doğrulanmadı. Modelin OPFS'de bulunması çalışan ONNX anlamına gelmez.
- Güvenlik raporlarında ham Gmail içeriği, gizli URL, token, lisans anahtarı, kişisel veri veya tam HAR dosyası kullanmayın. Gerekiyorsa ilgili kanıtı önce yerelde gizlilik kontrolünden geçirin.
- Sorumlu bildirim ve gerçek yayıncı iletişim kanalı yayımlama öncesi netleştirilmeli; GitHub issue'su hassas açıklama kanalı değildir.

[TİCARİ-003 veri akış ve güvenlik sözleşmesi](docs/TICARI_003_GIZLILIK_KVKK_GUVENLIK.md).
