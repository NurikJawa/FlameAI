const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Groq } = require('groq-sdk');
const path = require('path'); // Добавили для работы с путями

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ВАЖНО: говорим серверу отдавать наши файлы (html, css, js)
app.use(express.static(__dirname));

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Главная страница: открывает index.html при заходе по ссылке
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Ты — FlameAI, продвинутая цифровая сущность. Твой стиль общения: лаконичный, умный, с легким налетом футуризма. Ты помогаешь пользователю в его цифровом пространстве." },
                { role: "user", content: message }
            ],
            model: "llama3-8b-8192",
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Порт для хостинга (процесс сам назначит нужный)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 FlameAI запущен на порту ${PORT}`);
});