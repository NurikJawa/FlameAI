/**
 * FlameAI Kernel v11.0 - COLOSSUS EDITION
 * NO CODE REDUCTION - MAXIMUM EXPANSION
 */

// --- 1. КАНВАС: СИМУЛЯЦИЯ ГЕОМЕТРИЧЕСКИХ ЧАСТИЦ ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let triangles = [];
let mouse = { x: null, y: null };

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    triangles = [];
    
    // Создаем массив объектов треугольников с уникальными параметрами
    for (let i = 0; i < 70; i++) {
        triangles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 20 + 6,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            color: Math.random() > 0.8 ? '#0047ab' : '#ffffff',
            opacity: Math.random() * 0.2 + 0.1,
            pulse: Math.random() * 0.01
        });
    }
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка динамических связей (Нейронная паутина)
    for (let i = 0; i < triangles.length; i++) {
        for (let j = i + 1; j < triangles.length; j++) {
            const t1 = triangles[i];
            const t2 = triangles[j];
            const dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
            
            if (dist < 180) {
                ctx.beginPath();
                ctx.moveTo(t1.x, t1.y);
                ctx.lineTo(t2.x, t2.y);
                ctx.strokeStyle = t1.color;
                ctx.globalAlpha = (1 - dist / 180) * 0.12;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }

    // Отрисовка треугольников с вращением
    triangles.forEach(t => {
        t.x += t.vx;
        t.y += t.vy;
        t.angle += t.rotSpeed;
        t.opacity += t.pulse;
        if(t.opacity > 0.3 || t.opacity < 0.1) t.pulse *= -1;

        // Отскок от краев (Логика бесконечного пространства)
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
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
    });

    requestAnimationFrame(drawScene);
}

window.addEventListener('resize', initCanvas);
initCanvas();
drawScene();

// --- 2. ЛОГИКА МОБИЛЬНОГО МЕНЮ (СЛАЙДЕР) ---
const sidebar = document.querySelector('.sidebar');
const overlay = document.createElement('div');
overlay.className = 'overlay';
document.body.appendChild(overlay);

function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

overlay.onclick = toggleSidebar;

// --- 3. СИСТЕМА УПРАВЛЕНИЯ БАЗОЙ ДАННЫХ ---
let state = {
    allChats: JSON.parse(localStorage.getItem('flame_db_v11')) || [],
    currentId: localStorage.getItem('flame_active_id_v11') || null,
    isProcessing: false
};

const elements = {
    msgBox: document.getElementById('chat-messages'),
    historyList: document.getElementById('chat-list'),
    inputArea: document.getElementById('user-input')
};

function syncData() {
    localStorage.setItem('flame_db_v11', JSON.stringify(state.allChats));
    localStorage.setItem('flame_active_id_v11', state.currentId);
    renderSidebarList();
}

function renderSidebarList() {
    elements.historyList.innerHTML = '';
    state.allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${chat.id === state.currentId ? 'active' : ''}`;
        
        const title = document.createElement('span');
        title.textContent = chat.title || "Новый диалог";
        item.appendChild(title);

        item.onclick = () => {
            state.currentId = chat.id;
            syncData();
            loadCurrentMessages();
            if (window.innerWidth <= 768) toggleSidebar();
        };
        elements.historyList.appendChild(item);
    });
}

function startNewSession() {
    const uniqueId = "flame_" + Date.now();
    const chatObj = {
        id: uniqueId,
        title: "FlameAI Chat",
        messages: [],
        created: new Date().toLocaleDateString()
    };
    state.allChats.unshift(chatObj);
    state.currentId = uniqueId;
    syncData();
    loadCurrentMessages();
}

function addMessageToUI(role, content) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    
    // ВМЕСТО messageWrapper.textContent используем это:
    if (role === 'assistant') {
        // Обработка текста для ИИ (переносы, жирный шрифт, спецсимволы)
        let formattedContent = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Жирный текст **так**
            .replace(/\n/g, '<br>'); // ПЕРЕНОСЫ СТРОК
            
        messageWrapper.innerHTML = formattedContent;
    } else {
        // Для пользователя можно оставить просто переносы
        messageWrapper.style.whiteSpace = "pre-wrap";
        messageWrapper.textContent = content;
    }

    elements.msgBox.appendChild(messageWrapper);
    
    // Плавная прокрутка (уже была у тебя, оставляем)
    elements.msgBox.scrollTo({
        top: elements.msgBox.scrollHeight,
        behavior: 'smooth'
    });
}

function loadCurrentMessages() {
    elements.msgBox.innerHTML = '';
    const activeChat = state.allChats.find(c => c.id === state.currentId);
    if (activeChat) {
        activeChat.messages.forEach(m => addMessageToUI(m.role, m.text));
    }
}

// --- 4. ОБРАБОТЧИК AI ЯДРА ---
async function processMessage() {
    const text = elements.inputArea.value.trim();
    if (!text || state.isProcessing) return;

    if (!state.currentId) startNewSession();

    const activeIndex = state.allChats.findIndex(c => c.id === state.currentId);
    
    // Переименование первого чата
    if (state.allChats[activeIndex].messages.length === 0) {
        state.allChats[activeIndex].title = text.substring(0, 20) + (text.length > 20 ? "..." : "");
    }

    // Юзер
    state.allChats[activeIndex].messages.push({ role: 'user', text: text });
    addMessageToUI('user', text);
    elements.inputArea.value = '';
    state.isProcessing = true;
    syncData();

    // Визуальный индикатор
    const typing = document.createElement('div');
    typing.className = 'message ai-message';
    typing.style.opacity = '0.5';
    typing.textContent = 'FlameAI печатает...';
    elements.msgBox.appendChild(typing);
    elements.msgBox.scrollTop = elements.msgBox.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        const data = await response.json();
        elements.msgBox.removeChild(typing);

        if (data.reply) {
            state.allChats[activeIndex].messages.push({ role: 'assistant', text: data.reply });
            addMessageToUI('assistant', data.reply);
            syncData();
        }
    } catch (err) {
        elements.msgBox.removeChild(typing);
        addMessageToUI('assistant', '⚠️ Ошибка синхронизации с ядром FlameAI.');
    } finally {
        state.isProcessing = false;
    }
}

// СОБЫТИЯ И ГОРЯЧИЕ КЛАВИШИ
document.getElementById('send-btn').addEventListener('click', processMessage);
elements.inputArea.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processMessage();
});
document.getElementById('new-chat-btn').addEventListener('click', startNewSession);

// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ
window.addEventListener('load', () => {
    if (state.allChats.length > 0) {
        if (!state.currentId) state.currentId = state.allChats[0].id;
        loadCurrentMessages();
        renderSidebarList();
    } else {
        startNewSession();
    }
    console.log("FlameAI Kernel v11.0: Status Online");
});

