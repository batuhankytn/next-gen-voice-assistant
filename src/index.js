import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SessionsClient } from '@google-cloud/dialogflow';
import crypto from 'node:crypto';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Parser from 'rss-parser';

// .env dosyasını yükle
dotenv.config();

const parser = new Parser();
const app = express();
const PORT = process.env.PORT || 5000;
const LANGUAGE_CODE = 'tr-TR';
const DEFAULT_CITY = 'Afyon'; 

// --- BAŞLANGIÇ KONTROLLERİ ---
console.log("------------------------------------------------");
console.log("🚀 SUNUCU BAŞLATILIYOR...");
if (process.env.ELEVENLABS_API_KEY) {
    console.log("✅ ElevenLabs API Anahtarı: OK");
} else {
    console.log("ℹ️ ElevenLabs API Anahtarı YOK (Sadece Google TTS kullanılacak)");
}
console.log("------------------------------------------------");

const dialogflowConfig = {
    projectId: process.env.DIALOGFLOW_PROJECT_ID,
    credentials: {
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
};

const sessionClient = dialogflowConfig.projectId ? new SessionsClient(dialogflowConfig) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => { res.json({ status: 'ok' }); });

// --- GOOGLE TTS İNDİRİCİ (Yedek Güç) ---
// Link vermek yerine sesi sunucuya indirip Base64 olarak gönderir.
async function downloadGoogleTTS(text) {
    try {
        const cleanText = text.replace(/[◆◇☕🚀📅⏰🌤️💰📰]/g, '').replace(/[\*\#]/g, '').replace(/\s+/g, ' ').trim();
        if (!cleanText) return [];

        // Metni akıllıca böl
        const sentences = cleanText.match(/[^.?!]+[.?!]+|[^\.?!]+$/g) || [cleanText];
        const finalChunks = [];

        sentences.forEach(sentence => {
            if (sentence.length < 200) {
                finalChunks.push(sentence.trim());
            } else {
                const subParts = sentence.match(/.{1,180}(\s|$)/g) || [sentence];
                subParts.forEach(p => finalChunks.push(p.trim()));
            }
        });

        const audioPromises = finalChunks
            .filter(t => t.length > 0)
            .map(async (chunk) => {
                try {
                    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=tr&client=tw-ob`;
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    const base64 = Buffer.from(response.data).toString('base64');
                    return { url: `data:audio/mpeg;base64,${base64}` };
                } catch (err) {
                    console.error(`Google parça indirme hatası:`, err.message);
                    return null;
                }
            });

        const results = await Promise.all(audioPromises);
        return results.filter(r => r !== null);

    } catch (e) {
        console.error("Google TTS İndirme Hatası:", e);
        return [];
    }
}

// --- AKILLI SES YÖNETİCİSİ (YENİ MANTIK) ---
async function generateSmartVoice(text) {
    const cleanText = text.replace(/[◆◇☕🚀📅⏰🌤️💰📰]/g, '').replace(/[\*\#]/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return [];

    // 1. ÖNCELİK: ELEVENLABS (Kalite)
    // Metin uzunluğu ne olursa olsun önce burayı deneriz.
    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
        try {
            console.log("🎙️ ElevenLabs deneniyor...");
            
            const response = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
                {
                    text: cleanText,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                },
                {
                    headers: { 
                        'xi-api-key': process.env.ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );

            const audioBase64 = Buffer.from(response.data).toString('base64');
            console.log("✅ ElevenLabs BAŞARILI! Kaliteli ses gönderiliyor.");
            return [{ url: `data:audio/mpeg;base64,${audioBase64}` }];

        } catch (error) {
            // ElevenLabs hata verirse (Kota bitti, API hatası vb.)
            console.warn("⚠️ ElevenLabs kullanılamadı (Kota bitmiş olabilir):", error.response?.status || error.message);
            console.log("🔄 Otomatik olarak Google TTS'e (Ücretsiz) geçiliyor...");
        }
    } else {
        console.log("ℹ️ ElevenLabs anahtarı yok, Google TTS kullanılıyor.");
    }

    // 2. YEDEK: GOOGLE TTS (Ücretsiz)
    // Yukarıdaki blok çalışmazsa veya hata verirse burası devreye girer.
    return await downloadGoogleTTS(cleanText);
}

app.post('/api/query', async (req, res) => {
    const { text, sessionId } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Metin bulunamadı' });

    const lowerText = text.toLowerCase();
    let customAction = null;
    let customReply = null;

    if (lowerText.includes("karanlık mod") || lowerText.includes("koyu tema")) {
        customReply = "Tamamdır, karanlık moda geçiyorum. 🌙"; customAction = "set_theme_dark";
    } else if (lowerText.includes("aydınlık mod") || lowerText.includes("açık tema")) {
        customReply = "Hemen aydınlık moda geçiyorum. ☀️"; customAction = "set_theme_light";
    }

    if (customAction) {
        const audioUrls = await generateSmartVoice(customReply);
        return res.json({ reply: customReply, action: customAction, intent: 'theme_change', audioUrls });
    }

    if (!sessionClient) return res.status(500).json({ error: 'Dialogflow eksik.' });

    try {
        const sessionPath = sessionClient.projectAgentSessionPath(dialogflowConfig.projectId, sessionId || crypto.randomUUID());
        const request = { session: sessionPath, queryInput: { text: { text, languageCode: LANGUAGE_CODE } } };
        const [response] = await sessionClient.detectIntent(request);
        const result = response.queryResult;
        let reply = result?.fulfillmentText || 'Şu an yanıt oluşturamıyorum.';
        let intentName = result?.intent?.displayName || "";

        console.log(`GELEN NİYET: "${intentName}" | KULLANICI: "${text}"`);

        if (lowerText.includes('saat') || lowerText.includes('tarih') || lowerText.includes('gün')) { if (intentName.toLowerCase().includes('doviz')) intentName = 'Default Fallback Intent'; }
        if (lowerText.includes("günaydın") || lowerText.includes("iyi sabahlar")) intentName = 'Gunaydin';

        // --- 1. DÖVİZ ---
        if (intentName.toLowerCase().includes('doviz-sorgula')) {
            let miktar = 1; if (result.parameters?.fields?.miktar?.numberValue) miktar = result.parameters.fields.miktar.numberValue;
            let kaynakPara = 'USD'; const hamKaynak = result.parameters?.fields?.parabirimi; if (hamKaynak?.stringValue) kaynakPara = hamKaynak.stringValue;
            let hedefPara = 'TRY'; const hamHedef = result.parameters?.fields?.hedef_parabirimi; if (hamHedef?.stringValue) hedefPara = hamHedef.stringValue;
            if (['PARA', 'KAÇ', 'NE'].includes(hedefPara.toUpperCase())) hedefPara = 'TRY'; if (hedefPara === 'TL') hedefPara = 'TRY';
            try { const apiResponse = await axios.get(`https://api.frankfurter.app/latest?amount=${miktar}&from=${kaynakPara}&to=${hedefPara}`); const sonuc = apiResponse.data.rates[hedefPara]; reply = `${miktar} ${kaynakPara}, yaklaşık ${sonuc.toFixed(2).replace('.', ',')} ${hedefPara} değerinde.`; } catch (err) { reply = `Hesaplayamadım.`; }
        }
        // --- 2. HAVA DURUMU ---
        if (intentName === 'Hava-Durumu') {
            let sehir = result.parameters?.fields?.sehir?.stringValue || DEFAULT_CITY;
            try { const apiKey = process.env.OPENWEATHER_API_KEY; const wRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${sehir}&appid=${apiKey}&units=metric&lang=tr`); reply = `${sehir} şu an ${wRes.data.weather[0].description}, sıcaklık ${Math.round(wRes.data.main.temp)} derece.`; } catch (err) { reply = `${sehir} için hava durumuna ulaşamıyorum.`; }
        }
        // --- 3. HABERLER ---
        if (intentName === 'Haberler') {
            try { const feedUrl = 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr'; const feed = await parser.parseURL(feedUrl); const headlines = feed.items.slice(0, 3).map((art, i) => `${i + 1}. ${art.title.split('-')[0].trim()}`).join('. '); reply = `Gündemden başlıklar: ${headlines}`; } catch (err) { reply = "Haber akışına ulaşılamadı."; }
        }
        // --- 4. GÜNAYDIN MODU ---
        if (intentName === 'Gunaydin') {
            try {
                const simdi = new Date(); const tarih = simdi.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }); const saat = simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                const weatherKey = process.env.OPENWEATHER_API_KEY; const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${DEFAULT_CITY}&appid=${weatherKey}&units=metric&lang=tr`; const usdUrl = `https://api.frankfurter.app/latest?from=USD&to=TRY`; const eurUrl = `https://api.frankfurter.app/latest?from=EUR&to=TRY`; const newsUrl = 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr';
                const [weatherRes, usdRes, eurRes, newsRes] = await Promise.allSettled([axios.get(weatherUrl), axios.get(usdUrl), axios.get(eurUrl), parser.parseURL(newsUrl)]);
                let havaMetni = "Bilgi yok"; if (weatherRes.status === 'fulfilled') { const w = weatherRes.value.data; havaMetni = `${w.weather[0].description}, ${Math.round(w.main.temp)}°C (${DEFAULT_CITY})`; }
                let finansMetni = "Bilgi yok"; if (usdRes.status === 'fulfilled' && eurRes.status === 'fulfilled') { const dolar = usdRes.value.data.rates.TRY.toFixed(2).replace('.', ','); const euro = eurRes.value.data.rates.TRY.toFixed(2).replace('.', ','); finansMetni = `Dolar: ${dolar} ₺  |  Euro: ${euro} ₺`; }
                let haberMetni = ""; if (newsRes.status === 'fulfilled') { const articles = newsRes.value.items.slice(0, 3); const basliklar = articles.map(a => '   ◇ ' + (a.title.split('-').slice(0, -1).join('-').trim())).join('\n'); haberMetni = `◆ Gündem Başlıkları:\n${basliklar}`; }
                reply = `Günaydın.\n\n◆ Tarih: ${tarih} | Saat: ${saat}\n◆ Hava Durumu: ${havaMetni}\n◆ Piyasalar: ${finansMetni}\n\n${haberMetni}\n\nGünün harika geçsin.`;
            } catch (err) { reply = "Günaydın. Sistemleri başlatırken ufak bir sorun oldu."; }
        }
        // --- 5. GEMINI AI ---
        if (intentName === 'Default Fallback Intent' && genAI) {
            try { const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); const prompt = `Sen samimi bir asistansın. Soru: "${text}". Cevap (Kısa):`; const resultAI = await model.generateContent(prompt); reply = resultAI.response.text(); } catch (error) { reply = 'Yapay zeka bağlantımda sorun var.'; }
        }

        // Ses oluştur (Önce ElevenLabs dener, olmazsa Google indirir)
        const audioUrls = await generateSmartVoice(reply);
        
        res.json({ reply, intent: intentName, action: null, audioUrls });

    } catch (error) {
        console.error('Genel Hata:', error);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

app.listen(PORT, () => { console.log(`Backend server running on port ${PORT}`); });