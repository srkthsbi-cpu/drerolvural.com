DOÇ. DR. EROL VURAL – CLOUDFLARE PAGES SÜRÜMÜ

Bu paket PHP içermez. Cloudflare Pages Advanced Mode + _worker.js kullanır.

İÇERİK
- 5 ana sayfa + blog detay sayfası
- 3 banner slider
- 8 dil: TR, EN, DE, AR, RU, AZ, SQ, NL
- Ortak dil sistemi ve localStorage
- Arapça RTL
- D1 tabanlı CMS
- R2 tabanlı görsel yükleme
- /erol_admin/ yönetim paneli
- Dashboard, banner yönetimi, blog/makale, SEO, site ayarları, güvenlik, yedek
- CSRF, Secure/HttpOnly/SameSite oturum, giriş deneme limiti, audit log
- Dinamik sitemap.xml

ADMIN KURULUMU
Detaylı adımlar: ADMIN-CLOUDFLARE-KURULUM.txt

Binding isimleri:
DB = D1 database
aMEDIA = R2 bucket (doğru isim: MEDIA)
Secret:
ADMIN_INITIAL_PASSWORD

Cloudflare Pages Dashboard üzerinden binding/secret ekledikten sonra REDEPLOY yapın.
