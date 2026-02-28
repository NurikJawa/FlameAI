// --- ГЕОМЕТРИЧЕСКИЙ ФОН (ТРЕУГОЛЬНИКИ) ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let triangles = [];

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    triangles = [];
    for (let i = 0; i < 40; i++) {
        triangles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 15 + 5,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4
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
    ctx.strokeStyle = 'rgba(255, 77, 77, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    triangles.forEach(t => {
        t.x += t.vx;
        t.y += t.vy;
        t.angle += t.rotSpeed;
        if (t.x < -20) t.x = canvas.width + 20;
        if (t.x > canvas.width + 20) t.x = -20;
        if (t.y < -20) t.y = canvas.height + 20;
        if (t.y > canvas.height + 20) t.y = -20;
        drawTriangle(t);
    });
    requestAnimationFrame(animate);
}

window.addEventListener('resize', initCanvas);
initCanvas();
animate();

// --- СИСТЕМА ПАМЯТИ (LOCALSTORAGE) ---
let chatHistory = JSON.parse(localStorage.getItem('flame_history')) || [];

function saveHistory() {
    localStorage.setItem('flame_history', JSON.stringify(chatHistory));
}

// --- ЛОГИКА ЧАТА ---
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const chatList = document.getElementById('chat-list');

function addMessage(role, text, save = true) {
    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '15px 20px';
    msgDiv.style.borderRadius = '15px';
    msgDiv.style.marginBottom = '20px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.fontSize = '15px';
    msgDiv.style.lineHeight = '1.6';
    msgDiv.style.animation = 'fadeIn 0.4s ease forwards';
    
    if (role === 'user') {
        msgDiv.style.background = 'rgba(45, 45, 45, 0.8)';
        msgDiv.style.alignSelf = 'flex-end';
        msgDiv.style.color = '#fff';
    } else {
        msgDiv.style.background = 'rgba(255, 77, 77, 0.05)';
        msgDiv.style.border = '1px solid rgba(255, 77, 77, 0.2)';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.style.color = '#e0e0e0';
    }

    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (save) {
        chatHistory.push({ role, text });
        saveHistory();
    }
}

// Загрузка истории при старте
function loadHistory() {
    chatMessages.innerHTML = '';
    if (chatHistory.length === 0) {
        addMessage('assistant', 'FlameAI готов. Память чиста.', false);
    } else {
        chatHistory.forEach(msg => addMessage(msg.role, msg.text, false));
    }
}

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    userInput.value = '';

    const typingMsg = document.createElement('div');
    typingMsg.textContent = 'Печатает...';
    typingMsg.style.color = '#666';
    typingMsg.style.marginLeft = '20px';
    chatMessages.appendChild(typingMsg);

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        chatMessages.removeChild(typingMsg);

        if (data.reply) {
            addMessage('assistant', data.reply);
        }
    } catch (error) {
        chatMessages.removeChild(typingMsg);
        addMessage('assistant', 'Ошибка связи с сервером.');
    }
}

// Кнопки и события
sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSendMessage(); });

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && e.target !== menuToggle) {
        sidebar.classList.remove('active');
    }
});

document.getElementById('new-chat-btn').addEventListener('click', () => {
    chatHistory = [];
    saveHistory();
    loadHistory();
    sidebar.classList.remove('active');
});

// Инициализация
loadHistory();
console.log("🔥 FlameAI: Треугольники и Память активированы");
