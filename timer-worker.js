// timer-worker.js

// 计时器状态
let timerId = null;
let startTime = null;
let duration = null;
let pausedTimeLeft = null;

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
        isRunning: !!timerId
    };
    
    postMessage({
        type: 'SAVE_STATE',
        payload: timerState
    });
}

// 计算剩余时间
function calculateTimeLeft() {
    if (!startTime || !duration) return 0;
    const elapsed = getCurrentTime() - startTime;
    return Math.max(0, Math.ceil((duration - elapsed) / 1000));
}

// 开始计时
function startTimer(timeLeft) {
    if (timerId) return;

    startTime = getCurrentTime();
    duration = timeLeft * 1000; // 转换为毫秒
    pausedTimeLeft = null;
    
    function tick() {
        const remaining = calculateTimeLeft();
        
        // 发送剩余时间给主线程
        postMessage({
            type: 'TIME_UPDATE',
            payload: { timeLeft: remaining }
        });

        // 保存状态
        saveTimerState();

        // 检查是否结束
        if (remaining <= 0) {
            clearInterval(timerId);
            timerId = null;
            startTime = null;
            duration = null;
            postMessage({ type: 'TIMER_COMPLETE' });
            return;
        }
    }

    // 使用setInterval实现更精确的计时，间隔100ms检查一次
    timerId = setInterval(tick, 100);
    tick(); // 立即执行一次
}

// 暂停计时
function pauseTimer() {
    if (!timerId) return;
    
    clearInterval(timerId);
    const remaining = calculateTimeLeft();
    pausedTimeLeft = remaining;
    
    timerId = null;
    startTime = null;
    duration = null;
    
    saveTimerState();
    
    postMessage({
        type: 'TIME_UPDATE',
        payload: { timeLeft: remaining }
    });
}

// 重置计时器
function resetTimer(initialDuration) {
    if (timerId) {
        clearInterval(timerId);
    }
    
    timerId = null;
    startTime = null;
    duration = null;
    pausedTimeLeft = initialDuration;
    
    saveTimerState();
    
    postMessage({
        type: 'TIME_UPDATE',
        payload: { timeLeft: initialDuration }
    });
}

// 同步时间
function syncTime(timeLeft) {
    if (timerId) {
        clearInterval(timerId);
        startTime = getCurrentTime();
        duration = timeLeft * 1000;
        startTimer(timeLeft);
    } else {
        pausedTimeLeft = timeLeft;
        postMessage({
            type: 'TIME_UPDATE',
            payload: { timeLeft }
        });
    }
}

// 恢复计时器状态
function restoreTimer(state) {
    if (!state) return;
    
    if (state.isRunning && state.timeLeft > 0) {
        startTimer(state.timeLeft);
    } else if (state.timeLeft) {
        pausedTimeLeft = state.timeLeft;
        postMessage({
            type: 'TIME_UPDATE',
            payload: { timeLeft: state.timeLeft }
        });
    }
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
        case 'SYNC':
            syncTime(payload.timeLeft);
            break;
        case 'RESTORE':
            restoreTimer(payload.state);
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
    postMessage({
        type: 'ERROR',
        payload: {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno
        }
    });
};