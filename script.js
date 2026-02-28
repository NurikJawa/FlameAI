/**
 * FlameAI Engine v2.5
 * Full System: Canvas Geometry, Persistent Memory, Chat History Management
 */

// --- 1. ГЕОМЕТРИЧЕСКИЙ ДВИЖОК (ТРЕУГОЛЬНИКИ) ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let triangles = [];

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    triangles = [];
    // Генерируем 50 треугольников для насыщенности
    for (let i = 0; i < 50; i++) {
        triangles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 20 + 8,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.015,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.4 + 0.1,
            color: Math.random() > 0.5 ? '#0047ab' : '#ffffff'
        });
    }
}

function drawTriangle(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.beginPath();
    ctx.moveTo(0, -t.size);
    ctx.lineTo(t.size, t.size);
    ctx.lineTo(-t.size, t.size);
    ctx.closePath();
    
    ctx.strokeStyle = t.color;
    ctx.globalAlpha = t.opacity;
    ctx.lineWidth = 1.5;
    
    // Добавляем свечение каждой фигуре
    ctx.shadowBlur = 15;
    ctx.shadowColor = t.color;
    
    ctx.stroke();
    ctx.restore();
}

function updateCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    triangles.forEach(t => {
        t.x += t.vx;
        t.y += t.vy;
        t.angle += t.rotSpeed;
        
        // Бесконечный экран
        if (t.x < -50) t.x = canvas.width + 50;
        if (t.x > canvas.width + 50) t.x = -50;
        if (t.y < -50) t.y = canvas.height + 50;
        if (t.y > canvas.height + 50) t.y = -50;
        
        drawTriangle(t);
    });
    requestAnimationFrame(updateCanvas);
}

window.addEventListener('resize', initCanvas);
initCanvas();
updateCanvas();

// --- 2. СИСТЕМА УПРАВЛЕНИЯ ПАМЯТЬЮ (MULTI-CHAT) ---
let allChats = JSON.parse(localStorage.getItem('flame_v2_history')) || [];
let currentChatId = localStorage.getItem('flame_v2_current_id') || null;

const chatMessages = document.getElementById('chat-messages');
const chatList = document.getElementById('chat-list');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');

// Сохранение всего состояния
function syncStorage() {
    localStorage.setItem('flame_v2_history', JSON.stringify(allChats));
    localStorage.setItem('flame_v2_current_id', currentChatId);
    renderSidebar();
}

// Отрисовка списка чатов в сайдбаре
function renderSidebar() {
    chatList.innerHTML = '';
    allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        
        // Текст заголовка
        const titleSpan = document.createElement('span');
        titleSpan.textContent = chat.title || "Пустой диалог";
        item.appendChild(titleSpan);
        
        // Кнопка удаления (иконка корзины)
        const delBtn = document.createElement('small');
        delBtn.innerHTML = "✕";
        delBtn.style.opacity = "0.5";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        };
        item.appendChild(delBtn);

        item.onclick = () => switchChat(chat.id);
        chatList.appendChild(item);
    });
}

// Создание нового чата
function startNewChat() {
    const id = "chat_" + Date.now();
    const newChat = {
        id: id,
        title: "Новый диалог",
        messages: []
    };
    allChats.unshift(newChat);
    currentChatId = id;
    syncStorage();
    loadChat();
}

// Переключение между чатами
function switchChat(id) {
    currentChatId = id;
    syncStorage();
    loadChat();
    if (window.innerWidth < 900) sidebar.classList.remove('active');
}

// Удаление чата
function deleteChat(id) {
    allChats = allChats.filter(c => c.id !== id);
    if (currentChatId === id) {
        currentChatId = allChats.length > 0 ? allChats[0].id : null;
    }
    syncStorage();
    if (!currentChatId) startNewChat();
    else loadChat();
}

// Отрисовка сообщений
function pushMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Загрузка текущего чата на экран
function loadChat() {
    chatMessages.innerHTML = '';
    const activeChat = allChats.find(c => c.id === currentChatId);
    if (activeChat && activeChat.messages) {
        activeChat.messages.forEach(m => pushMessage(m.role, m.text));
    }
}

// --- 3. ОБРАБОТКА ЗАПРОСОВ ---
async function handleUserRequest() {
    const text = userInput.value.trim();
    if (!text) return;

    if (!currentChatId) startNewChat();

    const activeIndex = allChats.findIndex(c => c.id === currentChatId);
    
    // Обновляем заголовок, если это первое сообщение
    if (allChats[activeIndex].messages.length === 0) {
        allChats[activeIndex].title = text.length > 20 ? text.substring(0, 20) + "..." : text;
    }

    // Добавляем в память и на экран
    allChats[activeIndex].messages.push({ role: 'user', text: text });
    pushMessage('user', text);
    userInput.value = '';
    syncStorage();

    // Имитация ожидания
    const typing = document.createElement('div');
    typing.className = 'message ai-message';
    typing.textContent = '...';
    chatMessages.appendChild(typing);

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        const data = await response.json();
        chatMessages.removeChild(typing);

        if (data.reply) {
            allChats[activeIndex].messages.push({ role: 'assistant', text: data.reply });
            pushMessage('assistant', data.reply);
            syncStorage();
        }
    } catch (err) {
        chatMessages.removeChild(typing);
        pushMessage('assistant', '⚠️ Ошибка связи с ядром FlameAI.');
    }
}

// --- 4. ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ---
sendBtn.addEventListener('click', handleUserRequest);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserRequest();
});

document.getElementById('new-chat-btn').addEventListener('click', startNewChat);

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Запуск системы
window.onload = () => {
    if (allChats.length > 0) {
        if (!currentChatId) currentChatId = allChats[0].id;
        loadChat();
        renderSidebar();
    } else {
        startNewChat();
    }
    console.log("FlameAI Kernel: Online. Memory: Active.");
};
