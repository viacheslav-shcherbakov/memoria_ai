// notification-service.js - Push Notifications для Memoria

const NotificationService = {
    SETTINGS_KEY: 'memoria-notification-settings',
    
    DEFAULT_SETTINGS: {
        enabled: false,
        eveningReminder: true,      // 19:00 - рефлексия
        morningDigest: true,        // 09:00 - что было год назад
        streakReminder: true,       // Если не писали 2 дня
        weeklyReport: true,         // Воскресенье - отчёт за неделю
        projectReminders: false,    // Напоминания по проектам (будущее)
    },

    // Инициализация
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported');
            return false;
        }

        const settings = await this.loadSettings();
        
        if (settings.enabled) {
            await this.requestPermission();
            await this.scheduleNotifications();
        }
        
        return true;
    },

    // Запрос разрешения
    async requestPermission() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
            await this.subscribeToPush();
            return true;
        }
        return false;
    },

    // Подписка на push (для будущей версии с сервером)
    async subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    'BEl62i...' // Placeholder для VAPID ключа
                )
            });
            console.log('Push subscription:', subscription);
        } catch (err) {
            console.log('Push subscription failed (ok for local):', err);
        }
    },

    // Показать локальное уведомление
    async showNotification(title, options = {}) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            ...options
        });
    },

    // Настройка напоминаний через Service Worker
    async scheduleNotifications() {
        const registration = await navigator.serviceWorker.ready;
        
        // Отправляем команду в SW для установки таймеров
        if (registration.active) {
            registration.active.postMessage({
                type: 'SCHEDULE_NOTIFICATIONS',
                settings: await this.loadSettings()
            });
        }
    },

    // ========== КОНКРЕТНЫЕ УВЕДОМЛЕНИЯ ==========

    // Вечернее напоминание
    async sendEveningReminder() {
        const prompts = [
            '🌆 Как прошёл сегодняшний день?',
            '📝 Чем запомнился день?',
            '🤔 О чём думаете перед сном?',
            '✨ Что хорошего случилось сегодня?',
            '🎯 Достигли ли сегодняшних целей?'
        ];
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        await this.showNotification(prompt, {
            body: 'Запишите мысли, пока они свежи',
            tag: 'evening-reminder',
            requireInteraction: false,
            actions: [
                { action: 'open', title: 'Написать' },
                { action: 'dismiss', title: 'Позже' }
            ]
        });
    },

    // Утренний дайджест "год назад"
    async sendOnThisDay() {
        const memories = await DB.getAll();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const pastMemories = memories.filter(m => {
            const date = new Date(m.date);
            return date.getMonth() === oneYearAgo.getMonth() && 
                   date.getDate() === oneYearAgo.getDate();
        });

        if (pastMemories.length > 0) {
            const memory = pastMemories[0];
            await this.showNotification('📅 Год назад сегодня', {
                body: memory.title,
                tag: 'on-this-day',
                data: { memoryId: memory.id }
            });
        }
    },

     // Reminder при отсутствии записей (streak)
    async sendStreakReminder() {
        const memories = await DB.getAll();
        if (memories.length === 0) return;
        
        const lastMemory = memories.sort((a, b) => b.createdAt - a.createdAt)[0];
        const daysSinceLast = Math.floor((Date.now() - lastMemory.createdAt) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLast >= 2) {
            await this.showNotification('📝 Давно не писали', {
                body: `Последняя запись ${daysSinceLast} дней назад. Как прошла неделя?`,
                tag: 'streak-reminder',
                requireInteraction: true
            });
        }
    },

    // Еженедельный отчёт
    async sendWeeklyDigest() {
        await this.showNotification('📊 Недельный отчёт готов', {
            body: 'Откройте, чтобы посмотреть прогресс по проектам',
            tag: 'weekly-digest',
            actions: [
                { action: 'open-reports', title: 'Смотреть' }
            ]
        });
    },

    // ========== УТИЛИТЫ ==========

    async loadSettings() {
        try {
            const stored = localStorage.getItem(this.SETTINGS_KEY);
            return stored ? { ...this.DEFAULT_SETTINGS, ...JSON.parse(stored) } : this.DEFAULT_SETTINGS;
        } catch {
            return this.DEFAULT_SETTINGS;
        }
    },

    async saveSettings(settings) {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        if (settings.enabled) {
            await this.scheduleNotifications();
        }
    },

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};

window.NotificationService = NotificationService;
