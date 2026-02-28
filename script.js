/**
 * FlameAI Ultimate Engine v9.0
 * MAXIMUM CODE EXPANSION - NO COMPRESSION
 */

// --- 1. КАНВАС: СЛОЖНАЯ ГЕОМЕТРИЧЕСКАЯ СИСТЕМА ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let triangles = [];
const config = {
    count: 65,
    connectionDist: 170,
    baseSpeed: 0.4,
    sizeRange: [5, 22]
};

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    triangles = [];
    for (let i = 0; i < config.count; i++) {
        triangles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * (config.sizeRange[1] - config.sizeRange[0]) + config.sizeRange[0],
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
            vx: (Math.random() - 0.5) * config.baseSpeed,
            vy: (Math.random() - 0.5) * config.baseSpeed,
            color: Math.random() > 0.8 ? '#0047ab' : '#ffffff',
            opacity: Math.random() * 0.2 + 0.1
        });
    }
}

function drawSystem() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Сначала рисуем связи (линии паутины)
    for (let i = 0; i < triangles.length; i++) {
        for (let j = i + 1; j < triangles.length; j++) {
            const t1 = triangles[i];
            const t2 = triangles[j];
            const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
            
            if (dist < config.connectionDist) {
                ctx.beginPath();
                ctx.moveTo(t1.x, t1.y);
                ctx.lineTo(t2.x, t2.y);
                ctx.strokeStyle = t1.color;
                ctx.globalAlpha = (1 - dist / config.connectionDist) * 0.1;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    // Затем рисуем сами треугольники
    triangles.forEach(t => {
        t.x += t.vx;
        t.y += t.vy;
        t.angle += t.rotSpeed;

        if (t.x < -50) t.x = canvas.width + 50;
        if (t.x > canvas.width + 50) t.x = -50;
        if (t.y < -50) t.y = canvas.height + 50;
        if (t.y > canvas.height + 50) t.y = -50;

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
        ctx.stroke();
        ctx.restore();
    });

    requestAnimationFrame(drawSystem);
}

window.addEventListener('resize', initCanvas);
initCanvas();
drawSystem();

// --- 2. ЯДРО УПРАВЛЕНИЯ ПАМЯТЬЮ ---
let appState = {
    chats: JSON.parse(localStorage.getItem('flame_v9_db')) || [],
    activeChatId: localStorage.getItem('flame_v9_active') || null,
    isTyping: false
};

const dom = {
    msgList: document.getElementById('chat-messages'),
    chatList: document.getElementById('chat-list'),
    input: document.getElementById('user-input'),
    sidebar: document.querySelector('.sidebar')
};

function saveAll() {
    localStorage.setItem('flame_v9_db', JSON.stringify(appState.chats));
    localStorage.setItem('flame_v9_active', appState.activeChatId);
    renderSidebar();
}

function renderSidebar() {
    dom.chatList.innerHTML = '';
    appState.chats.forEach(chat => {
        const el = document.createElement('div');
        el.className = `chat-item ${chat.id === appState.activeChatId ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = chat.title || "Новый диалог";
        el.appendChild(titleSpan);

        el.onclick = () => {
            appState.activeChatId = chat.id;
            saveAll();
            loadHistory();
            if (window.innerWidth <= 768) toggleMenu();
        };
        dom.chatList.appendChild(el);
    });
}

function toggleMenu() {
    dom.sidebar.classList.toggle('active');
}

function createNewChat() {
    const newId = "f_" + Date.now();
    const newChat = {
        id: newId,
        title: "FlameAI Chat",
        messages: [],
        timestamp: new Date().toISOString()
    };
    appState.chats.unshift(newChat);
    appState.activeChatId = newId;
    saveAll();
    loadHistory();
}

function loadHistory() {
    dom.msgList.innerHTML = '';
    const active = appState.chats.find(c => c.id === appState.activeChatId);
    if (active) {
        active.messages.forEach(m => appendMessageUI(m.role, m.text));
    }
    scrollToBottom();
}

function appendMessageUI(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    msgDiv.textContent = text;
    dom.msgList.appendChild(msgDiv);
    scrollToBottom();
}

function scrollToBottom() {
    dom.msgList.scrollTo({
        top: dom.msgList.scrollHeight,
        behavior: 'smooth'
    });
}

// --- 3. ОБРАБОТЧИК СООБЩЕНИЙ ---
async function handleSend() {
    const rawText = dom.input.value.trim();
    if (!rawText || appState.isTyping) return;

    if (!appState.activeChatId) createNewChat();

    const currentChat = appState.chats.find(c => c.id === appState.activeChatId);
    
    // Авто-название чата
    if (currentChat.messages.length === 0) {
        currentChat.title = rawText.substring(0, 22);
    }

    // Сохраняем и отображаем юзера
    currentChat.messages.push({ role: 'user', text: rawText });
    appendMessageUI('user', rawText);
    dom.input.value = '';
    appState.isTyping = true;
    saveAll();

    // Создаем индикатор загрузки
    const loader = document.createElement('div');
    loader.className = 'message ai-message';
    loader.style.opacity = '0.5';
    loader.textContent = '...';
    dom.msgList.appendChild(loader);
    scrollToBottom();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: rawText })
        });
        
        const result = await response.json();
        dom.msgList.removeChild(loader);

        if (result.reply) {
            currentChat.messages.push({ role: 'assistant', text: result.reply });
            appendMessageUI('assistant', result.reply);
            saveAll();
        }
    } catch (err) {
        dom.msgList.removeChild(loader);
        appendMessageUI('assistant', '⚠️ Проблема с соединением.');
    } finally {
        appState.isTyping = false;
    }
}

// СОБЫТИЯ
document.getElementById('send-btn').addEventListener('click', handleSend);
dom.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
});
document.getElementById('new-chat-btn').addEventListener('click', createNewChat);

// ЗАПУСК ПРИ ЗАГРУЗКЕ
window.onload = () => {
    if (appState.chats.length > 0) {
        if (!appState.activeChatId) appState.activeChatId = appState.chats[0].id;
        loadHistory();
        renderSidebar();
    } else {
        createNewChat();
    }
    console.log("FlameAI Kernel v9.0 Activated");
};
