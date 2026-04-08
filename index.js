const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const HF_API_KEY = process.env.HF_API_KEY || "YOUR_HF_TOKEN"; 
const GROQ_API_KEY = process.env.GROQ_API_KEY || "YOUR_GROQ_KEY";
const PENALTY_TIME = 2 * 60 * 60 * 1000; 

const userDatabase = new Map();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('🛡️ ULTIMATE AI FORTRESS WITH CALL GUARD IS LIVE!');
});

// --- AI Voice Generator ---
async function sendVoiceWarning(sender, text) {
    const gtts = new gTTS(text, 'en');
    const tempPath = path.join(__dirname, 'warning.mp3');
    return new Promise((resolve, reject) => {
        gtts.save(tempPath, async function (err) {
            if (err) return reject(err);
            const media = MessageMedia.fromFilePath(tempPath);
            await client.sendMessage(sender, media, { sendAudioAsVoice: true });
            fs.unlinkSync(tempPath);
            resolve();
        });
    });
}

// --- NEW: CALL GUARD SYSTEM ---
client.on('call', async (call) => {
    console.log(`📞 Call detected from: ${call.from}`);
    
    // 1. വിളിച്ച ഉടനെ കട്ട് ചെയ്യുന്നു
    await call.reject(); 
    
    // 2. അവർക്ക് ഒരു വാർണിംഗ് മെസ്സേജ് അയക്കുന്നു
    await client.sendMessage(call.from, "🚫 **AI SECURITY ALERT**\n\nMuthee has disabled WhatsApp calls for security reasons. Your call has been auto-rejected. Please leave a message, and the AI will analyze it.");
    
    // 3. ഒരു വോയിസ് വാർണിംഗ് കൂടി കൊടുത്തു പവർ കാണിക്കാം!
    await sendVoiceWarning(call.from, "Voice calls are not allowed. Please send a text message for AI verification.");
});

// --- Groq AI Intelligent Response ---
async function callGroqAI(text) {
    try {
        const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "You are Muthee's AI Personal Assistant. Be cool, smart, and witty." },
                { role: "user", content: text }
            ]
        }, {
            headers: { Authorization: `Bearer ${GROQ_API_KEY}` }
        });
        return res.data.choices[0].message.content;
    } catch (e) {
        return "🤖 AI Interface: Muthee is busy. Message logged.";
    }
}

// --- Main Security Engine ---
client.on('message', async (msg) => {
    const sender = msg.from;
    const now = Date.now();
    const currentHour = new Date().getHours();

    if (currentHour >= 23 || currentHour < 6) {
        if (!msg.fromMe) return await msg.reply("💤 Muthee is sleeping. Access Denied.");
    }

    if (userDatabase.has(sender) && now < userDatabase.get(sender).blockUntil) return;

    if (msg.hasMedia && msg.type === 'image') {
        const userData = userDatabase.get(sender) || { photoCount: 0 };
        userData.photoCount++;
        userDatabase.set(sender, userData);
        if (userData.photoCount > 3) {
            userDatabase.set(sender, { blockUntil: now + PENALTY_TIME });
            return await msg.reply("🚫 SPAM DETECTED. Banned for 2 hours.");
        }
        return await msg.reply("🎨 Image logged by AI.");
    }

    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
            { inputs: msg.body, parameters: { candidate_labels: ["emergency", "casual", "negative", "stranger"] } },
            { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
        );

        const topLabel = response.data.labels[0];

        if (topLabel === "emergency") {
            const token = Math.floor(1000 + Math.random() * 9000);
            await msg.reply(`✅ EMERGENCY VERIFIED. TOKEN: ${token}`);
            await sendVoiceWarning(sender, "Emergency access granted. Your token is " + token);
        } 
        else if (topLabel === "stranger" && !msg.fromMe) {
            await msg.reply("🕵️‍♂️ Stranger detected. Access restricted.");
        }
        else if (topLabel === "negative") {
            userDatabase.set(sender, { blockUntil: now + PENALTY_TIME });
            await msg.reply("🚫 Negativity detected. Access revoked.");
        }
        else {
            if (!msg.fromMe) {
                const aiReply = await callGroqAI(msg.body);
                await msg.reply(`🤖 AI: ${aiReply}`);
            }
        }
    } catch (e) {
        console.log("AI Busy.");
    }
});

client.initialize();
