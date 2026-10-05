# Rekor Kır 🏆

Telefonda kullanım rekorlarını kırmak için yapılmış, kurulum gerektirmeyen bir mobil web uygulaması (PWA).

## Özellikler

- **⏱️ Oturum sayacı**: Uygulama ekrandayken süre işler. En uzun oturum rekorunu geçince konfeti ve titreşim gelir.
  Başka uygulamaya geçip 30 saniye içinde dönersen oturum devam eder. Ekran, destekleyen tarayıcılarda kendiliğinden kararmaz (Wake Lock).
- **📱 Günlük rekor ve seri**: Bugünkü toplam süre, en iyi gün, son 7 günün grafiği ve art arda kullanılan gün serisi.
- **🎮 Mini oyunlar** (her birinin kendi rekoru var):
  - ⚡ *Hızlı Dokun*: 10 saniyede en çok dokunuş
  - 🎯 *Refleks*: Ekran yeşile dönünce en hızlı tepki (ms)
  - ✋ *Bırakma*: Parmağı ekranda en uzun süre tutma
- **🏅 Rozetler**: 5 dk / 30 dk / 1 sa / 3 sa oturum, 3 / 7 / 30 gün seri, günde 2 saat ve diğerleri.
- Tüm veriler cihazda (`localStorage`) tutulur. İnternet olmadan da çalışır.

## Çalıştırma

Herhangi bir statik sunucu yeterli:

```bash
python3 -m http.server 8080
```

Ardından telefondan `http://<bilgisayar-ip>:8080` adresini aç. Ana ekrana eklemek için:
**Android Chrome** → menü → *Ana ekrana ekle*, **iPhone Safari** → Paylaş → *Ana Ekrana Ekle*.

Service worker ve Wake Lock için HTTPS gerekir (localhost hariç). GitHub Pages ile yayınlarsan ikisi de çalışır:
repo ayarları → *Pages* → bu dalı seç.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Arayüz (Oturum, Oyunlar, Rekorlar sekmeleri) |
| `style.css` | Mobil öncelikli koyu tema |
| `app.js` | Süre takibi, rekorlar, oyunlar, rozetler |
| `sw.js` | Çevrimdışı önbellek |
| `manifest.json`, `icons/` | Ana ekrana eklenebilir uygulama ayarları |
