# OkuLens — GitHub'a yükleme (Windows / PowerShell)

**Durum:** GitHub deposu oluşturulmadı. Bu paketi GitHub'a aktarmak için aşağıdaki işlemler yapılmalıdır. Komutlar kullanıcı tarafından çalıştırılana kadar uzaktaki repo bağlantısı varmış gibi gösterilmez.

## A — GitHub web arayüzünden yeni depo

1. GitHub'da `https://github.com/new` adresini açın.
2. Owner olarak kendi kullanıcı hesabınızı seçin.
3. Repository name = `OkuLens`.
4. Description = `Offline-first MV3 Chrome/Edge summarization extension with native side panel.`.
5. Başlangıçta Private, hazır olduğunda Public seçebilirsiniz.
6. **README, .gitignore veya license ile başlatmayın** (pakette zaten var).
7. `Create repository` ile depoyu oluşturun.

## B — Kaynak dosyalarını yükleme

`OkuLens` klasörüne PowerShell'de geçin ve:

```powershell
git init -b main
git add .
git commit -m "feat: OkuLens MV3 başlangıç prototipi ve mimari belgeler"
git remote add origin https://github.com/seydivakkas/OkuLens.git
git push -u origin main
```

GitHub oturum açma, 2FA veya kimlik doğrulaması istenirse ilgili hesabınız üzerinden yetki verin. Başka hesaba push etmeyin.

## C — Repo oluşturulduktan sonra bağlı GitHub araçları

Depo erişilebilir hale geldikten sonra sonraki kod değişiklikleri GitHub bağlantısından issue/branch/PR/commit ile sürdürülebilir. Gizli veriler (`.env`, API key, mail gövdesi, gerçek kullanıcı verileri) commit edilmemelidir.

## D — İlk kilometre taşları

- `P0`: başlangıç commit'i ve README.
- `P1`: Readability modülü ve semantik kaynak testleri.
- `P2`: Gmail/Outlook için modüler DOM adapterleri.
- `P3`: YouTube transkript strateji testi.
- `P4`: Hiyerarşik summary engine.
- `P5`: Yerel TR ONNX benchmark ve doğrulama.
