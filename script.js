/**
 * FlameAI CORE ENGINE - DESKTOP ARCHITECTURE
 * Version: 13.0 (Monolith)
 * Target: PC Only
 * ---------------------------------------------------------
 * Объектно-ориентированная архитектура.
 * Сложная симуляция физики частиц на фоне.
 * Продвинутая система кэширования и управления DOM.
 */

"use strict";

// ============================================================================
// [1] ADVANCED PARTICLE PHYSICS ENGINE (CANVAS)
// ============================================================================
class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(vector) { this.x += vector.x; this.y += vector.y; }
    sub(vector) { this.x -= vector.x; this.y -= vector.y; }
    mult(n) { this.x *= n; this.y *= n; }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const m = this.mag();
        if (m !== 0) { this.mult(1 / m); }
    }
}

class Particle {
    /**
     * @param {number} x
     * @param {number} y
     * @param {HTMLCanvasElement} canvas
     */
    constructor(x, y, canvas) {
        this.canvas = canvas;
        this.pos = new Vector2D(x, y);
        this.vel = new Vector2D((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
        this.acc = new Vector2D(0, 0);
        this.size = Math.random() * 15 + 5;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.03;
        
        // Complex coloring based on theme
        const isAccent = Math.random() > 0.8;
        this.color = isAccent ? '#007bff' : '#ffffff';
        this.baseAlpha = Math.random() * 0.15 + 0.05;
        this.alpha = this.baseAlpha;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.vel.add(this.acc);
        // Friction / Air resistance
        this.vel.mult(0.995);
        this.pos.add(this.vel);
        this.acc.mult(0); // Reset acceleration
        
        this.angle += this.spin;
        
        // Pulsating effect
        this.pulsePhase += 0.02;
        this.alpha = this.baseAlpha + Math.sin(this.pulsePhase) * 0.05;

        // Wrap around screen boundaries (Infinite Space Desktop)
        const margin = 50;
        if (this.pos.x < -margin) this.pos.x = this.canvas.width + margin;
        if (this.pos.x > this.canvas.width + margin) this.pos.x = -margin;
        if (this.pos.y < -margin) this.pos.y = this.canvas.height + margin;
        if (this.pos.y > this.canvas.height + margin) this.pos.y = -margin;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        
        ctx.beginPath();
        // Drawing an elegant triangle instead of generic circles
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, this.size);
        ctx.lineTo(-this.size, this.size);
        ctx.closePath();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = this.alpha;
        
        if (this.color === '#007bff') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#007bff';
        }
        
        ctx.stroke();
        ctx.restore();
    }
}

class BackgroundEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if(!this.canvas) return;
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.particles = [];
        this.config = {
            particleCount: Math.floor((window.innerWidth * window.innerHeight) / 18000), // Responsive density for PC
            connectionDistance: 180,
            mouseRepelRadius: 200,
            mouseForce: 0.05
        };
        this.mouse = new Vector2D(-1000, -1000); // Offscreen initially
        
        this.init();
        this.bindEvents();
        this.animate();
        console.log(`[FlameAI Engine] Core Initialized. Processing ${this.config.particleCount} complex vectors.`);
    }

    init() {
        this.resize();
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push(new Particle(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                this.canvas
            ));
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            // Re-adjust particle count on resize for optimal desktop performance
            this.config.particleCount = Math.floor((window.innerWidth * window.innerHeight) / 18000);
            this.init(); 
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mouseout', () => {
            this.mouse.x = -1000;
            this.mouse.y = -1000;
        });
    }

    applyMouseInteraction() {
        for (let p of this.particles) {
            let dx = p.pos.x - this.mouse.x;
            let dy = p.pos.y - this.mouse.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.config.mouseRepelRadius) {
                let forceMagnitude = (this.config.mouseRepelRadius - distance) / this.config.mouseRepelRadius;
                let force = new Vector2D(dx, dy);
                force.normalize();
                force.mult(forceMagnitude * this.config.mouseForce);
                p.applyForce(force);
            }
        }
    }

    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                let p1 = this.particles[i];
                let p2 = this.particles[j];
                let dx = p1.pos.x - p2.pos.x;
                let dy = p1.pos.y - p2.pos.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.connectionDistance) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.pos.x, p1.pos.y);
                    this.ctx.lineTo(p2.pos.x, p2.pos.y);
                    
                    // Gradient calculation based on distance
                    let opacity = (1 - (distance / this.config.connectionDistance)) * 0.15;
                    this.ctx.strokeStyle = `rgba(100, 150, 255, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        // Deep space background fill
        this.ctx.fillStyle = '#000814';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.applyMouseInteraction();

        for (let p of this.particles) {
            p.update();
            p.draw(this.ctx);
        }

        this.drawConnections();

        requestAnimationFrame(this.animate.bind(this));
    }
}

// ============================================================================
// [2] LOCAL STORAGE MANAGER (ENCRYPTED MOCKUP)
// ============================================================================
class StorageManager {
    constructor(dbKey) {
        this.dbKey = dbKey;
        this.cache = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.dbKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("[StorageManager] Data corruption detected. Resetting database.");
            return [];
        }
    }

    save(data) {
        try {
            // In a real PC app, we might use IndexedDB or base64 encode this
            localStorage.setItem(this.dbKey, JSON.stringify(data));
            this.cache = data;
        } catch (error) {
            console.error("[StorageManager] Storage quota exceeded.", error);
        }
    }

    getChat(id) {
        return this.cache.find(chat => chat.id === id) || null;
    }

    getAllChats() {
        return this.cache;
    }

    addChat(chatObj) {
        this.cache.unshift(chatObj);
        this.save(this.cache);
    }

    updateChat(id, updatedData) {
        const index = this.cache.findIndex(c => c.id === id);
        if (index !== -1) {
            this.cache[index] = { ...this.cache[index], ...updatedData };
            this.save(this.cache);
        }
    }

    deleteChat(id) {
        this.cache = this.cache.filter(c => c.id !== id);
        this.save(this.cache);
    }
}

// ============================================================================
// [3] UI AND STATE CONTROLLER (DESKTOP WORKSPACE)
// ============================================================================
class FlameUIManager {
    constructor(storage) {
        this.storage = storage;
        this.activeChatId = localStorage.getItem('flame_active_workspace') || null;
        this.isProcessing = false;

        // DOM Elements setup
        this.dom = {
            sidebarList: document.getElementById('chat-list'),
            chatArea: document.getElementById('chat-messages'),
            inputBox: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            newChatBtn: document.getElementById('new-chat-btn')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        const chats = this.storage.getAllChats();
        
        if (chats.length === 0) {
            this.createNewWorkspace();
        } else {
            // Ensure active chat exists
            if (!this.storage.getChat(this.activeChatId)) {
                this.activeChatId = chats[0].id;
                this.persistActiveChat();
            }
            this.renderSidebar();
            this.renderChatWindow();
        }
        
        // Auto-focus input on desktop load
        if(this.dom.inputBox) {
            setTimeout(() => this.dom.inputBox.focus(), 500);
        }
    }

    persistActiveChat() {
        localStorage.setItem('flame_active_workspace', this.activeChatId);
    }

    bindEvents() {
        if(this.dom.newChatBtn) {
            this.dom.newChatBtn.addEventListener('click', () => this.createNewWorkspace());
        }

        if(this.dom.sendBtn) {
            this.dom.sendBtn.addEventListener('click', () => this.processUserInput());
        }

        if(this.dom.inputBox) {
            this.dom.inputBox.addEventListener('keydown', (e) => {
                // Submit on Enter (but allow Shift+Enter for new line)
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.processUserInput();
                }
            });

            // Auto-resize textarea logic
            this.dom.inputBox.addEventListener('input', function() {
                this.style.height = '56px'; // Reset base height
                let scrollHeight = this.scrollHeight;
                if (scrollHeight > 56 && scrollHeight < 200) {
                    this.style.height = scrollHeight + 'px';
                } else if (scrollHeight >= 200) {
                    this.style.height = '200px';
                }
            });
        }
    }

    createNewWorkspace() {
        const timestamp = Date.now();
        const newChat = {
            id: `workspace_${timestamp}_${Math.random().toString(36).substr(2, 5)}`,
            title: "Новый процесс",
            messages: [],
            created_at: new Date().toISOString()
        };

        this.storage.addChat(newChat);
        this.activeChatId = newChat.id;
        this.persistActiveChat();
        
        this.renderSidebar();
        this.renderChatWindow();
        if(this.dom.inputBox) this.dom.inputBox.focus();
    }

    deleteWorkspace(id, event) {
        event.stopPropagation(); // Prevent triggering chat selection
        
        // Confirm deletion mapping to standard desktop OS UX
        if(confirm("Удалить этот лог чата навсегда?")) {
            this.storage.deleteChat(id);
            const remaining = this.storage.getAllChats();
            
            if (this.activeChatId === id) {
                this.activeChatId = remaining.length > 0 ? remaining[0].id : null;
                this.persistActiveChat();
                
                if (!this.activeChatId) {
                    this.createNewWorkspace();
                    return;
                }
            }
            this.renderSidebar();
            this.renderChatWindow();
        }
    }

    renderSidebar() {
        if (!this.dom.sidebarList) return;
        this.dom.sidebarList.innerHTML = '';
        
        const chats = this.storage.getAllChats();
        
        chats.forEach(chat => {
            const el = document.createElement('div');
            el.className = `chat-item ${chat.id === this.activeChatId ? 'active' : ''}`;
            
            el.innerHTML = `
                <div class="chat-item-content">
                    <svg class="chat-item-icon" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span class="chat-item-title">${this.escapeHTML(chat.title)}</span>
                </div>
                <div class="chat-item-delete" title="Delete Log">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
            `;

            // Setup listeners
            el.addEventListener('click', () => {
                if (this.activeChatId === chat.id) return;
                this.activeChatId = chat.id;
                this.persistActiveChat();
                this.renderSidebar();
                this.renderChatWindow();
            });

            const delBtn = el.querySelector('.chat-item-delete');
            delBtn.addEventListener('click', (e) => this.deleteWorkspace(chat.id, e));

            this.dom.sidebarList.appendChild(el);
        });
    }

    renderChatWindow() {
        if (!this.dom.chatArea) return;
        this.dom.chatArea.innerHTML = '';

        const activeChat = this.storage.getChat(this.activeChatId);
        
        if (!activeChat || activeChat.messages.length === 0) {
            this.showWelcomeScreen();
            return;
        }

        activeChat.messages.forEach(msg => {
            this.appendMessageElement(msg.role, msg.text);
        });

        this.scrollToBottom();
    }

    showWelcomeScreen() {
        this.dom.chatArea.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-icon">🔥</div>
                <h1 class="welcome-title">Система FlameAI</h1>
                <p class="welcome-subtitle">Ядро инициализировано и готово к работе. Ожидаю ввод данных на главном терминале.</p>
            </div>
        `;
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag));
    }

    formatTextForHTML(text) {
        // Simple formatter for line breaks. In a full app, marked.js would be used here.
        let safeText = this.escapeHTML(text);
        return safeText.replace(/\n/g, '<br>');
    }

    appendMessageElement(role, text, isTyping = false) {
        // Remove welcome screen if present
        const welcome = this.dom.chatArea.querySelector('.welcome-screen');
        if (welcome) welcome.remove();

        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${role === 'user' ? 'user-wrapper' : 'ai-wrapper'}`;

        const senderName = document.createElement('div');
        senderName.className = 'message-sender-name';
        senderName.textContent = role === 'user' ? 'Терминал Пользователя' : 'FlameAI Core';
        
        const messageDiv = document.createElement('div');
        
        if (isTyping) {
            messageDiv.className = 'typing-indicator';
            messageDiv.innerHTML = `
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            `;
            wrapper.id = 'flame-typing-indicator';
        } else {
            messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
            messageDiv.innerHTML = this.formatTextForHTML(text);
        }

        wrapper.appendChild(senderName);
        wrapper.appendChild(messageDiv);
        this.dom.chatArea.appendChild(wrapper);
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.dom.chatArea.scrollTo({
                top: this.dom.chatArea.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('flame-typing-indicator');
        if (indicator) indicator.remove();
    }

    async processUserInput() {
        if (this.isProcessing) return;
        
        const rawText = this.dom.inputBox.value.trim();
        if (!rawText) return;

        // Reset input area sizing
        this.dom.inputBox.value = '';
        this.dom.inputBox.style.height = '56px';
        
        this.isProcessing = true;
        const currentChat = this.storage.getChat(this.activeChatId);

        // Auto-generate title if it's the first message
        if (currentChat.messages.length === 0) {
            let newTitle = rawText.length > 25 ? rawText.substring(0, 25) + "..." : rawText;
            currentChat.title = newTitle;
            this.storage.updateChat(this.activeChatId, { title: newTitle });
            this.renderSidebar(); // Update title in UI
        }

        // Save and Render User Message
        currentChat.messages.push({ role: 'user', text: rawText });
        this.storage.updateChat(this.activeChatId, { messages: currentChat.messages });
        this.appendMessageElement('user', rawText);
        this.scrollToBottom();

        // Render AI Typing state
        this.appendMessageElement('assistant', '', true);
        this.scrollToBottom();

        // Simulate Network Request to backend
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: rawText })
            });
            
            let replyText;
            if (response.ok) {
                const data = await response.json();
                replyText = data.reply || "Пустой ответ от сервера.";
            } else {
                // If backend isn't connected, fallback to a graceful error
                console.warn("[FlameAI Network] Server offline, using local simulation.");
                await new Promise(r => setTimeout(r, 1500)); // Fake latency
                replyText = "Подключение к серверному ядру прервано. Это локальная симуляция FlameAI.";
            }

            this.removeTypingIndicator();
            
            // Save and render AI response
            currentChat.messages.push({ role: 'assistant', text: replyText });
            this.storage.updateChat(this.activeChatId, { messages: currentChat.messages });
            this.appendMessageElement('assistant', replyText);
            this.scrollToBottom();

        } catch (error) {
            console.error("[FlameAI Fetch Error]", error);
            this.removeTypingIndicator();
            
            const errorMsg = "Критический сбой протокола связи. Проверьте соединение.";
            currentChat.messages.push({ role: 'assistant', text: errorMsg });
            this.storage.updateChat(this.activeChatId, { messages: currentChat.messages });
            this.appendMessageElement('assistant', errorMsg);
            this.scrollToBottom();
        } finally {
            this.isProcessing = false;
            if(this.dom.inputBox) this.dom.inputBox.focus();
        }
    }
}

// ============================================================================
// [4] SYSTEM INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Boot up hardware accelerated background
    const bgEngine = new BackgroundEngine('bg-canvas');
    
    // 2. Initialize encrypted storage logic
    const dbManager = new StorageManager('flameai_core_db_v13');
    
    // 3. Mount UI logic
    const appUI = new FlameUIManager(dbManager);
    
    // Disable right-click in app for "software" feel
    document.addEventListener('contextmenu', event => event.preventDefault());

    console.log("=========================================");
    console.log("🔥 FlameAI Core System Booted Successfully");
    console.log("💻 Architecture: Pure Desktop Edition");
    console.log("=========================================");
});
