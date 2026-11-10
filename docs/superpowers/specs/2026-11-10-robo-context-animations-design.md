# Robo Durum Animasyonları Tasarım Notu

## Amaç
Robo'nun animasyonları bilgisayarda veya TwoCode'da gerçekleşen anlamlı olayları anlatsın; rastgele gösteri animasyonları olmasın. Arka plan kaynak kullanımı düşük ve öngörülebilir kalsın.

## Hedefler
- Medya, pano, odak sayacı, ajanda/bildirim, pil, soru-cevap ve uygulama etkileşimlerini görsel tepkilere bağlamak.
- Olay başına kısa, ayırt edilebilir animasyon ve olay bitişinde doğal normale dönüş sağlamak.
- Aynı anda gelen olayları sınırlamak; öncelik ve kısa bekleme ile animasyon yığılmasını önlemek.
- Uygulama görünür değilken görsel animasyonları/tetiklenen hareketleri durdurmak.
- Sürekli yeni Windows taraması veya polling eklememek; mevcut IPC, React durumları ve olayları kullanmak.

## Kapsam dışı
- Yeni arka plan servisi, sürekli sensör/uygulama taraması veya yeni ağ izleyicisi.
- Robo'nun kullanıcı adına Windows ayarı ya da uygulama eylemi gerçekleştirmesi.
- Ses efektlerini yeniden tasarlamak.

## Yaklaşımlar
- **Olaylara bağlı, ifade odaklı animasyonlar (seçilen):** Var olan event/state bağlantılarına kısa göz, parıltı ve hareket dizileri eklenir. Kaynak yükü düşüktür; her tepkinin anlamı nettir.
- **Sürekli çevre izleme:** Windows'u daha sık tarayarak daha fazla olayı yakalamak mümkün olur; RAM/CPU ve izin/mahremiyet maliyeti bu küçük eşlikçi uygulama için uygun değildir.

## Olay ve tepki eşlemesi
- Açılış: mevcut uyanma dizisi.
- Medya başladı/değişti/durakladı: müzikte ritim; duraklamada dinleme pozu. Yalnızca anlamlı geçişte oynatılır.
- Pano güncellendi: tek seferlik yakalama/parıltı; kısa sürede tekrar eden güncellemeler birleştirilir, içerik Robo animasyonuna aktarılmaz.
- Odak başladı/bitti: kararlı odak bakışı, bitişte rahatlama/esneme.
- Ajanda/bildirim geldi: kısa yönelme ve haber tepkisi; yoğun akışta animasyonlar birleştirilir.
- Pil azaldı/şarja takıldı: mevcut pil göstergeleriyle uyumlu, tek seferlik düşük pil/şarj geçişi.
- Robo sorusu gönderildi/yanıtlandı/başarısız oldu: düşünme, başarı veya üzgün tepki.
- Uygulama/sekme değişti: bakışın yeni kontrole yönelmesi; yalnızca seçili animasyon alanında.
- Kullanıcı Robo'ya tıkladı: mevcut wink/boop tepkisi korunur.

## Davranış ve kaynak sınırları
Animasyonlar rastgele sırada oynatılmaz. Mevcut rastgele idleAction zamanlayıcısı kaldırılır; doğal göz kırpma, ilk açılış ve kullanıcı dokunuşu korunur. Tepkiler kısa süreli olur ve olay bittiğinde temel moda döner. Öncelik sırası: kritik pil/bildirim, kullanıcı etkileşimi, aktif görev/medya, düşük öncelikli pano/sekme tepkisi. Yeni setInterval/polling veya Electron izleyicisi eklenmez. Document görünürlüğü değişince yalnızca mevcut UI animasyon durumları temizlenir; ana süreçteki mevcut servisler bu değişiklikten etkilenmez.

## Açık uygulama kararları
- Pano tepkisi yalnızca kopyalama olayı olduğunu gösterir; kopyalanan metin Robo'ya veya animasyon katmanına verilmez.
- Bildirim içeriği ve özel metinler animasyon kararında kullanılmaz; olayın türü yeterlidir.
- Animasyon süreleri kısa tutulur; reduced-motion ayarına saygı gösterilir.
