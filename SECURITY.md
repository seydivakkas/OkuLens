# Güvenlik bildirimi

OkuLens, kullanıcı tetiklemeli ve yerel-öncelikli çalışma amacına sahiptir. P0 prototipi güvenlik denetiminden geçmemiştir; mağazaya hazır değildir.

Bir güvenlik sorunu fark ederseniz ayrıntılı exploit/kişisel e-posta içeriğini herkese açık GitHub issue'suna koymayın. GitHub güvenlik bildirim özelliği etkinse özel vulnerability report kullanın; değilse proje sahibinden özel iletişim kanalı isteyin.

- Sayfa içeriği güvenilmeyen girdidir.
- Varsayılan üretken veri akışı uzak LLM API'sine gönderilmez.
- Yetkiler asgari tutulur; geniş host erişimi önceden onay gerektirir.
- Gerçek kullanıcı verileri test fixtures olarak git deposuna eklenmez.
