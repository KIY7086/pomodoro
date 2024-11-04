// timer-worker.js

// 计时器状态
let timerId = null;
let startTime = null;
let duration = null;
let pausedTimeLeft = null;
let lastUpdateTime = null;
let isTransitioning = false;

// 获取高精度时间戳
function getCurrentTime() {
    return performance.now();
}

// 计时器状态持久化
function saveTimerState() {
    const timerState = {
        timeLeft: pausedTimeLeft || calculateTimeLeft(),
        startTime,
        duration,
        isRunning: !!timerId,
        isTransitioning
    };
    
    postMessage({
        type: 'SAVE_STATE',
        payload: timerState
    });
}

// 计算剩余时间
function calculateTimeLeft() {
    if (!startTime || !duration) return 0;
    
    const now = getCurrentTime();
    let elapsed = now - startTime;
    
    // 补偿时间偏差
    if (lastUpdateTime) {
        const timeDrift = now - lastUpdateTime;
        if (timeDrift > 1000) { // 如果时间偏差大于1秒
            startTime += (timeDrift - 1000);
            elapsed = now - startTime;
        }
    }
    
    lastUpdateTime = now;
    return Math.max(0, Math.ceil((duration - elapsed) / 1000));
}

// 开始计时
function startTimer(timeLeft) {
    if (timerId || isTransitioning) return;

    startTime = getCurrentTime();
    duration = timeLeft * 1000; // 转换为毫秒
    pausedTimeLeft = null;
    lastUpdateTime = startTime;
    
    function tick() {
        if (isTransitioning) {
            clearInterval(timerId);
            timerId = null;
            return;
        }

        const remaining = calculateTimeLeft();
        
        // 发送剩余时间给主线程
        postMessage({
            type: 'TIME_UPDATE',
            payload: { 
                timeLeft: remaining,
                timestamp: getCurrentTime()
            }
        });

        // 保存状态
        saveTimerState();

        // 检查是否结束
        if (remaining <= 0) {
            clearInterval(timerId);
            timerId = null;
            startTime = null;
            duration = null;
            lastUpdateTime = null;
            
            // 设置过渡状态
            isTransitioning = true;
            postMessage({ type: 'TIMER_COMPLETE' });
            
            // 3秒后重置过渡状态
            setTimeout(() => {
                isTransitioning = false;
                saveTimerState();
            }, 3000);
            return;
        }
    }

    // 使用setInterval实现更精确的计时，间隔100ms检查一次
    timerId = setInterval(tick, 100);
    tick(); // 立即执行一次
}

// 暂停计时
function pauseTimer() {
    if (!timerId || isTransitioning) return;
    
    clearInterval(timerId);
    const remaining = calculateTimeLeft();
    pausedTimeLeft = remaining;
    
    timerId = null;
    startTime = null;
    duration = null;
    lastUpdateTime = null;
    
    saveTimerState();
    
    postMessage({
        type: 'TIME_UPDATE',
        payload: { 
            timeLeft: remaining,
            timestamp: getCurrentTime()
        }
    });
}

// 重置计时器
function resetTimer(initialDuration) {
    if (isTransitioning) return;
    
    if (timerId) {
        clearInterval(timerId);
    }
    
    timerId = null;
    startTime = null;
    duration = null;
    lastUpdateTime = null;
    pausedTimeLeft = initialDuration;
    
    saveTimerState();
    
    postMessage({
        type: 'TIME_UPDATE',
        payload: { 
            timeLeft: initialDuration,
            timestamp: getCurrentTime()
        }
    });
}

// 同步时间
function syncTime(timeLeft) {
    if (isTransitioning) return;
    
    if (timerId) {
        clearInterval(timerId);
        startTime = getCurrentTime();
        duration = timeLeft * 1000;
        lastUpdateTime = startTime;
        startTimer(timeLeft);
    } else {
        pausedTimeLeft = timeLeft;
        postMessage({
            type: 'TIME_UPDATE',
            payload: { 
                timeLeft,
                timestamp: getCurrentTime()
            }
        });
    }
}

// 恢复计时器状态
function restoreTimer(state) {
    if (!state) return;
    
    isTransitioning = state.isTransitioning || false;
    
    if (state.isRunning && state.timeLeft > 0 && !isTransitioning) {
        startTimer(state.timeLeft);
    } else if (state.timeLeft) {
        pausedTimeLeft = state.timeLeft;
        postMessage({
            type: 'TIME_UPDATE',
            payload: { 
                timeLeft: state.timeLeft,
                timestamp: getCurrentTime()
            }
        });
    }
}

// 切换过渡状态
function setTransitioning(value) {
    isTransitioning = value;
    saveTimerState();
}

// 监听主线程消息
self.onmessage = function(e) {
    const { type, payload } = e.data;
    
    switch (type) {
        case 'START':
            startTimer(payload.timeLeft);
            break;
        case 'PAUSE':
            pauseTimer();
            break;
        case 'RESET':
            resetTimer(payload.duration);
            break;
        case 'SYNC_TIME':
            syncTime(payload.timeLeft);
            break;
        case 'RESTORE':
            restoreTimer(payload.state);
            break;
        case 'SET_TRANSITIONING':
            setTransitioning(payload.value);
            break;
    }
};

// 定期检查并同步状态（每秒）
setInterval(() => {
    if (timerId || pausedTimeLeft) {
        saveTimerState();
    }
}, 1000);

// 错误处理
self.onerror = function(error) {
    console.error('Worker Error:', error);
    postMessage({
        type: 'ERROR',
        payload: {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
            timestamp: getCurrentTime()
        }
    });
};

// 未捕获的 Promise 错误处理
self.onunhandledrejection = function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    postMessage({
        type: 'ERROR',
        payload: {
            message: 'Unhandled Promise Rejection: ' + event.reason,
            timestamp: getCurrentTime()
        }
    });
};