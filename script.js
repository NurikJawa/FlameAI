// --- ТРЕУГОЛЬНИКИ ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let triangles = [];
let mouse = { x: -1000, y: -1000 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

class Triangle {
    constructor() { this.init(); }
    init() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 50 + 20;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.15})`;
        this.angle = Math.random() * Math.PI * 2;
        this.rotation = (Math.random() - 0.5) * 0.015;
        this.speedX = (Math.random() - 0.5) * 0.6;
        this.speedY = (Math.random() - 0.5) * 0.6;
        this.opacity = 0;
        this.maxOpacity = Math.random() * 0.4;
        this.morph = Math.random() * 10;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        for(let i = 0; i < 3; i++) {
            let r = this.size + Math.sin(this.morph + i) * 8;
            let x = r * Math.cos(i * 2 * Math.PI / 3);
            let y = r * Math.sin(i * 2 * Math.PI / 3);
            if(i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 10; ctx.shadowColor = "white";
        ctx.globalAlpha = this.opacity;
        ctx.stroke();
        ctx.restore();
    }
    update() {
        this.x += this.speedX; this.y += this.speedY; this.angle += this.rotation; this.morph += 0.02;
        let dx = this.x - mouse.x; let dy = this.y - mouse.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        // Плавное убегание (радиус 120)
        if(dist < 120) { 
            this.x += dx / 120; 
            this.y += dy / 120; 
        } 
        if (this.opacity < this.maxOpacity) this.opacity += 0.005;
        if(this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) this.init();
    }
}

// 60 треугольников для красоты
for(let i = 0; i < 60; i++) triangles.push(new Triangle());

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    triangles.forEach(t => { t.update(); t.draw(); });
    requestAnimationFrame(animate);
}
animate();

// --- ЛОГИКА ЧАТОВ ---
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const chatListContainer = document.getElementById('chat-list');
const newChatBtn = document.getElementById('new-chat-btn');

let currentChatId = Date.now();
let allChats = JSON.parse(localStorage.getItem('flame_chats')) || [];

function renderChatList() {
    chatListContainer.innerHTML = '';
    allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-item';
        item.innerText = chat.title;
        item.onclick = () => loadChat(chat.id);
        chatListContainer.appendChild(item);
    });
}

function saveMessage(text, isUser) {
    let chat = allChats.find(c => c.id === currentChatId);
    if (!chat) {
        chat = { id: currentChatId, title: text.substring(0, 20) + '...', messages: [] };
        allChats.unshift(chat);
    }
    chat.messages.push({ text, isUser });
    localStorage.setItem('flame_chats', JSON.stringify(allChats));
    renderChatList();
}

function loadChat(id) {
    const chat = allChats.find(c => c.id === id);
    if (!chat) return;
    currentChatId = id;
    chatMessages.innerHTML = '';
    chat.messages.forEach(msg => addMessageUI(msg.text, msg.isUser ? 'user-message' : 'ai-message'));
}

newChatBtn.onclick = () => {
    currentChatId = Date.now();
    chatMessages.innerHTML = '';
    addMessageUI('Система очищена. Новый поток данных запущен.', 'ai-message');
};

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    addMessageUI(text, 'user-message');
    saveMessage(text, true);
    userInput.value = '';

    try {
        // УНИВЕРСАЛЬНЫЙ ПУТЬ для локалки и хостинга
        const response = await fetch('/chat', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        addMessageUI(data.reply, 'ai-message');
        saveMessage(data.reply, false);
    } catch (e) {
        addMessageUI('Критическая ошибка связи.', 'ai-message');
    }
}

function addMessageUI(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerText = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
renderChatList();
if (allChats.length > 0) loadChat(allChats[0].id);
else addMessageUI('FlameAI готов. Жду вводных данных.', 'ai-message');