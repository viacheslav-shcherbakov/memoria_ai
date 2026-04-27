// notification-settings.js - UI для настроек уведомлений

const NotificationSettings = {
    renderSettings() {
        const container = document.createElement('div');
        container.className = 'bg-card rounded-xl p-4 mb-4';
        container.id = 'notification-settings';
        
        container.innerHTML = `
            <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                🔔 Уведомления
            </h3>
            
            <!-- Main Toggle -->
            <div class="flex items-center justify-between mb-4 pb-4 border-b border-stone-700">
                <div>
                    <p class="text-sm font-medium text-white">Включить уведомления</p>
                    <p class="text-xs text-stone-500">Напоминания и дайджесты</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="notif-main-toggle" class="sr-only peer">
                    <div class="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>
            
            <!-- Individual Options -->
            <div id="notif-options" class="space-y-3 opacity-50 pointer-events-none">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🌆</span>
                        <div>
                            <p class="text-sm text-stone-300">Вечерняя рефлексия</p>
                            <p class="text-xs text-stone-500">19:00 — запишите день</p>
                        </div>
                    </div>
                    <input type="checkbox" id="notif-evening" class="w-4 h-4 rounded border-stone-600 text-primary focus:ring-primary bg-stone-700" checked>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">📅</span>
                        <div>
                            <p class="text-sm text-stone-300">"Год назад"</p>
                            <p class="text-xs text-stone-500">09:00 — утренний дайджест</p>
                        </div>
                    </div>
                    <input type="checkbox" id="notif-morning" class="w-4 h-4 rounded border-stone-600 text-primary focus:ring-primary bg-stone-700" checked>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🔥</span>
                        <div>
                            <p class="text-sm text-stone-300">Напоминание о записи</p>
                            <p class="text-xs text-stone-500">Если не писали 2+ дня</p>
                        </div>
                    </div>
                    <input type="checkbox" id="notif-streak" class="w-4 h-4 rounded border-stone-600 text-primary focus:ring-primary bg-stone-700" checked>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">📊</span>
                        <div>
                            <p class="text-sm text-stone-300">Недельный отчёт</p>
                            <p class="text-xs text-stone-500">Воскресенье</p>
                        </div>
                    </div>
                    <input type="checkbox" id="notif-weekly" class="w-4 h-4 rounded border-stone-600 text-primary focus:ring-primary bg-stone-700" checked>
                </div>
            </div>
            
            <!-- Test Button -->
            <div class="mt-4 pt-4 border-t border-stone-700">
                <button id="notif-test-btn" class="text-sm text-primary hover:text-secondary transition">
                    🧪 Отправить тестовое уведомление
                </button>
            </div>
        `;
        
        // Event Listeners
        setTimeout(() => this.attachListeners(), 0);
        
        return container;
    },

    async attachListeners() {
        const mainToggle = document.getElementById('notif-main-toggle');
        const options = document.getElementById('notif-options');
        const testBtn = document.getElementById('notif-test-btn');
        
        if (!mainToggle) return;
        
        // Load current settings
        const settings = await NotificationService.loadSettings();
        mainToggle.checked = settings.enabled;
        
        if (settings.enabled) {
            options.classList.remove('opacity-50', 'pointer-events-none');
        }
        
        // Set individual toggles
        document.getElementById('notif-evening').checked = settings.eveningReminder;
        document.getElementById('notif-morning').checked = settings.morningDigest;
        document.getElementById('notif-streak').checked = settings.streakReminder;
        document.getElementById('notif-weekly').checked = settings.weeklyReport;
        
        // Main toggle handler
        mainToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            
            if (enabled) {
                const granted = await NotificationService.requestPermission();
                if (granted) {
                    options.classList.remove('opacity-50', 'pointer-events-none');
                    await this.saveCurrentSettings();
                    UI.showNotification('✅ Уведомления включены');
                } else {
                    mainToggle.checked = false;
                    UI.showNotification('⚠️ Необходимо разрешить уведомления в браузере');
                }
            } else {
                options.classList.add('opacity-50', 'pointer-events-none');
                await this.saveCurrentSettings();
            }
        });
        
        // Individual option handlers
        ['evening', 'morning', 'streak', 'weekly'].forEach(type => {
            const checkbox = document.getElementById(`notif-${type}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.saveCurrentSettings());
            }
        });
        
        // Test button
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                NotificationService.showNotification('🧪 Тестовое уведомление', {
                    body: 'Если вы это видите — всё работает!',
                    requireInteraction: true
                });
            });
        }
    },

    async saveCurrentSettings() {
        const settings = {
            enabled: document.getElementById('notif-main-toggle')?.checked || false,
            eveningReminder: document.getElementById('notif-evening')?.checked || false,
            morningDigest: document.getElementById('notif-morning')?.checked || false,
            streakReminder: document.getElementById('notif-streak')?.checked || false,
            weeklyReport: document.getElementById('notif-weekly')?.checked || false
        };
        
        await NotificationService.saveSettings(settings);
    }
};

window.NotificationSettings = NotificationSettings;
