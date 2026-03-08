Next Gen Voice Assistant (PWA)

Node.js, Google Gemini AI ve ElevenLabs ile güçlendirilmiş; mobil uyumlu (PWA), akıllı ve hibrit ses motoruna sahip, kişisel sesli asistan projesi.

Projenin Arayüzünden Birkaç Görsel

 <img width="1891" height="812" alt="image" src="https://github.com/user-attachments/assets/decfd672-fa7a-4814-9ab8-98b0987fcc82" />

 <img width="1918" height="908" alt="image" src="https://github.com/user-attachments/assets/aa0d1903-9aa0-44ff-8dbd-78427d9396ba" />



Proje Hakkında

Bu proje, standart bir sesli asistanın ötesine geçerek, kullanıcının doğal dildeki sorularını anlayan, bağlam kurabilen ve gerçek zamanlı veri (Haberler, Borsa, Hava Durumu) sunabilen modern bir web uygulamasıdır.

Progressive Web App (PWA) teknolojisi ile geliştirilmiştir, bu sayede mobil cihazlarda (iOS/Android) tarayıcı çubuğu olmadan native uygulama deneyimi sunar.

Öne Çıkan Özellikler

Çift Beyinli Yapı (Dual-Core AI)

Dialogflow (NLP): "Hava nasıl?", "Dolar ne kadar?" gibi spesifik komutları milisaniyeler içinde işler ve API'leri tetikler.

Google Gemini AI (LLM): Karmaşık, felsefi veya sohbet tabanlı soruları ("Evrenin anlamı nedir?", "Bana bir şiir yaz") yapay zeka ile yanıtlar.

Akıllı Hibrit Ses Motoru (Smart Voice Fallback)

Sistemin çökmesini engelleyen ve maliyet optimizasyonu sağlayan özel bir algoritma geliştirilmiştir:

Öncelik (High Quality): Sistem önce ElevenLabs (Ultra Gerçekçi AI Ses) API'sini dener.

Yedekleme (Fallback): Eğer kota biterse veya API hatası alınırsa, kullanıcı hissetmeden anında Google TTS (Ücretsiz) servisine geçer.

Proxy İndirici: Tarayıcıların güvenlik (CORS) engellerini aşmak için ses dosyaları Backend'e indirilip, Frontend'e güvenli bir stream olarak iletilir.


Günaydın Rutini

Tek bir "Günaydın" komutu ile:

Tarih ve Saat

Konum Bazlı Hava Durumu (OpenWeather)

Canlı Döviz Kurları (Frankfurter API)

Gündem Haberleri (Google News RSS Parser)
...hepsi derlenir ve kişiye özel bir özet olarak sesli okunur.

Kullanılan Teknolojiler

Alan

Teknolojiler

Backend

Node.js, Express.js, Axios

Frontend

HTML5, CSS3 (Tailwind CSS), Vanilla JS

AI & NLP

Google Gemini Pro, Dialogflow ES

Voice (TTS)

ElevenLabs API, Google TTS (Custom Implementation)

Data Sources

OpenWeatherMap API, Frankfurter API, RSS Parser

Web APIs

Web Speech API (STT), Wake Lock API, PWA Manifest

Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda çalıştırmak için adımları izleyin:

1. Depoyu Klonlayın

git clone [https://github.com/KULLANICI_ADIN/next-gen-voice-assistant.git](https://github.com/KULLANICI_ADIN/next-gen-voice-assistant.git)
cd next-gen-voice-assistant


2. Bağımlılıkları Yükleyin

cd backend
npm install


3. Çevre Değişkenlerini (.env) Ayarlayın

backend klasörü içinde .env dosyası oluşturun ve gerekli API anahtarlarını girin. (Örnek yapı .env.example dosyasında mevcuttur).

PORT=5000
DIALOGFLOW_PROJECT_ID=...
DIALOGFLOW_PRIVATE_KEY=...
GEMINI_API_KEY=...
OPENWEATHER_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
# Haberler (Google RSS) için API Key gerekmez.


4. Başlatın

npm run dev


Tarayıcınızda http://localhost:5000 adresine gidin.

Güvenlik Notları

API Key Gizliliği: Tüm API istekleri Backend (Node.js) üzerinden yapılır. Frontend tarafında hiçbir API anahtarı saklanmaz.

CORS Proxy: Dış kaynaklardan (Google, RSS) gelen veriler sunucu tarafında işlenerek güvenli hale getirilir.

Geliştirici: [Batuhan] - 2025
