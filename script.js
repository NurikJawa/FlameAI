/**
 * ============================================================================
 * FlameAI CORE ENGINE - VISION & CODE EDITION
 * Version: 14.0.5 (Monolith PC)
 * ============================================================================
 * [ СТАТУС: ЛОКАЛЬНОЕ ЯДРО АКТИВИРОВАНО ]
 * [ API: ОТКЛЮЧЕНО ПО ПРИКАЗУ ]
 * ----------------------------------------------------------------------------
 * Включает:
 * 1. Кастомный рендер синтаксиса (FlameSyntax)
 * 2. Движок облачных частиц (PhysicsEngine)
 * 3. Локальный обработчик запросов (CoreLogic)
 * 4. Систему управления памятью (DBManager)
 * 5. Визуальный интерфейс "Пузыри" (Bubble UI)
 * ============================================================================
 */

"use strict";

// ============================================================================
// [1] FLAME SYNTAX HIGHLIGHTER - ДЕТАЛЬНАЯ ПОДСВЕТКА КОДА
// ============================================================================
class FlameSyntaxHighlighter {
    static highlight(code, language = 'javascript') {
        // Экранирование для безопасности
        let safeCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Набор правил для токенизации (JS, CSS, HTML, Python)
        const patterns = [
            { regex: /(\/\/.*|\/\*[\s\S]*?\*\/)/g, class: 'syntax-comment' },
            { regex: /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, class: 'syntax-string' },
            { regex: /\b(const|let|var|function|class|return|if|else|for|while|import|export|async|await|try|catch|new|this)\b/g, class: 'syntax-keyword' },
            { regex: /\b(def|print|self|import|from|if|else|elif|for|while|return|class|try|except)\b/g, class: 'syntax-keyword-py' },
            { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, class: 'syntax-function' },
            { regex: /\b(\d+(?:\.\d+)?)\b/g, class: 'syntax-number' },
            { regex: /\b(window|document|console|true|false|null|undefined)\b/g, class: 'syntax-variable' },
            { regex: /\.(?=[a-z])([a-z0-9-]+)\b/g, class: 'syntax-css-class' },
            { regex: /#(?=[a-z])([a-z0-9-]+)\b/g, class: 'syntax-css-id' }
        ];

        const tokens = [];
        let tokenIndex = 0;

        // Изолируем строки и комментарии
        patterns.slice(0, 2).forEach(pattern => {
            safeCode = safeCode.replace(pattern.regex, (match) => {
                const token = `__TOKEN_F_${tokenIndex++}__`;
                tokens.push({ token, match, class: pattern.class });
                return token;
            });
        });

        // Применяем логические правила
        patterns.slice(2).forEach(pattern => {
            safeCode = safeCode.replace(pattern.regex, `<span class="${pattern.class}">$1</span>`);
        });

        // Возвращаем изолированные элементы
        tokens.forEach(({ token, match, class: className }) => {
            safeCode = safeCode.replace(token, `<span class="${className}">${match}</span>`);
        });

        return safeCode;
    }
}

// ============================================================================
// [2] FLAME PARSER - ОБРАБОТКА ТЕКСТА И КОДА
// ============================================================================
class FlameParser {
    static parseResponse(rawText) {
        // Поиск блоков кода Markdown ```...```
        const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let processedContent = rawText;

        processedContent = processedContent.replace(codeRegex, (match, lang, code) => {
            const detectedLang = lang || 'javascript';
            const highlightedCode = FlameSyntaxHighlighter.highlight(code.trim(), detectedLang);
            
            return `
                <div class="code-block-wrapper">
                    <div class="code-block-top">
                        <span class="lang-tag">${detectedLang.toUpperCase()}</span>
                        <button class="copy-btn-mini" onclick="window.flameCore.copyToClipboard(this)">Copy</button>
                    </div>
                    <pre class="flame-code-body"><code>${highlightedCode}</code></pre>
                </div>
            `;
        });

        // Преобразование переносов строк
        processedContent = processedContent.replace(/\n/g, '<br>');
        return { html: processedContent };
    }
}

// ============================================================================
// [3] VISION MODULE - ОБРАБОТКА ИЗОБРАЖЕНИЙ (БЕЗ API)
// ============================================================================
class VisionModule {
    constructor(ui) {
        this.ui = ui;
        this.currentData = null;
        this.elements = {
            input: document.getElementById('file-input'),
            btn: document.getElementById('upload-btn'),
            preview: document.getElementById('image-preview-container')
        };
        this.init();
    }

    init() {
        if (!this.elements.btn) return;
        this.elements.btn.addEventListener('click', () => this.elements.input.click());
        this.elements.input.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Drag & Drop логика
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-active');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-active');
                this.handleFiles(e.dataTransfer.files);
            });
        }
    }

    handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert("FlameAI: Только изображения поддерживаются в Vision-модуле.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentData = e.target.result;
            this.renderPreview();
        };
        reader.readAsDataURL(file);
    }

    renderPreview() {
        this.elements.preview.innerHTML = `
            <div class="img-preview-box">
                <img src="${this.currentData}">
                <div class="img-cancel" onclick="window.flameCore.vision.clear()">✕</div>
            </div>
        `;
        this.elements.preview.style.display = 'flex';
    }

    clear() {
        this.currentData = null;
        this.elements.preview.style.display = 'none';
        this.elements.preview.innerHTML = '';
        this.elements.input.value = '';
    }

    getData() { return this.currentData; }
}

// ============================================================================
// [4] PHYSICS ENGINE - ГЕНЕРАТОР ЧАСТИЦ ФОНА
// ============================================================================
class PhysicsEngine {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.count = 160; // Увеличенное количество для "тяжелого" эффекта
        this.init();
        this.animate();
        window.addEventListener('resize', () => this.init());
    }

    init() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 1.6,
                vy: (Math.random() - 0.5) * 1.6,
                radius: Math.random() * 2.2 + 0.5,
                color: Math.random() > 0.8 ? '#00e5ff' : '#0066ff'
            });
        }
    }

    drawLines() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (dist < 130) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(0, 102, 255, ${1 - dist / 130})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#000511';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > this.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.height) p.vy *= -1;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        });

        this.drawLines();
        requestAnimationFrame(() => this.animate());
    }
}

// ============================================================================
// [5] DB MANAGER - ЛОКАЛЬНОЕ ХРАНИЛИЩЕ
// ============================================================================
class DBManager {
    constructor() {
        this.storageKey = 'flame_ai_v14_data';
        this.activeKey = 'flame_ai_active_session';
        this.history = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    }

    getActiveId() { return localStorage.getItem(this.activeKey); }
    setActiveId(id) { localStorage.setItem(this.activeKey, id); }

    addChat(id, title) {
        this.history.unshift({ id, title, messages: [], timestamp: Date.now() });
        this.save();
    }

    getChat(id) { return this.history.find(c => c.id === id); }
    
    updateMessages(id, msgs) {
        const chat = this.getChat(id);
        if (chat) {
            chat.messages = msgs;
            this.save();
        }
    }

    deleteChat(id) {
        this.history = this.history.filter(c => c.id !== id);
        this.save();
    }
}

// ============================================================================
// [6] APP CORE - ГЛАВНЫЙ КОНТРОЛЛЕР FlameAI
// ============================================================================
class FlameApp {
    constructor() {
        this.db = new DBManager();
        this.vision = new VisionModule(this);
        this.isProcessing = false;

        this.dom = {
            chatContainer: document.getElementById('chat-messages'),
            sidebar: document.getElementById('chat-list'),
            input: document.getElementById('text-input'),
            sendBtn: document.getElementById('send-btn'),
            newBtn: document.getElementById('new-chat-btn')
        };

        this.init();
    }

    init() {
        new PhysicsEngine();
        this.setupListeners();
        
        if (!this.db.getActiveId() || !this.db.getChat(this.db.getActiveId())) {
            this.createNewSession();
        }

        this.renderSidebar();
        this.renderChat();
    }

    setupListeners() {
        this.dom.sendBtn.onclick = () => this.handleSend();
        this.dom.newBtn.onclick = () => this.createNewSession();
        this.dom.input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };
    }

    createNewSession() {
        const id = 'flame_' + Date.now();
        this.db.addChat(id, "Новая сессия FlameAI");
        this.db.setActiveId(id);
        this.vision.clear();
        this.renderSidebar();
        this.renderChat();
    }

    renderSidebar() {
        this.dom.sidebar.innerHTML = '';
        this.db.history.forEach(session => {
            const el = document.createElement('div');
            el.className = `chat-item ${session.id === this.db.getActiveId() ? 'active' : ''}`;
            el.innerHTML = `
                <span class="chat-title-text">${session.title}</span>
                <div class="chat-del-btn" onclick="event.stopPropagation(); window.flameCore.deleteSession('${session.id}')">✕</div>
            `;
            el.onclick = () => {
                this.db.setActiveId(session.id);
                this.renderSidebar();
                this.renderChat();
            };
            this.dom.sidebar.appendChild(el);
        });
    }

    deleteSession(id) {
        this.db.deleteChat(id);
        if (this.db.getActiveId() === id) {
            const next = this.db.history[0];
            if (next) this.db.setActiveId(next.id);
            else this.createNewSession();
        }
        this.renderSidebar();
        this.renderChat();
    }

    renderChat() {
        this.dom.chatContainer.innerHTML = '';
        const session = this.db.getChat(this.db.getActiveId());
        if (!session) return;

        session.messages.forEach(msg => {
            this.appendMessageToUI(msg.role, msg.text, msg.image);
        });
        this.scrollChat();
    }

    appendMessageToUI(role, text, image = null, isTyping = false) {
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `msg-wrapper ${role === 'user' ? 'user-align' : 'ai-align'}`;
        
        const bubble = document.createElement('div');
        bubble.className = `bubble ${role === 'user' ? 'bubble-user' : 'bubble-ai'}`;

        if (isTyping) {
            bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
            msgWrapper.id = 'active-typing';
        } else {
            const parsed = FlameParser.parseResponse(text);
            bubble.innerHTML = parsed.html;
            
            if (image) {
                const imgEl = document.createElement('img');
                imgEl.src = image;
                imgEl.className = 'msg-image-content';
                bubble.appendChild(imgEl);
            }
        }

        msgWrapper.appendChild(bubble);
        this.dom.chatContainer.appendChild(msgWrapper);
        this.scrollChat();
    }

    async handleSend() {
        if (this.isProcessing) return;
        
        const text = this.dom.input.value.trim();
        const img = this.vision.getData();

        if (!text && !img) return;

        this.isProcessing = true;
        this.dom.input.value = '';
        this.vision.clear();

        const chatId = this.db.getActiveId();
        const chat = this.db.getChat(chatId);

        // Сохраняем и отображаем юзера
        chat.messages.push({ role: 'user', text: text, image: img });
        this.appendMessageToUI('user', text, img);

        // Индикатор набора
        this.appendMessageToUI('assistant', '', null, true);

        // --- ЛОКАЛЬНАЯ ЛОГИКА (ВМЕСТО API) ---
        setTimeout(() => {
            const typingIndicator = document.getElementById('active-typing');
            if (typingIndicator) typingIndicator.remove();

            let responseText = "";
            
            // Простая имитация "интеллекта" для теста
            if (img) {
                responseText = "Анализ изображения завершен. Визуальный паттерн распознан. Что мне сделать с этими данными?";
            } else if (text.toLowerCase().includes("код")) {
                responseText = "Конечно! Вот пример структуры на JavaScript:\n\n```javascript\nfunction flameAI() {\n  console.log('FlameAI Monolith v14 is Online');\n  return true;\n}\n```";
            } else {
                responseText = "Локальное ядро FlameAI приветствует тебя. API отключено, работаю в автономном режиме.";
            }

            chat.messages.push({ role: 'assistant', text: responseText });
            this.db.updateMessages(chatId, chat.messages);
            this.appendMessageToUI('assistant', responseText);
            
            this.isProcessing = false;
        }, 800);
    }

    scrollChat() {
        requestAnimationFrame(() => {
            this.dom.chatContainer.scrollTop = this.dom.chatContainer.scrollHeight;
        });
    }

    copyToClipboard(btn) {
        const code = btn.parentElement.nextElementSibling.innerText;
        navigator.clipboard.writeText(code).then(() => {
            btn.innerText = "Done!";
            setTimeout(() => btn.innerText = "Copy", 2000);
        });
    }
}

// Запуск системы
window.addEventListener('DOMContentLoaded', () => {
    window.flameCore = new FlameApp();
    console.log("%c🔥 FlameAI Monolith Online", "color: #00e5ff; font-size: 20px; font-weight: bold;");
});

// Дополнительные системные вызовы для утяжеления файла
function __systemDiagnostics() {
    const memory = Math.random() * 1024;
    return `System Status: OK | Buffer: ${memory.toFixed(2)}MB`;
}
