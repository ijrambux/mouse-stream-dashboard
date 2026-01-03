// 🎯 تطبيق Dashboard مع API متكاملة
class StreamDashboard {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.channels = [];
        this.users = [];
        this.stats = {};
        this.currentChannel = null;
        this.hls = null;
        this.notifications = [];
        this.settings = {};
        this.currentSection = 'dashboard';
        this.token = localStorage.getItem('auth_token');
        this.socket = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 بدء تهيئة Dashboard مع API...');
        
        // الاتصال بالـ WebSocket
        this.connectWebSocket();
        
        // التحقق من المصادقة
        if (!await this.checkAuth()) {
            this.showLoginModal();
            return;
        }
        
        // تحميل البيانات
        await this.loadData();
        
        // تهيئة النظام
        this.initSystem();
        
        // بدء تحديثات النظام
        this.startSystemUpdates();
        
        // إظهار Dashboard
        this.showApp();
    }
    
    async checkAuth() {
        if (!this.token) return false;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: this.token })
            });
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.socket = io(wsUrl);
        
        this.socket.on('connect', () => {
            console.log('🔌 Connected to WebSocket server');
            
            // اشترك في تحديثات الإحصائيات
            this.socket.emit('subscribe:stats');
            this.socket.emit('subscribe:channels');
        });
        
        this.socket.on('stats:update', (data) => {
            this.updateLiveStats(data);
        });
        
        this.socket.on('channel:created', (channel) => {
            this.addNotification('قناة جديدة', `تمت إضافة قناة ${channel.name}`);
            this.loadChannels();
        });
        
        this.socket.on('channel:updated', (channel) => {
            this.addNotification('تحديث قناة', `تم تحديث قناة ${channel.name}`);
            this.loadChannels();
        });
        
        this.socket.on('channel:deleted', (channel) => {
            this.addNotification('حذف قناة', `تم حذف قناة ${channel.name}`);
            this.loadChannels();
        });
        
        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from WebSocket');
        });
    }
    
    updateLiveStats(data) {
        // تحديث الإحصائيات الحية
        if (document.getElementById('live-active-users')) {
            document.getElementById('live-active-users').textContent = data.activeUsers;
        }
        if (document.getElementById('live-active-streams')) {
            document.getElementById('live-active-streams').textContent = data.activeStreams;
        }
        if (document.getElementById('live-bandwidth')) {
            document.getElementById('live-bandwidth').textContent = data.bandwidth;
        }
    }
    
    async loadData() {
        try {
            const [channelsResponse, usersResponse, statsResponse] = await Promise.all([
                this.apiRequest('/channels'),
                this.apiRequest('/users'),
                this.apiRequest('/analytics')
            ]);
            
            this.channels = channelsResponse.data;
            this.users = usersResponse.data;
            this.stats = statsResponse.data;
            
            console.log('📊 البيانات تم تحميلها:', {
                channels: this.channels.length,
                users: this.users.length
            });
            
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            // استخدام بيانات تجريبية إذا فشل الاتصال
            this.loadMockData();
        }
    }
    
    async apiRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : '',
                'Content-Type': 'application/json'
            }
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.handleUnauthorized();
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }
    
    handleUnauthorized() {
        localStorage.removeItem('auth_token');
        this.token = null;
        this.showLoginModal();
    }
    
    // ... باقي الدوال تبقى كما هي مع تحديثات API
    
    async saveNewChannel() {
        const channelData = {
            name: document.getElementById('channel-name-input').value,
            url: document.getElementById('channel-url-input').value,
            type: document.getElementById('channel-type-input').value,
            quality: document.getElementById('channel-quality-input').value,
            country: document.getElementById('channel-country-input').value,
            language: document.getElementById('channel-language-input').value,
            description: document.getElementById('channel-description-input').value,
            status: document.getElementById('channel-active-input').checked ? 'active' : 'inactive'
        };
        
        try {
            const response = await this.apiRequest('/channels', {
                method: 'POST',
                body: JSON.stringify(channelData)
            });
            
            if (response.success) {
                this.showNotificationModal("نجاح", `تمت إضافة القناة "${channelData.name}" بنجاح`);
                this.closeModal('add-channel-modal');
                await this.loadChannels();
            }
        } catch (error) {
            this.showNotificationModal("خطأ", "فشل في إضافة القناة");
        }
    }
    
    async testChannelStream(channelId) {
        try {
            const response = await this.apiRequest(`/channels/${channelId}/test`, {
                method: 'POST'
            });
            
            if (response.success) {
                const result = response.data;
                const message = result.isWorking 
                    ? `✅ القناة تعمل بشكل صحيح\n⏱️ وقت الاستجابة: ${result.responseTime}`
                    : `❌ القناة لا تعمل\n🔗 الرابط: ${result.url}`;
                
                this.showNotificationModal("نتيجة الاختبار", message);
            }
        } catch (error) {
            this.showNotificationModal("خطأ", "فشل في اختبار القناة");
        }
    }
    
    // ... باقي الدوال المحدثة
}

// إنشاء التطبيق
let dashboard;
window.addEventListener('DOMContentLoaded', () => {
    dashboard = new StreamDashboard();
    window.dashboard = dashboard;
});
