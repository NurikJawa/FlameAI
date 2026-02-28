const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Groq } = require('groq-sdk');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Отдаем статические файлы (html, css, js) из текущей папки
app.use(express.static(__dirname));

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Используем актуальную модель llama-3.3-70b-versatile
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "Ты — FlameAI, продвинутая цифровая сущность. Твой стиль общения: лаконичный, умный, с легким налетом футуризма. Ты помогаешь пользователю в его цифровом пространстве." 
                },
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile", // Исправленная модель
            temperature: 0.7,
            max_tokens: 1024,
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (error) {
        console.error('Ошибка Groq:', error.message);
        res.status(500).json({ error: 'Ошибка сервера при запросе к ИИ' });
    }
});

// Порт для Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 FlameAI запущен и готов к работе на порту ${PORT}`);
});
