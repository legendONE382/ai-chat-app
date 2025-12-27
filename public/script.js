let currentChatId = null;
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// DOM Elements
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const modelSelect = document.getElementById('model-select');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const chatList = document.getElementById('chat-list');
const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
const scrollToBottomBtn = document.querySelector('.scroll-to-bottom');
const themeToggleBtn = document.getElementById('theme-toggle');

// Authentication Elements
const authModal = document.getElementById('auth-modal');
const modalClose = document.querySelector('.close');
const tabBtns = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const confirmPassword = document.getElementById('confirm-password');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const mainApp = document.getElementById('main-app');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        verifyToken();
    } else {
        showAuthModal();
    }
    
    // Add event listeners
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('input', handleInput);
    messageInput.addEventListener('keydown', handleKeyDown);
    clearHistoryBtn.addEventListener('click', clearHistory);
    newChatBtn.addEventListener('click', createNewChat);
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    scrollToBottomBtn.addEventListener('click', scrollToBottom);
    themeToggleBtn.addEventListener('click', toggleTheme);
    logoutBtn.addEventListener('click', logout);
    
    // Authentication event listeners
    modalClose.addEventListener('click', closeAuthModal);
    window.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Load theme preference
    loadThemePreference();
});

// Authentication functions
function showAuthModal() {
    authModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    authModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    clearAuthErrors();
}

function switchTab(tab) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    clearAuthErrors();
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    if (!email || !password) {
        showAuthError('login', 'Please fill in all fields');
        return;
    }
    
    try {
        showLoading('login');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        
        closeAuthModal();
        showMainApp();
        showMessage('Login successful!', 'success');
        
    } catch (error) {
        showAuthError('login', error.message);
    } finally {
        hideLoading('login');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    clearAuthErrors();
    
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPass = confirmPassword.value;
    
    if (!email || !password || !confirmPass) {
        showAuthError('register', 'Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('register', 'Password must be at least 6 characters long');
        return;
    }
    
    if (password !== confirmPass) {
        showAuthError('register', 'Passwords do not match');
        return;
    }
    
    try {
        showLoading('register');
        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        
        closeAuthModal();
        showMainApp();
        showMessage('Registration successful!', 'success');
        
    } catch (error) {
        showAuthError('register', error.message);
    } finally {
        hideLoading('register');
    }
}

async function verifyToken() {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        const data = await response.json();
        currentUser = data;
        showMainApp();
        
    } catch (error) {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        showAuthModal();
    }
}

function showMainApp() {
    mainApp.style.display = 'flex';
    if (currentUser?.email) {
        userEmailSpan.textContent = `Welcome, ${currentUser.email}`;
    }
    loadChatHistory();
    createNewChat();
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    mainApp.style.display = 'none';
    showAuthModal();
}

function showAuthError(type, message) {
    const errorElement = document.getElementById(`${type}-error`);
    errorElement.textContent = message;
}

function clearAuthErrors() {
    loginError.textContent = '';
    registerError.textContent = '';
}

function showLoading(formType) {
    const submitBtn = document.querySelector(`#${formType}-form .auth-btn`);
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Processing...';
}

function hideLoading(formType) {
    const submitBtn = document.querySelector(`#${formType}-form .auth-btn`);
    submitBtn.disabled = false;
    submitBtn.textContent = formType === 'login' ? 'Login' : 'Register';
}

function showMessage(message, type) {
    // Create a temporary message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--error-color)'};
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// API helper function
async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
    }
    
    return response;
}

// Rest of the existing functions with authentication integration
function handleInput() {
    sendBtn.disabled = !messageInput.value.trim();
    autoResizeTextarea();
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
            sendMessage();
        }
    }
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    const scrollHeight = messageInput.scrollHeight;
    messageInput.style.height = Math.min(scrollHeight, 200) + 'px';
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
    toggleSidebarBtn.classList.toggle('collapsed');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    themeToggleBtn.textContent = newTheme === 'light' ? '🌙' : '☀️';
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';
}

function scrollToBottom() {
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}

function checkScrollPosition() {
    const threshold = 100;
    if (chatBox.scrollTop + chatBox.clientHeight < chatBox.scrollHeight - threshold) {
        scrollToBottomBtn.classList.add('visible');
    } else {
        scrollToBottomBtn.classList.remove('visible');
    }
}

chatBox.addEventListener('scroll', checkScrollPosition);

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    const preferredModel = modelSelect.value;
    addMessage(message, 'user');
    saveMessage(message, 'user');
    messageInput.value = '';
    sendBtn.disabled = true;
    autoResizeTextarea();

    // Add typing indicator
    const typingIndicator = addTypingIndicator();

    try {
        const response = await fetchWithAuth('/api/chat/chat', {
            method: 'POST',
            body: JSON.stringify({ message, preferredModel, chatId: currentChatId })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
        
        if (data.error) {
            addMessage('Error: ' + data.error, 'ai');
            saveMessage('Error: ' + data.error, 'ai');
        } else {
            const switchMsg = data.switched ? ` (Switched from ${data.triedModels.slice(0, -1).join(', ')})` : '';
            addMessage(data.reply, 'ai', data.model + switchMsg);
            saveMessage(data.reply, 'ai', data.model + switchMsg);
        }
    } catch (err) {
        // Remove typing indicator
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
        
        addMessage('Network error: ' + err.message, 'ai');
        saveMessage('Network error: ' + err.message, 'ai');
    } finally {
        sendBtn.disabled = false;
    }
}

function addMessage(text, sender, model = null) {
    // Remove empty chat placeholder if it exists
    const placeholder = document.querySelector('.empty-chat-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = `message-avatar ${sender}`;
    avatar.textContent = sender === 'user' ? 'U' : 'AI';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = formatMessage(text);
    
    messageContainer.appendChild(avatar);
    messageContainer.appendChild(content);
    
    if (sender === 'ai' && model) {
        const modelInfo = document.createElement('div');
        modelInfo.className = 'model-info';
        modelInfo.textContent = `Powered by ${model}`;
        content.appendChild(modelInfo);
    }
    
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return messageContainer;
}

function addTypingIndicator() {
    // Remove any existing typing indicators
    const existingIndicator = document.querySelector('.typing-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Remove empty chat placeholder if it exists
    const placeholder = document.querySelector('.empty-chat-placeholder');
    if (placeholder) {
        placeholder.remove();
    }
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container ai';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar ai';
    avatar.textContent = 'AI';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        typingIndicator.appendChild(dot);
    }
    
    content.appendChild(typingIndicator);
    messageContainer.appendChild(avatar);
    messageContainer.appendChild(content);
    
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return messageContainer;
}

function formatMessage(text) {
    // Convert markdown-like formatting to HTML
    let formatted = text;
    
    // Headers
    formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Unordered lists
    formatted = formatted.replace(/^\- (.*$)/gim, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Ordered lists
    formatted = formatted.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>');
    
    // Blockquotes
    formatted = formatted.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // Links
    formatted = formatted.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Line breaks to paragraphs
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = '<p>' + formatted + '</p>';
    
    return formatted;
}

async function saveMessage(text, sender, model = null) {
    try {
        const response = await fetchWithAuth('/api/chat/conversations', {
            method: 'POST',
            body: JSON.stringify({
                chatId: currentChatId,
                message: { role: sender, content: text },
                model: model
            })
        });
        
        if (!response.ok) {
            console.error('Failed to save message to database');
        }
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

async function loadChatHistory() {
    try {
        const response = await fetchWithAuth('/api/chat/conversations');
        const conversations = await response.json();
        
        // Clear current chat list
        chatList.innerHTML = '';
        
        // Add conversations to list
        conversations.forEach(conv => {
            addChatToList(conv.chatId, conv);
        });
        
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

function createNewChat() {
    currentChatId = Date.now().toString();
    chatBox.innerHTML = `
        <div class="empty-chat-placeholder">
            <h2>Welcome to AI Chat App</h2>
            <p>Start a conversation by typing a message below. Your chat history will appear here.</p>
        </div>
    `;
    
    // Save new chat to database
    saveMessage('', 'system', 'New chat created');
    
    updateChatList();
    messageInput.focus();
}

function loadChat(chatId) {
    currentChatId = chatId;
    
    // Load conversation from database
    fetchWithAuth(`/api/chat/conversations/${chatId}`)
        .then(response => response.json())
        .then(conversation => {
            chatBox.innerHTML = '';
            conversation.messages.forEach(msg => addMessage(msg.content, msg.role));
            updateChatList();
            messageInput.focus();
        })
        .catch(error => {
            console.error('Error loading chat:', error);
            createNewChat();
        });
}

function addChatToList(chatId, chatData) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    if (chatId === currentChatId) chatItem.classList.add('active');
    chatItem.onclick = () => loadChat(chatId);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = chatData.title || 'New Chat';

    const preview = document.createElement('div');
    preview.className = 'preview';
    const lastMessage = chatData.messages?.[chatData.messages.length - 1];
    preview.textContent = lastMessage ? lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '...' : '') : 'No messages';

    chatItem.appendChild(title);
    chatItem.appendChild(preview);
    chatList.appendChild(chatItem);
}

function updateChatList() {
    // This will be updated when we load from database
    // For now, keep the existing functionality
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all chat history?')) {
        // Clear from database
        fetchWithAuth('/api/chat/conversations', {
            method: 'DELETE'
        })
        .then(() => {
            localStorage.removeItem('chats');
            chatList.innerHTML = '';
            createNewChat();
        })
        .catch(error => {
            console.error('Error clearing history:', error);
        });
    }
}

// Auto-focus input on load
setTimeout(() => {
    if (authToken) {
        messageInput.focus();
    }
}, 100);