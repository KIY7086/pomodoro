// service-worker.js
const CACHE_NAME = 'pomodoro-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/timer-worker.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/alpinejs/3.13.3/cdn.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@200..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap'
];

// 安装Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// 激活Service Worker并清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// 处理资源请求，实现离线访问
self.addEventListener('fetch', (event) => {
    // 忽略非GET请求和浏览器扩展请求
    if (event.request.method !== 'GET' || 
        !event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 如果有缓存则返回缓存
                if (cachedResponse) {
                    // 后台更新缓存
                    fetch(event.request)
                        .then(response => {
                            if (response.ok) {
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(event.request, response));
                            }
                        });
                    return cachedResponse;
                }

                // 如果没有缓存，尝试从网络获取
                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // 缓存新的响应
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // 如果是HTML请求，返回离线页面
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
    const action = event.action;
    const notification = event.notification;
    
    notification.close();

    // 聚焦或打开窗口
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // 如果已有窗口则聚焦
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.focus();
                        // 发送通知操作到客户端
                        client.postMessage({
                            type: 'NOTIFICATION_ACTION',
                            action: action
                        });
                        return;
                    }
                }
                // 如果没有窗口则打开新窗口
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// 处理推送通知
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        vibrate: [200, 100, 200],
        tag: 'pomodoro-notification',
        actions: [
            { action: 'start', title: '开始新的专注' },
            { action: 'dismiss', title: '忽略' }
        ],
        data: data
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 处理后台同步
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-pomodoro-data') {
        event.waitUntil(syncPomodoroData());
    }
});

// 同步数据到服务器
async function syncPomodoroData() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const data = await cache.match('/sync-data');
        if (data) {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: await data.text()
            });
            if (response.ok) {
                await cache.delete('/sync-data');
            }
        }
    } catch (error) {
        console.error('Error syncing data:', error);
    }
}

// 定期更新缓存
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-cache') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => {
                    return Promise.all(
                        ASSETS_TO_CACHE.map(url => 
                            fetch(url)
                                .then(response => {
                                    if (response.ok) {
                                        return cache.put(url, response);
                                    }
                                })
                        )
                    );
                })
        );
    }
});

// 错误处理
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

// 处理未捕获的Promise错误
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});