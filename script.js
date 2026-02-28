// Конфигурация фона (Canvas)
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let dots = [];
const dotCount = 60;

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    dots = [];
    for (let i = 0; i < dotCount; i++) {
        dots.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2
        });
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255, 77, 77, 0.2)';
    
    dots.forEach(dot => {
        dot.x += dot.vx;
        dot.y += dot.vy;
        
        if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
    });
    requestAnimationFrame(animate);
}

window.addEventListener('resize', initCanvas);
initCanvas();
animate();

// Логика Чат-системы
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');

function createMessageElement(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    // Стилизация через JS (чтобы точно не слетело)
    messageDiv.style.padding = '15px 20px';
    messageDiv.style.borderRadius = '15px';
    messageDiv.style.marginBottom = '20px';
    messageDiv.style.maxWidth = '85%';
    messageDiv.style.fontSize = '15px';
    messageDiv.style.lineHeight = '1.6';
    messageDiv.style.position = 'relative';
    messageDiv.style.animation = 'fadeIn 0.4s ease forwards';
    
    if (role === 'user') {
        messageDiv.style.background = 'rgba(45, 45, 45, 0.8)';
        messageDiv.style.border = '1px solid #444';
        messageDiv.style.alignSelf = 'flex-end';
        messageDiv.style.color = '#fff';
    } else {
        messageDiv.style.background = 'rgba(255, 77, 77, 0.05)';
        messageDiv.style.border = '1px solid rgba(255, 77, 77, 0.2)';
        messageDiv.style.alignSelf = 'flex-start';
        messageDiv.style.color = '#e0e0e0';
        messageDiv.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
    }

    messageDiv.innerHTML = `<div class="text">${text}</div>`;
    return messageDiv;
}

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Добавляем сообщение пользователя
    const userMsg = createMessageElement('user', text);
    chatMessages.appendChild(userMsg);
    
    userInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Индикатор загрузки
    const typingMsg = createMessageElement('assistant', 'Генерация ответа...');
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
            const botMsg = createMessageElement('assistant', data.reply);
            chatMessages.appendChild(botMsg);
        } else {
            const errorMsg = createMessageElement('assistant', '⚠️ Ошибка системы. Попробуйте позже.');
            chatMessages.appendChild(errorMsg);
        }
    } catch (error) {
        chatMessages.removeChild(typingMsg);
        const errorMsg = createMessageElement('assistant', '❌ Нет связи с сервером.');
        chatMessages.appendChild(errorMsg);
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Обработчики событий
sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});

// МОБИЛЬНАЯ МАГИЯ (Твоё новое меню)
if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('active');
    });
}

// Закрытие меню при клике на чат
document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// Кнопка "Новый чат" - просто очистка (для начала)
document.getElementById('new-chat-btn').addEventListener('click', () => {
    chatMessages.innerHTML = '';
    const welcome = createMessageElement('assistant', 'Система FlameAI инициализирована. Память очищена. Чем могу помочь?');
    chatMessages.appendChild(welcome);
    sidebar.classList.remove('active');
});

console.log("🔥 FlameAI Engine Loaded Successfully");
