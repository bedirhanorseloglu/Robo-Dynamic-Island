# Robo Durum Animasyonları Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Robo'ya mevcut bilgisayar ve uygulama olaylarına karşılık gelen, rastgele olmayan animasyonlar eklemek ve arka plan kaynak kullanımını düşük tutmak.

**Architecture:** `App.jsx` zaten sahip olduğu medya, pano, bildirim, pil, odak sayacı, sohbet ve sekme durumlarından tek bir kısa süreli Robo tepkisi üretir. `RoboEyes.jsx` bu tepkiyi normal mood'dan ayrı, bir defalık animasyon olarak gösterir; `styles.css` animasyonları tanımlar. Yeni Electron izleyicisi, polling veya interval eklenmez; görünürlük kaybında geçici tepkiler temizlenir.

**Tech Stack:** React 19, Electron 35 IPC/preload, CSS animations, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-10-robo-context-animations-design.md`

## Global Constraints

- Sürekli yeni Windows taraması, polling veya arka plan servisi ekleme.
- Mevcut IPC olaylarını ve React durumlarını kullan.
- Pano içeriğini animasyon katmanına taşıma; yalnızca pano güncelleme olayı tepkiyi tetiklesin.
- Rastgele idleAction zamanlayıcısını kaldır; açılış, doğal göz kırpma ve kullanıcı dokunuşunu koru.
- Aynı anda gelen olayları birleştir/önceliklendir; animasyon kuyruğu oluşturma.
- Arayüz görünür değilken tetiklenen animasyonları temizle ve yeni görsel tepki oynatma.
- `prefers-reduced-motion` desteğini koru.

## Review Focus

- Hızlı pano güncellemeleri: tek bir kısa yakalama tepkisine birleşmeli, içerik okunmamalı/aktarılmamalı.
- Yoğun bildirimler: tepki animasyonları üst üste yığılmamalı; öncelik sırası korunmalı.
- Medya duraklatma/başlatma: yalnızca durum geçişinde animasyon olmalı; her medya güncellemesinde tekrar etmemeli.
- Arka plana geçiş: geçici animasyonlar temizlenmeli, geri dönünce eski olay yeniden oynatılmamalı.
- Çift RoboEyes kullanımı (ada ve Robo paneli): aynı olay iki ayrı rastgele animasyon üretmemeli.

---

### Task 1: Durum tepkisi olaylarını birleştir

**Files:**
- Modify: `src/App.jsx` (Robo mood/event state, mevcut IPC listener'ları, medya/odak/sohbet/pil geçişleri)

**Interfaces:**
- Consumes: `window.twocode.onMediaUpdate`, `onClipboardUpdate`, `onWindowsNotification` ve var olan `timerRunning`, `batteryPercent`, `batteryCharging`, `roboLoading`, `activeTab` durumları.
- Produces: `RoboEyes` için bir defalık `reaction` adı ve değişim anahtarı; örnek isimler `media-start`, `media-pause`, `clipboard`, `focus-start`, `focus-complete`, `notification`, `battery-low`, `charging`, `thinking`, `success`, `error`, `tab-change`.

- [x] Olaylardan yalnızca durum geçişi/olay anında tepki üret; sık medya güncellemelerini ve pano tekrarlarını birleştir.
- [x] Önceliği kritik pil/bildirim > kullanıcı dokunuşu/sohbet > görev/medya > pano/sekme olarak uygula; yeni olayı önceki tepkinin kuyruğuna ekleme.
- [x] Pano listener'ında yalnızca liste değişikliği sinyali kullan; clipboard metnini reaction payload'ına koyma.
- [x] Olay listener'larının cleanup işlevlerini ve geçici timer cleanup'ını koru; yeni periyodik timer kullanma.

### Task 2: Robo animasyonlarını olay anlamlarına bağla

**Files:**
- Modify: `src/RoboEyes.jsx` (reaction prop ve animasyonun tek seferlik yaşam döngüsü)
- Modify: `src/styles.css` (reaksiyon keyframe ve görsel durumları)

**Interfaces:**
- Consumes: `RoboEyes({ mood, reaction, reactionKey, onPoke, size, batteryPercent, batteryCharging })`.
- Produces: Her reaction için kısa, belirgin, olayla ilişkili göz/parıltı/hareket animasyonu; animasyon sonunda temel mood'a dönüş.

- [x] Rastgele idleAction timer ve rastgele peek/sleep/dance/boop üretimini kaldır; startup, doğal blink ve poke tepkilerini koru.
- [x] Medya için ritim/dinleme, pano için yakalama parıltısı, odak için kararlı bakış/rahatlama, bildirim/ajanda için kısa yönelme, pil/şarj için mevcut battery göstergesiyle uyumlu tepki, Robo sohbeti için düşünme/başarı/hata ve sekme/uygulama aksiyonu için bakış tepkisini tanımla.
- [x] Aynı reaction arka arkaya geldiyse `reactionKey` ile yeni olayı ayırt et; event tamamlanınca ana mood'u değiştirmeden sınıfı temizle.
- [x] Azaltılmış hareket tercihinde sürekli/parlak hareketleri kapat; tek seferlik durumun anlamı statik görünüşle de anlaşılsın.

### Task 3: Görünürlük ve entegrasyon davranışını tamamla

**Files:**
- Modify: `src/App.jsx` (visibility cleanup ve iki RoboEyes çağrı noktası)
- Modify: `src/RoboEyes.jsx` (görünür değilken reaction temizliği)

**Interfaces:**
- Consumes: `document.visibilityState`, Task 1'de üretilen son reaction.
- Produces: Görünür arayüzde tek tepki; gizli arayüzde temizlenmiş geçici animasyon durumu.

- [x] `visibilitychange` dinleyicisini cleanup ile kur; görünürlük `hidden` olduğunda yalnızca geçici reaction/timerları temizle.
- [x] Ada ve Robo panelindeki RoboEyes örneklerinin aynı reaction state'ini kullandığını doğrula; temel mood, şarj ve pil davranışını koru.
- [x] Proje derlemesini `npm.cmd run build` ile doğrula; CSS animasyon adları ve JSX prop kullanımları derlemede hatasız olmalı.
- [x] Uygulama UI'sini çalışma sırasında görünmez/arka plan durumuna alıp geri getirerek mevcut otomatik göz kırpma ve event reaksiyonlarının davranışını gözle kontrol et.

