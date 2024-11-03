// service-worker.js
const CACHE_NAME = 'pomodoro-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/alpinejs/3.13.3/cdn.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 定时器状态管理
let timers = new Map();

// 安装Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活Service Worker
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

// 处理请求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// 处理消息
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'START_TIMER':
      startTimer(payload);
      break;
    case 'PAUSE_TIMER':
      pauseTimer(payload.timerId);
      break;
    case 'RESET_TIMER':
      resetTimer(payload.timerId);
      break;
    case 'SYNC_TIME':
      syncTime(payload);
      break;
  }
});

// 启动定时器
function startTimer({ timerId, duration, initialTime, mode }) {
  if (timers.has(timerId)) {
    clearInterval(timers.get(timerId).intervalId);
  }

  const endTime = Date.now() + initialTime * 1000;
  const timer = {
    endTime,
    duration,
    mode,
    intervalId: setInterval(() => {
      const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      
      // 广播时间更新
      broadcastTime(timerId, timeLeft);
      
      if (timeLeft === 0) {
        clearInterval(timer.intervalId);
        timers.delete(timerId);
        timerComplete(mode);
      }
    }, 1000)
  };
  
  timers.set(timerId, timer);
}

// 暂停定时器
function pauseTimer(timerId) {
  const timer = timers.get(timerId);
  if (timer) {
    clearInterval(timer.intervalId);
    timers.delete(timerId);
  }
}

// 重置定时器
function resetTimer(timerId) {
  const timer = timers.get(timerId);
  if (timer) {
    clearInterval(timer.intervalId);
    timers.delete(timerId);
  }
}

// 同步时间
function syncTime({ timerId, timeLeft }) {
  const timer = timers.get(timerId);
  if (timer) {
    timer.endTime = Date.now() + timeLeft * 1000;
  }
}

// 广播时间更新
function broadcastTime(timerId, timeLeft) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'TIME_UPDATE',
        payload: { timerId, timeLeft }
      });
    });
  });
}

// 定时器完成处理
async function timerComplete(mode) {
  // 发送系统通知
  if (mode === 'pomodoro') {
    await self.registration.showNotification('专注时间结束！', {
      body: '该休息一下了',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'pomodoro-notification',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'start-break', title: '开始休息' },
        { action: 'continue-work', title: '继续工作' }
      ]
    });
  } else {
    await self.registration.showNotification('休息时间结束！', {
      body: '准备开始新的专注',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'pomodoro-notification',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'start-work', title: '开始专注' },
        { action: 'continue-break', title: '继续休息' }
      ]
    });
  }

  // 音频通知
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }

  // 广播完成消息
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'TIMER_COMPLETE',
        payload: { mode }
      });
    });
  });
}

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const rootUrl = self.registration.scope;
  
  event.notification.close();

  const actionMap = {
    'start-break': () => broadcastAction('START_BREAK'),
    'continue-work': () => broadcastAction('CONTINUE_WORK'),
    'start-work': () => broadcastAction('START_WORK'),
    'continue-break': () => broadcastAction('CONTINUE_BREAK')
  };

  if (actionMap[action]) {
    actionMap[action]();
  }

  // 聚焦或打开窗口
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === rootUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(rootUrl);
      }
    })
  );
});

// 广播操作
function broadcastAction(action) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_ACTION',
        payload: { action }
      });
    });
  });
}