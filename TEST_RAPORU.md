# Test ve Düzeltme Raporu

Tarih: 8 Kasım 2026
Kapsam: TwoCode Electron + React/Vite uygulamasının statik incelemesi ve üretim derlemesi.

## Bulgular ve düzeltmeler

### QR kod içeriği kapasiteyi aşınca kesiliyordu — Düzeltildi

`src/qrGenerator.js`, en fazla 78 baytlık QR Code version 4-L kapasitesini aşan URL'leri sessizce kesiyordu. Oluşan QR kodu artık yanlış/adresin yalnızca bir kısmını içeriyordu. Kod artık kapasite dışı içerikte açık `RangeError` veriyor ve hiçbir baytı sessizce atmıyor.

## Yapılan kontroller

### LAN üzerinden ajan uç noktalarına erişim — Düzeltildi

`electron/main.cjs` içindeki `/api/agent`, `/twocode-hook` ve `/api/status` yolları paylaşım sunucusu üzerinden ağdaki diğer cihazlara da açıktı. Ajan ve durum istekleri artık yalnızca loopback kaynaklarından kabul ediliyor. Ajan POST gövdeleri 1 MiB ile sınırlandırıldı; bozuk JSON HTTP 400, aşırı büyük gövde HTTP 413 döndürüyor. Gereksiz geniş CORS izni kaldırıldı. Paylaşım sayfasında düz HTTP bağlantısı yanlış biçimde “Encrypted” diye etiketleniyordu; metin “Same network” olarak düzeltildi.

- Güncel `npm run build` — başarılı; Vite 2079 modülü derledi.
- Değişikliklerden sonra dört Electron/Preload dosyası için `node --check` — başarılı.

## Gmail, bildirim ve AI düzeltmeleri (8 Kasım 2026)

- Gmail hesap bağlantısı artık yalnızca girilen adresi yazarak başarılı görünmüyor. Adres oturum açma penceresine `login_hint` olarak aktarılıyor; bağlantı gerçek Gmail oturumundaki Google Account etiketiyle doğrulanıyor. Sayfa içindeki rastgele gönderen adreslerinden hesap seçimi kaldırıldı.
- Gmail'in gizli penceredeki web bildirimleri native Windows toast üretmiyor; TwoCode tarafından alınmaya devam ediyor. 2,5 saniyede bir Gmail yenileme düğmesine tıklayan gereksiz tarayıcı davranışı kaldırıldı.
- Claude ve Gemini istekleri emekli model adlarından güncel modele taşındı. API anahtarı yok, sağlayıcı kapalı ya da istek başarısız olduğunda artık sahte genel cevap yerine okunabilir hata gösteriliyor. Yerel Robo yanıtları yalnızca desteklenen basit sorularda kullanılıyor.
- Claude sohbeti ile Claude Code görev takibinin farklı işlevler olduğu arayüzde belirginleştirildi: sohbet Robo altında, görev listesi “Agents” altında. AI bağlantı ekranındaki sahte “Connected” durumları gerçek “API key saved / No API key” durumlarına çevrildi.
- Güncel üretim derlemesi başarılı; `electron/main.cjs`, `google-bg-preload.cjs` ve `google-preload.cjs` sözdizimi kontrolleri başarılı.

## Windows bildirim sınırı

Uygulama klasörü MSIX/UWP manifesti ve `User Notification Listener` capability içermiyor. Bu nedenle her uygulamanın Windows bildirim geçmişini okuma özelliği mevcut dağıtımda garanti edilemez; Windows bu API için paket capability'si ve kullanıcı izni ister. Aynı nedenle uygulama başka uygulamaların Windows toast banner'larını ya da Windows ses/parlaklık OSD'sini güvenilir biçimde gizleyemez. Bu turda Windows genel ayarlarını değiştirmedim.

- `npm run build` — başarılı; Vite 2079 modülü derledi ve üretim çıktısını oluşturdu.
- `node --check electron/main.cjs` — başarılı.
- `node --check electron/preload.cjs` — başarılı.
- `node --check electron/google-preload.cjs` — başarılı.
- `node --check electron/google-bg-preload.cjs` — başarılı.

## Kapsam sınırları

- Paket test komutu veya otomatik test çerçevesi tanımlı değil; UI ve Electron özellikleri uçtan uca çalıştırılmadı.
- Windows medya oturumu, ağ/telefon paylaşımı, Google oturumu ve bildirimler makineye/hesaba bağlı olduklarından statik inceleme ve derleme ile doğrulanamaz.
- QR algoritmasının tarayıcılarla uçtan uca tarama uyumluluğu ayrıca doğrulanmadı.
- Telefon dosya aktarımı aynı yerel ağda açık kalır. Bu turda aktarım uç noktalarına eşleştirme belirteci eklenmedi; LAN erişimi olan cihazlar hâlâ dosya yükleyip indirebilir.

## Önerilen devam işleri

- Otomatik birim testleri ekleyip QR için 17/18, 32/33, 53/54 ve 78/79 bayt sınırlarını doğrulayın.
- Electron uygulamasını Windows'ta açarak dosya sürükleme, tepsi paylaşımı, medya, bildirim ve Google bağlantısı akışlarını gerçek ortamda deneyin.
