/**
 * ============================================================================
 * FlameAI CORE ENGINE - VISION & CODE EDITION
 * Version: 14.0.1 (Monolith PC) - FULL RECOVERY
 * ============================================================================
 * ОПИСАНИЕ:
 * Полная версия системы с физикой, кэшированием и Vision-модулем.
 * ЛОГИКА АНАЛИЗА КОДА ПЕРЕНЕСЕНА ВНУТРЬ ЧАТА.
 */

"use strict";

// ============================================================================
// [1] CUSTOM SYNTAX HIGHLIGHTER (Движок подсветки внутри чата)
// ============================================================================
class FlameSyntaxHighlighter {
    static highlight(code, language = 'javascript') {
        let safeCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const patterns = [
            { regex: /(\/\/.*|\/\*[\s\S]*?\*\/)/g, class: 'syntax-comment' },
            { regex: /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, class: 'syntax-string' },
            { regex: /\b(const|let|var|function|class|return|if|else|for|while|import|export|from|async|await|try|catch|def|public|private)\b/g, class: 'syntax-keyword' },
            { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, class: 'syntax-function' },
            { regex: /\b(\d+(?:\.\d+)?)\b/g, class: 'syntax-number' },
            { regex: /\b(window|document|console|this|true|false|null|undefined)\b/g, class: 'syntax-variable' }
        ];

        const tokens = [];
        let tokenIndex = 0;

        patterns.slice(0, 2).forEach(pattern => {
            safeCode = safeCode.replace(pattern.regex, (match) => {
                const token = `__FLAME_TOKEN_${tokenIndex++}__`;
                tokens.push({ token, match, class: pattern.class });
                return token;
            });
        });

        patterns.slice(2).forEach(pattern => {
            safeCode = safeCode.replace(pattern.regex, `<span class="${pattern.class}">$1</span>`);
        });

        tokens.forEach(({ token, match, class: className }) => {
            safeCode = safeCode.replace(token, `<span class="${className}">${match}</span>`);
        });

        return safeCode;
    }
}

// ============================================================================
// [2] MARKDOWN & CODE PARSER (Теперь без вырезания в "Code Inspector")
// ============================================================================
class FlameParser {
    static parseResponse(rawText) {
        // Регулярка для поиска блоков кода
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let cleanText = rawText;

        // Вместо создания кнопок "Посмотреть код", мы рендерим его сразу красиво
        cleanText = cleanText.replace(regex, (match, lang, code) => {
            const language = lang || 'javascript';
            const highlighted = FlameSyntaxHighlighter.highlight(code.trim(), language);
            return `
                <div class="inline-code-container">
                    <div class="inline-code-header">
                        <span>${language.toUpperCase()}</span>
                    </div>
                    <pre class="flame-code-block"><code>${highlighted}</code></pre>
                </div>
            `;
        });

        // Форматируем переносы строк для обычного текста
        cleanText = cleanText.replace(/\n/g, '<br>');

        return { text: cleanText };
    }
}

// ============================================================================
// [3] VISION & UPLOAD MODULE (Модуль загрузки изображений)
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
        if (this.elements.uploadBtn) {
            this.elements.uploadBtn.addEventListener('click', () => this.elements.fileInput.click());
        }

        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.processFile(e.target.files[0]);
        });

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
            if (e.dataTransfer.files.length > 0) this.processFile(e.dataTransfer.files[0]);
        });
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.ui.showToast('Ошибка: Разрешены только изображения');
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
        document.getElementById('remove-img').addEventListener('click', () => this.clear());
    }

    clear() {
        this.currentImageBase64 = null;
        this.elements.previewContainer.innerHTML = '';
        this.elements.previewContainer.style.display = 'none';
        this.elements.fileInput.value = '';
    }

    hasImage() { return this.currentImageBase64 !== null; }
    getImageData() { return this.currentImageBase64; }
}

// ============================================================================
// [4] BACKGROUND PARTICLE ENGINE (Тяжелая физика фона)
// ============================================================================
class PhysicsEngine {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.particles = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.count = 150; 
        
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
                vx: (Math.random() - 0.5) * 1.2,
                vy: (Math.random() - 0.5) * 1.2,
                size: Math.random() * 2.5 + 1,
                color: Math.random() > 0.85 ? '#00e5ff' : '#0055ff'
            });
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.init();
    }

    animate() {
        this.ctx.fillStyle = '#000511';
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

            for (let j = i + 1; j < this.count; j++) {
                let p2 = this.particles[j];
                let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 140) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(0, 85, 255, ${1 - dist / 140})`;
                    this.ctx.lineWidth = 0.6;
                    this.ctx.stroke();
                }
            }
        }
        requestAnimationFrame(() => this.animate());
    }
}

// ============================================================================
// [5] STORAGE MANAGER (Система сохранения истории)
// ============================================================================
class DBManager {
    constructor() {
        this.key = 'flameai_vision_db_v14';
        this.activeKey = 'flameai_vision_active';
        this.data = this.load();
    }

    load() {
        try {
            const stored = localStorage.getItem(this.key);
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    }

    save() {
        try {
            localStorage.setItem(this.key, JSON.stringify(this.data));
        } catch (e) {
            console.warn("Storage Full - Clearing old sessions");
            if (this.data.length > 5) this.data.pop();
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
// [6] UI CONTROLLER & APP CORE (Главный мозг FlameAI)
// ============================================================================
class FlameApp {
    constructor() {
        this.db = new DBManager();
        this.vision = new VisionModule(this);
        this.isProcessing = false;

        this.dom = {
            sidebar: document.getElementById('chat-list'),
            chatArea: document.getElementById('chat-messages'),
            input: document.getElementById('text-input'),
            sendBtn: document.getElementById('send-btn'),
            newBtn: document.getElementById('new-chat-btn'),
            appContainer: document.getElementById('app-container')
        };

        this.init();
    }

    init() {
        console.log("🔥 FlameAI Engine Initializing...");
        new PhysicsEngine();
        this.bindEvents();
        
        const active = this.db.getActiveId();
        if (!active || !this.db.getChat(active)) {
            const all = this.db.getAll();
            if (all.length > 0) {
                this.db.setActiveId(all[0].id);
            } else {
                this.createNewSession();
            }
        }
        
        this.renderSidebar();
        this.renderChat();
    }

    bindEvents() {
        this.dom.newBtn.onclick = () => this.createNewSession();
        this.dom.sendBtn.onclick = () => this.handleSend();
        this.dom.input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        };
    }

    createNewSession() {
        const id = 'flame_vc_' + Date.now();
        this.db.addChat({ id, title: "Новый анализ", messages: [] });
        this.db.setActiveId(id);
        this.vision.clear();
        this.renderSidebar();
        this.renderChat();
    }

    renderSidebar() {
        this.dom.sidebar.innerHTML = '';
        const activeId = this.db.getActiveId();
        
        this.db.getAll().forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-item ${chat.id === activeId ? 'active' : ''}`;
            
            const title = document.createElement('span');
            title.textContent = chat.title || "Без названия";
            
            const delBtn = document.createElement('div');
            delBtn.className = 'delete-chat';
            delBtn.innerHTML = '✕';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                this.db.deleteChat(chat.id);
                const rem = this.db.getAll();
                if (rem.length > 0) this.db.setActiveId(rem[0].id);
                else this.createNewSession();
                this.renderSidebar();
                this.renderChat();
            };
            
            item.appendChild(title);
            item.appendChild(delBtn);
            item.onclick = () => {
                if (chat.id === activeId) return;
                this.db.setActiveId(chat.id);
                this.renderSidebar();
                this.renderChat();
            };
            this.dom.sidebar.appendChild(item);
        });
    }

    renderChat() {
        this.dom.chatArea.innerHTML = '';
        const activeId = this.db.getActiveId();
        const chat = this.db.getChat(activeId);
        if (chat) {
            chat.messages.forEach(msg => {
                this.appendMessage(msg.role, msg.text, msg.image);
            });
        }
        this.scrollToBottom();
    }

    appendMessage(role, text, imageSrc = null, isTyping = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-block ${role === 'user' ? 'user-block' : 'ai-block'}`;

        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = role === 'user' ? 'System Console' : 'FlameAI Vision';
        wrapper.appendChild(sender);

        const content = document.createElement('div');
        content.className = 'message-content';

        if (isTyping) {
            content.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
            wrapper.id = 'flame-typing';
        } else {
            const parsed = FlameParser.parseResponse(text);
            content.innerHTML = parsed.text;

            if (imageSrc) {
                const img = document.createElement('img');
                img.className = 'chat-attached-image';
                img.src = imageSrc;
                img.style.maxWidth = '100%';
                img.style.borderRadius = '10px';
                img.style.marginTop = '10px';
                content.appendChild(img);
            }
        }

        wrapper.appendChild(content);
        this.dom.chatArea.appendChild(wrapper);
    }

    async handleSend() {
        if (this.isProcessing) return;
        
        const rawText = this.dom.input.value.trim();
        const imgSrc = this.vision.getImageData();
        
        if (!rawText && !imgSrc) return;

        this.isProcessing = true;
        this.dom.input.value = '';
        this.vision.clear();

        const activeId = this.db.getActiveId();
        const chat = this.db.getChat(activeId);

        // Обновляем заголовок чата по первому сообщению
        if (chat.messages.length === 0 && rawText) {
            chat.title = rawText.substring(0, 25);
            this.db.updateChat(activeId, { title: chat.title });
            this.renderSidebar();
        }

        chat.messages.push({ role: 'user', text: rawText, image: imgSrc });
        this.db.updateChat(activeId, { messages: chat.messages });
        this.appendMessage('user', rawText, imgSrc);
        
        this.appendMessage('assistant', '', null, true);
        this.scrollToBottom();

        try {
            const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: rawText, image: imgSrc })
            });

            const data = await res.json();
            const reply = data.reply || "FlameAI Core: Ответ получен, но он пуст.";

            if (document.getElementById('flame-typing')) document.getElementById('flame-typing').remove();

            chat.messages.push({ role: 'assistant', text: reply });
            this.db.updateChat(activeId, { messages: chat.messages });
            this.appendMessage('assistant', reply);

        } catch (e) {
            if (document.getElementById('flame-typing')) document.getElementById('flame-typing').remove();
            const errReply = "Критическая ошибка: Vision API не отвечает. Проверьте серверную часть.";
            this.appendMessage('assistant', errReply);
        } finally {
            this.isProcessing = false;
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.dom.chatArea.scrollTop = this.dom.chatArea.scrollHeight;
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
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Загрузка системы
window.addEventListener('load', () => {
    window.flameCore = new FlameApp();
    console.log("🔥 FlameAI Monolith | System Online | Memory Allocated");
});
