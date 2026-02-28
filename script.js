// --- ТРЕУГОЛЬНИКИ (СИНИЕ И БЕЛЫЕ) ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let triangles = [];

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    triangles = [];
    for (let i = 0; i < 35; i++) {
        triangles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 12 + 4,
            angle: Math.random() * Math.PI * 2,
            rot: (Math.random() - 0.5) * 0.01,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            color: Math.random() > 0.5 ? 'rgba(0, 71, 171, 0.15)' : 'rgba(255, 255, 255, 0.05)'
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
    ctx.stroke();
    ctx.restore();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    triangles.forEach(t => {
        t.x += t.vx; t.y += t.vy; t.angle += t.rot;
        if (t.x < -20) t.x = canvas.width + 20;
        if (t.x > canvas.width + 20) t.x = -20;
        if (t.y < -20) t.y = canvas.height + 20;
        if (t.y > canvas.height + 20) t.y = -20;
        drawTriangle(t);
    });
    requestAnimationFrame(animate);
}
initCanvas(); animate();

// --- СИСТЕМА ПАМЯТИ МНОЖЕСТВА ЧАТОВ ---
let allChats = JSON.parse(localStorage.getItem('flame_all_chats')) || [];
let currentChatId = localStorage.getItem('flame_current_id') || null;

const chatMessages = document.getElementById('chat-messages');
const chatList = document.getElementById('chat-list');
const userInput = document.getElementById('user-input');

// Сохранение в память
function saveToLocal() {
    localStorage.setItem('flame_all_chats', JSON.stringify(allChats));
    localStorage.setItem('flame_current_id', currentChatId);
    renderChatList();
}

// Отрисовка сообщения
function displayMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Отрисовка списка чатов слева
function renderChatList() {
    chatList.innerHTML = '';
    allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.textContent = chat.title || "Новый диалог";
        item.onclick = () => switchChat(chat.id);
        chatList.appendChild(item);
    });
}

// Создание нового чата
function createNewChat() {
    const newId = Date.now().toString();
    const newChat = { id: newId, title: "Новый диалог", messages: [] };
    allChats.unshift(newChat);
    currentChatId = newId;
    saveToLocal();
    loadCurrentChat();
}

// Переключение чата
function switchChat(id) {
    currentChatId = id;
    saveToLocal();
    loadCurrentChat();
    document.getElementById('sidebar').classList.remove('active');
}

// Загрузка сообщений текущего чата
function loadCurrentChat() {
    chatMessages.innerHTML = '';
    const chat = allChats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.forEach(m => displayMessage(m.role, m.text));
    }
}

// Отправка сообщения
async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    if (!currentChatId) createNewChat();

    // Находим текущий чат
    const chatIndex = allChats.findIndex(c => c.id === currentChatId);
    
    // Добавляем сообщение пользователя
    allChats[chatIndex].messages.push({ role: 'user', text: text });
    
    // Если это первое сообщение, меняем заголовок чата
    if (allChats[chatIndex].messages.length === 1) {
        allChats[chatIndex].title = text.substring(0, 20) + "...";
    }

    displayMessage('user', text);
    userInput.value = '';
    saveToLocal();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        
        if (data.reply) {
            allChats[chatIndex].messages.push({ role: 'assistant', text: data.reply });
            displayMessage('assistant', data.reply);
            saveToLocal();
        }
    } catch (err) {
        displayMessage('assistant', 'Ошибка связи с сервером.');
    }
}

// События
document.getElementById('send-btn').onclick = handleSend;
userInput.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
document.getElementById('new-chat-btn').onclick = createNewChat;
document.getElementById('menu-toggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('active');
};

// Инициализация при загрузке
window.onload = () => {
    if (allChats.length > 0) {
        if (!currentChatId) currentChatId = allChats[0].id;
        loadCurrentChat();
        renderChatList();
    } else {
        createNewChat();
    }
};
