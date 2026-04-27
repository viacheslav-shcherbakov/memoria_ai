const CACHE_NAME = 'memoria-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/db.js',
    '/js/search.js',
    '/js/tags.js',
    '/js/ui.js',
    '/js/app.js',
    '/js/ai-service.js',
    '/js/ai-worker.js',
    '/js/project-service.js',
    '/js/ui-reports.js',
    '/js/notification-service.js',
    '/js/notification-settings.js',
    '/js/onboarding.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(names
                .filter(n => n !== CACHE_NAME)
                .map(n => caches.delete(n))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then(cached => {
            const networked = fetch(event.request)
                .then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached);
            
            return cached || networked;
        })
    );
});

// ========== PUSH NOTIFICATIONS ==========

self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Memoria', {
            body: data.body || '',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: data.badge || '/icons/badge-72x72.png',
            tag: data.tag || 'default',
            requireInteraction: data.requireInteraction || false,
            actions: data.actions || []
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // Если есть открытое окно — фокусируем
            for (let client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Иначе открываем новое
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// ========== BACKGROUND SYNC / PERIODIC SYNC ==========

// Планирование уведомлений (заглушка — в реальности используем setTimeout в main thread)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
        console.log('[SW] Notifications scheduled:', event.data.settings);
        // В реальном приложении здесь бы использовался Alarm API или push с сервера
    }
});
