/**
 * ============================================================================
 * FlameAI CORE ENGINE - VISION & CODE EDITION
 * Version: 14.0 (Monolith PC)
 * ============================================================================
 * ОГРОМНЫЙ ФАЙЛ. Включает:
 * 1. Кастомный парсер кода (без внешних библиотек)
 * 2. Модуль загрузки изображений (Base64 + Drag&Drop)
 * 3. Изоляцию кода в отдельное окно (Code Inspector)
 * 4. Продвинутую симуляцию физики
 * 5. Систему управления кэшем.
 */

"use strict";

// ============================================================================
// [1] CUSTOM SYNTAX HIGHLIGHTER (Встроенный движок подсветки)
// ============================================================================
class FlameSyntaxHighlighter {
    static highlight(code, language = 'javascript') {
        // Базовая защита от XSS
        let safeCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Регулярные выражения для токенизации
        const patterns = [
            // Комментарии (// или /* */)
            { regex: /(\/\/.*|\/\*[\s\S]*?\*\/)/g, class: 'syntax-comment' },
            // Строки (' ' или " " или ` `)
            { regex: /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, class: 'syntax-string' },
            // Ключевые слова (JS/TS/Python/C++)
            { regex: /\b(const|let|var|function|class|return|if|else|for|while|import|export|from|async|await|try|catch|def|public|private)\b/g, class: 'syntax-keyword' },
            // Функции (вызовы)
            { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, class: 'syntax-function' },
            // Числа
            { regex: /\b(\d+(?:\.\d+)?)\b/g, class: 'syntax-number' },
            // Встроенные объекты и переменные
            { regex: /\b(window|document|console|this|true|false|null|undefined)\b/g, class: 'syntax-variable' }
        ];

        // Временные токены для предотвращения конфликтов замен
        const tokens = [];
        let tokenIndex = 0;

        // Извлекаем строки и комментарии первыми, чтобы не ломать логику внутри них
        patterns.slice(0, 2).forEach(pattern => {
            safeCode = safeCode.replace(pattern.regex, (match) => {
                const token = `__FLAME_TOKEN_${tokenIndex++}__`;
                tokens.push({ token, match, class: pattern.class });
                return token;
            });
        });

        // Применяем остальные правила
        patterns.slice(2).forEach(pattern => {
            safeCode = safeCode.replace(pattern.regex, `<span class="${pattern.class}">$1</span>`);
        });

        // Возвращаем строки и комментарии
        tokens.forEach(({ token, match, class: className }) => {
            safeCode = safeCode.replace(token, `<span class="${className}">${match}</span>`);
        });

        return safeCode;
    }
}

// ============================================================================
// [2] MARKDOWN & CODE PARSER (Разделение текста и кода)
// ============================================================================
class FlameParser {
    /**
     * Разбирает ответ ИИ. Извлекает блоки ```code```.
     * Возвращает объект с чистым текстом и массивом извлеченного кода.
     */
    static parseResponse(rawText) {
        const codeBlocks = [];
        // Ищем блоки вида ```lang ... ```
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        
        let match;
        let cleanText = rawText;

        while ((match = regex.exec(rawText)) !== null) {
            const language = match[1] || 'text';
            const codeContent = match[2];
            const blockId = 'code_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            
            codeBlocks.push({
                id: blockId,
                language: language,
                code: codeContent.trim()
            });

            // Заменяем код в оригинальном тексте на специальный HTML-плейсхолдер
            const placeholder = `
                <div class="code-alert">
                    <div class="code-alert-text">📦 Обнаружен фрагмент кода (${language})</div>
                    <button class="open-code-btn" data-code-id="${blockId}">Посмотреть код</button>
                </div>
            `;
            cleanText = cleanText.replace(match[0], placeholder);
        }

        // Заменяем переносы строк на <br> для обычного текста
        cleanText = cleanText.replace(/\n/g, '<br>');

        return { text: cleanText, blocks: codeBlocks };
    }
}

// ============================================================================
// [3] VISION & UPLOAD MODULE (Анализ Изображений)
// ============================================================================
class VisionModule {
    constructor(uiManager) {
        this.ui = uiManager;
        this.currentImageBase64 = null;
        
        this.elements = {
            fileInput: document.getElementById('file-input'),
            uploadBtn: document.getElementById('upload-btn'),
            previewContainer: document.getElementById('image-preview-container'),
            inputZone: document.getElementById('drop-zone')
        };
        
        this.bindEvents();
    }

    bindEvents() {
        // Клик по кнопке скрепки
        this.elements.uploadBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // Выбор файла через окно
        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processFile(e.target.files[0]);
            }
        });

        // Drag & Drop
        this.elements.inputZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.inputZone.classList.add('dragover');
        });

        this.elements.inputZone.addEventListener('dragleave', () => {
            this.elements.inputZone.classList.remove('dragover');
        });

        this.elements.inputZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.inputZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.processFile(e.dataTransfer.files[0]);
            }
        });
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.ui.showToast('Ошибка: Только изображения разрешены для Vision анализа.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImageBase64 = e.target.result;
            this.showPreview(this.currentImageBase64);
        };
        reader.readAsDataURL(file);
    }

    showPreview(src) {
        this.elements.previewContainer.innerHTML = `
            <div class="preview-box">
                <img src="${src}" alt="Vision Input">
                <div class="remove-image-btn" id="remove-img">✕</div>
            </div>
        `;
        this.elements.previewContainer.style.display = 'flex';
        
        document.getElementById('remove-img').addEventListener('click', () => {
            this.clear();
        });
    }

    clear() {
        this.currentImageBase64 = null;
        this.elements.previewContainer.innerHTML = '';
        this.elements.previewContainer.style.display = 'none';
        this.elements.fileInput.value = '';
    }

    hasImage() {
        return this.currentImageBase64 !== null;
    }

    getImageData() {
        return this.currentImageBase64;
    }
}

// ============================================================================
// [4] BACKGROUND PARTICLE ENGINE (Продвинутая Физика)
// ============================================================================
class PhysicsEngine {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.particles = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Настройки для тяжелого ПК
        this.count = 120;
        
        this.init();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    init() {
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                size: Math.random() * 3 + 1,
                color: Math.random() > 0.8 ? '#00e5ff' : '#0055ff'
            });
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    animate() {
        this.ctx.fillStyle = '#000511'; // Deep space
        this.ctx.fillRect(0, 0, this.width, this.height);

        for (let i = 0; i < this.count; i++) {
            let p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > this.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.height) p.vy *= -1;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();

            // Линии
            for (let j = i + 1; j < this.count; j++) {
                let p2 = this.particles[j];
                let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 150) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(0, 85, 255, ${1 - dist / 150})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
        requestAnimationFrame(() => this.animate());
    }
}

// ============================================================================
// [5] STORAGE MANAGER (Кэширование с поддержкой картинок)
// ============================================================================
class DBManager {
    constructor() {
        this.key = 'flameai_vision_db_v14';
        this.activeKey = 'flameai_vision_active';
        this.data = this.load();
    }

    load() {
        try {
            return JSON.parse(localStorage.getItem(this.key)) || [];
        } catch { return []; }
    }

    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.data));
        } catch (e) {
            console.error("Storage Full! Base64 images taking too much space.");
        }
    }

    getActiveId() { return localStorage.getItem(this.activeKey); }
    setActiveId(id) { localStorage.setItem(this.activeKey, id); }

    getAll() { return this.data; }
    
    getChat(id) { return this.data.find(c => c.id === id); }
    
    addChat(chat) {
        this.data.unshift(chat);
        this.save();
    }

    updateChat(id, updates) {
        const idx = this.data.findIndex(c => c.id === id);
        if (idx !== -1) {
            this.data[idx] = { ...this.data[idx], ...updates };
            this.save();
        }
    }

    deleteChat(id) {
        this.data = this.data.filter(c => c.id !== id);
        this.save();
    }
}

// ============================================================================
// [6] UI CONTROLLER & APP CORE
// ============================================================================
class FlameApp {
    constructor() {
        this.db = new DBManager();
        this.vision = new VisionModule(this);
        this.codeBlocksMap = new Map(); // Хранит сгенерированный код
        this.isProcessing = false;

        this.dom = {
            sidebar: document.getElementById('chat-list'),
            chatArea: document.getElementById('chat-messages'),
            input: document.getElementById('text-input'),
            sendBtn: document.getElementById('send-btn'),
            newBtn: document.getElementById('new-chat-btn'),
            
            // Code Inspector Elements
            codePanel: document.getElementById('code-inspector'),
            codeTitle: document.getElementById('ci-title'),
            codePre: document.getElementById('ci-pre'),
            closeCodeBtn: document.getElementById('ci-close'),
            copyCodeBtn: document.getElementById('ci-copy')
        };

        this.init();
    }

    init() {
        new PhysicsEngine();
        this.bindEvents();
        
        const active = this.db.getActiveId();
        if (!active || !this.db.getChat(active)) {
            if (this.db.getAll().length > 0) {
                this.db.setActiveId(this.db.getAll()[0].id);
            } else {
                this.createNewSession();
            }
        }
        
        this.renderSidebar();
        this.renderChat();
    }

    bindEvents() {
        this.dom.newBtn.addEventListener('click', () => this.createNewSession());
        this.dom.sendBtn.addEventListener('click', () => this.handleSend());
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Code Inspector Events
        this.dom.closeCodeBtn.addEventListener('click', () => {
            this.dom.codePanel.classList.remove('open');
        });
        
        this.dom.copyCodeBtn.addEventListener('click', () => {
            const code = this.dom.codePre.innerText;
            navigator.clipboard.writeText(code).then(() => {
                this.showToast("Код скопирован в буфер обмена!");
            });
        });
    }

    createNewSession() {
        const id = 'flame_vc_' + Date.now();
        this.db.addChat({ id, title: "Новый анализ", messages: [] });
        this.db.setActiveId(id);
        this.vision.clear();
        this.renderSidebar();
        this.renderChat();
        this.dom.codePanel.classList.remove('open');
    }

    renderSidebar() {
        this.dom.sidebar.innerHTML = '';
        const activeId = this.db.getActiveId();
        
        this.db.getAll().forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-item ${chat.id === activeId ? 'active' : ''}`;
            
            const title = document.createElement('span');
            title.textContent = chat.title || "Анализ файлов";
            
            const delBtn = document.createElement('div');
            delBtn.className = 'delete-chat';
            delBtn.innerHTML = '✕';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if(confirm("Удалить этот лог навсегда?")) {
                    this.db.deleteChat(chat.id);
                    const remaining = this.db.getAll();
                    if (remaining.length > 0) {
                        this.db.setActiveId(remaining[0].id);
                    } else {
                        this.createNewSession();
                    }
                    this.renderSidebar();
                    this.renderChat();
                    this.dom.codePanel.classList.remove('open');
                }
            };
            
            item.appendChild(title);
            item.appendChild(delBtn);
            
            item.onclick = () => {
                if (chat.id === activeId) return;
                this.db.setActiveId(chat.id);
                this.renderSidebar();
                this.renderChat();
                this.dom.codePanel.classList.remove('open');
            };
            
            this.dom.sidebar.appendChild(item);
        });
    }

    renderChat() {
        this.dom.chatArea.innerHTML = '';
        this.codeBlocksMap.clear(); // Сброс карты кода
        
        const activeId = this.db.getActiveId();
        const chat = this.db.getChat(activeId);
        if (!chat) return;

        chat.messages.forEach(msg => {
            this.appendMessage(msg.role, msg.text, msg.image);
            
            // Если ИИ, парсим код заново для карты
            if (msg.role === 'assistant') {
                const parsed = FlameParser.parseResponse(msg.text);
                parsed.blocks.forEach(b => this.codeBlocksMap.set(b.id, b));
            }
        });
        
        this.scrollToBottom();
    }

    appendMessage(role, text, imageSrc = null, isTyping = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-block ${role === 'user' ? 'user-block' : 'ai-block'}`;

        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = role === 'user' ? 'Flame Console' : 'FlameAI Vision Core';
        wrapper.appendChild(sender);

        const content = document.createElement('div');
        content.className = 'message-content';

        if (isTyping) {
            content.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
            wrapper.id = 'flame-typing';
        } else {
            // Если текст от ИИ, парсим его
            if (role === 'assistant') {
                const parsed = FlameParser.parseResponse(text);
                content.innerHTML = parsed.text;
                
                // Добавляем обработчики кнопок открытия кода
                setTimeout(() => {
                    const btns = content.querySelectorAll('.open-code-btn');
                    btns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            const codeId = btn.getAttribute('data-code-id');
                            this.openCodeInspector(codeId);
                        });
                    });
                }, 100);

            } else {
                content.innerHTML = text.replace(/\n/g, '<br>');
            }

            // Изображение пользователя
            if (imageSrc) {
                const img = document.createElement('img');
                img.className = 'chat-attached-image';
                img.src = imageSrc;
                content.appendChild(img);
            }

            // Кнопка копирования текста сообщения
            const copyBtn = document.createElement('div');
            copyBtn.className = 'copy-text-btn';
            copyBtn.innerHTML = `<span>📋</span> Copy Text`;
            copyBtn.onclick = () => {
                const cleanText = text.replace(/```[\s\S]*?```/g, '[Смотреть код во вкладке]'); // Удаляем сырой код из текста
                navigator.clipboard.writeText(cleanText).then(() => this.showToast('Текст скопирован!'));
            };
            content.appendChild(copyBtn);
        }

        wrapper.appendChild(content);
        this.dom.chatArea.appendChild(wrapper);
    }

    openCodeInspector(codeId) {
        const block = this.codeBlocksMap.get(codeId);
        if (!block) return;

        this.dom.codeTitle.textContent = `${block.language.toUpperCase()} Script`;
        
        // Применяем кастомную подсветку синтаксиса
        const highlighted = FlameSyntaxHighlighter.highlight(block.code, block.language);
        this.dom.codePre.innerHTML = highlighted;

        // Открываем панель с правой стороны
        this.dom.codePanel.classList.add('open');
    }

    async handleSend() {
        if (this.isProcessing) return;
        
        const rawText = this.dom.input.value.trim();
        const hasImg = this.vision.hasImage();
        const imgSrc = this.vision.getImageData();
        
        if (!rawText && !hasImg) return;

        this.isProcessing = true;
        this.dom.input.value = '';
        this.vision.clear();

        const activeId = this.db.getActiveId();
        const chat = this.db.getChat(activeId);

        // Обновляем название чата
        if (chat.messages.length === 0) {
            chat.title = rawText ? rawText.substring(0, 20) : "Анализ изображения";
            this.db.updateChat(activeId, { title: chat.title });
            this.renderSidebar();
        }

        chat.messages.push({ role: 'user', text: rawText, image: imgSrc });
        this.db.updateChat(activeId, { messages: chat.messages });
        this.appendMessage('user', rawText, imgSrc);
        this.scrollToBottom();

        this.appendMessage('assistant', '', null, true);
        this.scrollToBottom();

        // Симуляция отправки на Vision сервер
        try {
            const bodyData = { message: rawText };
            if (imgSrc) bodyData.image = imgSrc;

            const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const data = await res.json();
            const reply = data.reply || this.generateMockResponse(); // Фейковый ответ с кодом для тестов

            document.getElementById('flame-typing').remove();

            // Парсим ответ и сохраняем блоки в память для текущей сессии
            const parsedInfo = FlameParser.parseResponse(reply);
            parsedInfo.blocks.forEach(b => this.codeBlocksMap.set(b.id, b));

            chat.messages.push({ role: 'assistant', text: reply });
            this.db.updateChat(activeId, { messages: chat.messages });
            this.appendMessage('assistant', reply);
            this.scrollToBottom();

        } catch (e) {
            document.getElementById('flame-typing').remove();
            
            // Если сервера нет, кидаем фейковый ответ, чтобы ты мог увидеть разделение окон
            console.warn("API Offline. Using localized test script generation.");
            const fakeReply = this.generateMockResponse();
            
            const parsedInfo = FlameParser.parseResponse(fakeReply);
            parsedInfo.blocks.forEach(b => this.codeBlocksMap.set(b.id, b));

            chat.messages.push({ role: 'assistant', text: fakeReply });
            this.db.updateChat(activeId, { messages: chat.messages });
            this.appendMessage('assistant', fakeReply);
            this.scrollToBottom();
        } finally {
            this.isProcessing = false;
        }
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.dom.chatArea.scrollTo({
                top: this.dom.chatArea.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    showToast(msg) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = '0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    generateMockResponse() {
        return `Я проанализировал ваш запрос и изображение макета.\nСтруктура требует создания отдельного класса для обработки рендера. Вот готовая реализация:\n\n\`\`\`javascript\nclass RenderEngine {\n    constructor(canvasId) {\n        this.canvas = document.getElementById(canvasId);\n        this.ctx = this.canvas.getContext('2d');\n        console.log("Renderer ready");\n    }\n\n    drawObject(x, y, color) {\n        this.ctx.fillStyle = color;\n        this.ctx.fillRect(x, y, 100, 100);\n    }\n}\n\`\`\`\n\nТакже, для стилизации кнопок, добавьте следующий CSS в главный файл:\n\n\`\`\`css\n.btn-render {\n    background: #007bff;\n    color: white;\n    padding: 15px 30px;\n    border-radius: 8px;\n    box-shadow: 0 10px 20px rgba(0, 123, 255, 0.4);\n}\n\`\`\`\n\nНажмите на кнопку просмотра кода в чате, чтобы открыть его в безопасной изолированной вкладке Code Inspector. Там вы сможете скопировать его в один клик.`;
    }
}

// ============================================================================
// [7] BOOTSTRAP
// ============================================================================
window.addEventListener('load', () => {
    window.flameCore = new FlameApp();
    console.log("🔥 FlameAI Vision & Code Edition | System Online | Memory Allocated");
});
