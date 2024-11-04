document.addEventListener('alpine:init', () => {
        Alpine.data('pomodoroTimer', () => ({
            // Web Worker 实例
            timerWorker: null,
            
            // 基础状态
            size: 280,
            times: {
                pomodoro: 25 * 60,
                shortBreak: 5 * 60,
                longBreak: 15 * 60
            },
            modeLabels: {
                pomodoro: '专注',
                shortBreak: '短休息',
                longBreak: '长休息'
            },
            currentMode: 'pomodoro',
            timeLeft: 25 * 60,
            isRunning: false,
            circumference: 2 * Math.PI * 130,
            wakeLock: null,
    
            // 状态和面板控制  
            showSettings: false,
            showStatsPanel: false,
            
            // 统计数据
            completedSessions: 0,
            todaySessions: 0,
            totalFocusTime: 0,
            currentStreak: 0,
            lastFocusDate: null,
            
            // 待办事项
            showTodoPage: false,
            todos: [],
            editingTodo: null,
            touchTimer: null,
            touchStartTime: null,
            
            // 设置选项
            settings: {
                theme: 'fifth',
                soundEnabled: true,
                notificationsEnabled: false,
                autoStartBreak: true,
                autoStartPomodoro: false,
                longBreakInterval: 4
            },
    
            // Toast系统
            toast: {
                message: '',
                type: 'success', 
                icon: 'fas fa-check',
                show: false,
                duration: 3000,
                queue: [],
                processing: false
            },
    
            // 初始化
            init() {
                this.loadSettings();
                this.loadTodos();
                this.initWorker();
                this.setupCircle();
                this.handleResize();
                this.checkAndUpdateStreak();
                this.applyTheme(this.settings.theme);
                
                // 事件监听器设置
                window.addEventListener('resize', () => this.handleResize());
                document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
                document.addEventListener('keydown', (e) => this.handleKeyPress(e));
                window.addEventListener('beforeunload', () => this.cleanup());
    
                // 检查通知权限
                if (this.settings.notificationsEnabled) {
                    if (Notification.permission !== 'granted') {
                        this.settings.notificationsEnabled = false;
                        this.saveSettings();
                    }
                }
            },
    
            // Web Worker 初始化
            initWorker() {
                try {
                    this.timerWorker = new Worker('/timer-worker.js');
                    
                    this.timerWorker.onmessage = (e) => {
                        const { type, payload } = e.data;
                        
                        switch (type) {
                            case 'TIME_UPDATE':
                                this.timeLeft = payload.timeLeft;
                                break;
                            case 'TIMER_COMPLETE':
                                this.handleTimerComplete();
                                break;
                            case 'SAVE_STATE':
                                this.saveTimerState(payload);
                                break;
                        }
                    };
    
                    // 恢复保存的状态
                    const savedState = this.loadTimerState();
                    if (savedState) {
                        this.timerWorker.postMessage({
                            type: 'RESTORE',
                            payload: { state: savedState }
                        });
                        
                        this.isRunning = savedState.isRunning;
                        this.currentMode = savedState.mode || 'pomodoro';
                    }
                } catch (error) {
                    console.error('Failed to initialize Web Worker:', error);
                    this.showToast('计时器初始化失败', 'error', 'fa-exclamation-circle');
                }
            },
    
            // 计时器状态持久化
            saveTimerState(state) {
                const timerState = {
                    ...state,
                    mode: this.currentMode,
                    timestamp: Date.now()
                };
                try {
                    localStorage.setItem('timerState', JSON.stringify(timerState));
                } catch (error) {
                    console.error('Error saving timer state:', error);
                }
            },
    
            loadTimerState() {
                try {
                    const saved = localStorage.getItem('timerState');
                    if (!saved) return null;
    
                    const state = JSON.parse(saved);
                    const elapsed = Date.now() - state.timestamp;
                    
                    // 如果离开时间超过1分钟，不恢复运行状态
                    if (elapsed > 60000) {
                        return null;
                    }
                    
                    return state;
                } catch (error) {
                    console.error('Error loading timer state:', error);
                    return null;
                }
            },
    
            // 圆形进度条设置
            setupCircle() {
                const circle = document.querySelector('.progress-ring__circle');
                if (circle) {
                    circle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
                }
            },
    
            // 响应式处理
            handleResize() {
                const vw = Math.min(window.innerWidth * 0.8, 280);
                this.size = Math.floor(vw);
            },
    
            // 计算属性
            get progressStyle() {
                const progress = this.timeLeft / this.times[this.currentMode];
                const offset = this.circumference * (1 - progress);
                return {
                    strokeDasharray: `${this.circumference} ${this.circumference}`,
                    strokeDashoffset: offset
                };
            },
            
            get activeTodos() {
                return this.todos.filter(todo => !todo.completed);
            },
        
            // 计算属性：已完成的待办
            get completedTodos() {
                return this.todos.filter(todo => todo.completed);
            },
        
            // 待办事项相关方法
            loadTodos() {
                try {
                    const savedTodos = localStorage.getItem('todos');
                    this.todos = savedTodos ? JSON.parse(savedTodos) : [];
                } catch (error) {
                    console.error('Error loading todos:', error);
                    this.showToast('待办事项加载失败', 'error', 'fa-exclamation-circle');
                }
            },
        
            saveTodos() {
                try {
                    localStorage.setItem('todos', JSON.stringify(this.todos));
                } catch (error) {
                    console.error('Error saving todos:', error);
                    this.showToast('待办事项保存失败', 'error', 'fa-exclamation-circle');
                }
            },
        
            addTodo() {
                const text = prompt('添加新的待办事项:');
                if (text && text.trim()) {
                    this.todos.unshift({
                        id: Date.now(),
                        text: text.trim(),
                        completed: false,
                        createdAt: new Date().toISOString()
                    });
                    this.saveTodos();
                    this.showToast('待办事项已添加', 'success', 'fa-check');
                }
            },
        
            toggleTodo(todo) {
                todo.completed = !todo.completed;
                this.saveTodos();
            },
        
            // 长按开始编辑
            handleTodoTouchStart(event, todo) {
                // 防止触发父元素的点击事件
                event.preventDefault();
                
                this.touchStartTime = Date.now();
                this.touchTimer = setTimeout(() => {
                    this.editingTodo = {
                        id: todo.id,
                        text: todo.text
                    };
                    // 等待DOM更新后聚焦输入框
                    this.$nextTick(() => {
                        const input = event.target.querySelector('.todo-edit-input');
                        if (input) {
                            input.focus();
                        }
                    });
                }, 500); // 500ms长按触发编辑
            },
        
            handleTodoTouchEnd() {
                if (this.touchTimer) {
                    clearTimeout(this.touchTimer);
                    this.touchTimer = null;
                }
            },
        
            // 保存编辑
            saveTodoEdit() {
                if (!this.editingTodo) return;
        
                const todo = this.todos.find(t => t.id === this.editingTodo.id);
                if (todo && this.editingTodo.text.trim()) {
                    todo.text = this.editingTodo.text.trim();
                    this.saveTodos();
                    this.showToast('待办事项已更新', 'success', 'fa-check');
                }
                this.editingTodo = null;
            },
        
            // 取消编辑
            cancelTodoEdit() {
                this.editingTodo = null;
            },
        
            // 确认删除
            confirmDeleteTodo(todo) {
                if (confirm('确定要删除这个待办事项吗？')) {
                    this.todos = this.todos.filter(t => t.id !== todo.id);
                    this.saveTodos();
                    this.showToast('待办事项已删除', 'info', 'fa-trash');
                }
            },
        
            // 清除已完成
            clearCompleted() {
                if (confirm('确定要清除所有已完成的待办事项吗？')) {
                    this.todos = this.todos.filter(todo => !todo.completed);
                    this.saveTodos();
                    this.showToast('已清除完成项目', 'info', 'fa-check-double');
                }
            },
    
            get formatTime() {
                const minutes = Math.floor(this.timeLeft / 60);
                const seconds = Math.floor(this.timeLeft % 60);
                return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            },
    
            get timerLabel() {
                return this.modeLabels[this.currentMode];
            },
    
            get canReset() {
                return this.timeLeft !== this.times[this.currentMode];
            },
    
            // 计时器控制
            start() {
                if (!this.isRunning) {
                    this.isRunning = true;
                    this.timerWorker.postMessage({
                        type: 'START',
                        payload: { timeLeft: this.timeLeft }
                    });
                    this.preventSleep();
                }
            },
    
            pause() {
                if (this.isRunning) {
                    this.isRunning = false;
                    this.timerWorker.postMessage({ type: 'PAUSE' });
                    this.allowSleep();
                }
            },
    
            toggleTimer() {
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.start();
                }
            },
    
            reset() {
                this.pause();
                this.timerWorker.postMessage({
                    type: 'RESET',
                    payload: { duration: this.times[this.currentMode] }
                });
                this.showToast('计时器已重置', 'info', 'fa-rotate');
            },
    
            // 模式切换
            changeMode(mode) {
                if (mode === this.currentMode) return;
                
                // 如果计时器在运行，先暂停
                if (this.isRunning) {
                    this.pause();
                }
                
                this.currentMode = mode;
                this.timeLeft = this.times[mode];
                this.timerWorker.postMessage({
                    type: 'RESET',
                    payload: { duration: this.times[mode] }
                });
                
                // 添加动画效果
                gsap.timeline()
                    .to('.timer-container', {
                        scale: 0.95,
                        duration: 0.2,
                        ease: 'power2.inOut'
                    })
                    .to('.timer-container', {
                        scale: 1,
                        duration: 0.4,
                        ease: 'back.out(1.7)'
                    });
            },
    
            toggleBreakMode() {
                if (this.currentMode === 'pomodoro') {
                    this.changeMode('shortBreak');
                    return;
                }
                const nextMode = this.currentMode === 'shortBreak' ? 'longBreak' : 'shortBreak';
                this.changeMode(nextMode);
            },
    
            // 设置相关
            loadSettings() {
                try {
                    const savedSettings = localStorage.getItem('pomodoroSettings');
                    if (savedSettings) {
                        const data = JSON.parse(savedSettings);
                        this.settings = { ...this.settings, ...data.settings };
                        this.times = { ...this.times, ...data.times };
                        this.completedSessions = data.completedSessions || 0;
                        this.todaySessions = data.todaySessions || 0;
                        this.totalFocusTime = data.totalFocusTime || 0;
                        this.currentStreak = data.currentStreak || 0;
                        this.lastFocusDate = data.lastFocusDate;
                    }
                } catch (error) {
                    console.error('Error loading settings:', error);
                    this.showToast('设置加载失败', 'error', 'fa-exclamation-circle');
                }
            },
    
            saveSettings() {
                try {
                    localStorage.setItem('pomodoroSettings', JSON.stringify({
                        settings: this.settings,
                        times: this.times,
                        completedSessions: this.completedSessions,
                        todaySessions: this.todaySessions,
                        totalFocusTime: this.totalFocusTime,
                        currentStreak: this.currentStreak,
                        lastFocusDate: this.lastFocusDate
                    }));
                } catch (error) {
                    console.error('Error saving settings:', error);
                    this.showToast('设置保存失败', 'error', 'fa-exclamation-circle');
                }
            },
    
            // 通知系统
            async requestNotificationPermission() {
                if (!('Notification' in window)) {
                    this.settings.notificationsEnabled = false;
                    this.showToast('你的浏览器不支持通知功能', 'error', 'fa-exclamation-circle');
                    this.saveSettings();
                    return;
                }
    
                try {
                    const permission = await Notification.requestPermission();
                    this.settings.notificationsEnabled = permission === 'granted';
                    
                    if (permission === 'granted') {
                        this.showToast('通知权限已开启', 'success', 'fa-bell');
                    } else {
                        this.showToast('通知权限被拒绝', 'warning', 'fa-exclamation-triangle');
                    }
                    
                    this.saveSettings();
                } catch (error) {
                    console.error('Error requesting notification permission:', error);
                    this.settings.notificationsEnabled = false;
                    this.showToast('请求通知权限失败', 'error', 'fa-exclamation-circle');
                    this.saveSettings();
                }
            },
    
            showNotification(title, body) {
                if (this.settings.notificationsEnabled && Notification.permission === 'granted') {
                    try {
                        new Notification(title, {
                            body,
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/icon-192x192.png'
                        });
                    } catch (error) {
                        console.error('Error showing notification:', error);
                    }
                }
            },
    
            // Toast 系统
            showToast(message, type = 'success', icon = 'fa-check', duration = 3000) {
                this.toast.queue.push({
                    message,
                    type,
                    icon: `fas ${icon}`,
                    duration
                });
                
                if (!this.toast.processing) {
                    this.processToastQueue();
                }
            },
    
            async processToastQueue() {
                if (this.toast.queue.length === 0) {
                    this.toast.processing = false;
                    return;
                }
                
                this.toast.processing = true;
                const { message, type, icon, duration } = this.toast.queue.shift();
                
                if (this.toast.show) {
                    this.toast.show = false;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                this.toast.message = message;
                this.toast.type = type;
                this.toast.icon = icon;
                this.toast.show = true;
                
                setTimeout(async () => {
                    this.toast.show = false;
                    await new Promise(resolve => setTimeout(resolve, 300));
                    this.processToastQueue();
                }, duration);
            },
    
            // 统计系统
            updateStats() {
                const today = new Date().toDateString();
                
                if (this.lastFocusDate !== today) {
                    this.todaySessions = 1;
                    
                    const lastDate = this.lastFocusDate ? new Date(this.lastFocusDate) : null;
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    if (lastDate && lastDate.toDateString() === yesterday.toDateString()) {
                        this.currentStreak++;
                    } else if (!lastDate || lastDate.toDateString() !== today) {
                        this.currentStreak = 1;
                    }
                } else {
                    this.todaySessions++;
                }
                
                this.lastFocusDate = today;
                this.totalFocusTime += this.times.pomodoro;
                
                this.saveSettings();
            },
    
            checkAndUpdateStreak() {
                const today = new Date().toDateString();
                const lastDate = this.lastFocusDate ? new Date(this.lastFocusDate) : null;
                
                if (lastDate) {
                    const daysDiff = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
                    if (daysDiff > 1) {
                        this.currentStreak = 0;
                        this.saveSettings();
                    }
                }
            },
    
            resetStats() {
                if (confirm('确定要重置所有统计数据吗？')) {
                    this.completedSessions = 0;
                    this.todaySessions = 0;
                    this.totalFocusTime = 0;
                    this.currentStreak = 0;
                    this.lastFocusDate = null;
                    this.saveSettings();
                    this.showToast('统计数据已重置', 'info', 'fa-refresh');
                }
            },
    
            // 主题系统
            applyTheme(theme) {
                document.documentElement.style.setProperty('--primary', `var(--theme-${theme})`);
                const themeColor = getComputedStyle(document.documentElement)
                    .getPropertyValue(`--theme-${theme}`).trim();
                const metaTheme = document.querySelector('meta[name="theme-color"]');
                if (metaTheme) {
                    metaTheme.setAttribute('content', themeColor);
                }
            },
    
            changeTheme(theme) {
                this.settings.theme = theme;
                this.applyTheme(theme);
                this.saveSettings();
                this.showToast('主题已更新', 'success', 'fa-palette');
            },
    
            // 系统功能
            preventSleep() {
                if ('wakeLock' in navigator) {
                    navigator.wakeLock.request('screen')
                        .then(lock => this.wakeLock = lock)
                        .catch(error => console.error('Error requesting wake lock:', error));
                }
            },
    
            allowSleep() {
                if (this.wakeLock) {
                    this.wakeLock.release().then(() => {
                        this.wakeLock = null;
                    }).catch(error => {
                        console.error('Error releasing wake lock:', error);
                    });
                }
            },
    
            // 计时器完成处理
            handleTimerComplete() {
                this.isRunning = false;
                
                if (this.currentMode === 'pomodoro') {
                    this.completedSessions++;
                    this.updateStats();
                    
                    if (this.settings.soundEnabled) {
                        this.playCompletionSound();
                    }
                    
                    this.showNotification('专注完成！', '是时候休息一下了。');
                } else {
                    this.showNotification('休息结束！', '准备开始新的专注。');
                }
            
                // 添加完成动画
                gsap.timeline()
                    .to('.timer-container', {
                        scale: 1.1,
                        duration: 0.3,
                        ease: 'power2.out'
                    })
                    .to('.timer-container', {
                        scale: 1,
                        duration: 0.5,
                        ease: 'elastic.out(1, 0.3)'
                    });
            
                const nextMode = this.getNextMode();
                
                // 添加自动切换的逻辑判断，防止循环
                const shouldAutoStart = (
                    // 从休息切换到专注时
                    (this.currentMode !== 'pomodoro' && nextMode === 'pomodoro' && this.settings.autoStartPomodoro) ||
                    // 从专注切换到休息时
                    (this.currentMode === 'pomodoro' && nextMode !== 'pomodoro' && this.settings.autoStartBreak)
                );
            
                // 首先切换模式和重置计时器
                this.currentMode = nextMode;
                this.timeLeft = this.times[nextMode];
                this.timerWorker.postMessage({
                    type: 'RESET',
                    payload: { duration: this.times[nextMode] }
                });
            
                if (shouldAutoStart) {
                    setTimeout(() => {
                        this.start();
                    }, 1000);
                }
            },
    
            // 获取下一个模式
            getNextMode() {
                if (this.currentMode === 'pomodoro') {
                    return this.completedSessions % this.settings.longBreakInterval === 0 
                        ? 'longBreak' 
                        : 'shortBreak';
                }
                return 'pomodoro';
            },
    
            // 声音效果
            playCompletionSound() {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
                    console.error('Error playing completion sound:', error);
                }
            },
    
            // 面板控制
            openSettings() {
                this.showSettings = true;
                if (this.settings.notificationsEnabled && Notification.permission !== 'granted') {
                    this.settings.notificationsEnabled = false;
                }
            },
            
            closeSettings() {
                this.showSettings = false;
                this.saveSettings();
            },
            
            openStatsPanel() {
                this.showStatsPanel = true;
            },
            
            closeStatsPanel() {
                this.showStatsPanel = false;
            },
    
            // 时间设置更新
            updateTime(mode, minutes) {
                const newTime = Math.max(1, Math.min(60, parseInt(minutes) || 1)) * 60;
                this.times[mode] = newTime;
                
                if (mode === this.currentMode) {
                    this.timeLeft = newTime;
                    this.timerWorker.postMessage({
                        type: 'RESET',
                        payload: { duration: newTime }
                    });
                }
                
                this.saveSettings();
            },
    
            // 键盘快捷键处理
            handleKeyPress(e) {
                if (e.code === 'Space' && !this.showSettings && !this.showStatsPanel) {
                    e.preventDefault();
                    this.toggleTimer();
                }
                else if (e.code === 'Escape') {
                    if (this.showSettings) this.closeSettings();
                    if (this.showStatsPanel) this.closeStatsPanel();
                }
            },
    
            // 页面可见性处理
            handleVisibilityChange() {
                if (document.hidden) {
                    // 页面隐藏时不需要特殊处理，Worker会继续运行
                } else {
                    // 页面可见时同步状态
                    const savedState = this.loadTimerState();
                    if (savedState && this.isRunning) {
                        this.timerWorker.postMessage({
                            type: 'SYNC_TIME',
                            payload: { timeLeft: savedState.timeLeft }
                        });
                    }
                }
            },
    
            // 清理函数
            cleanup() {
                if (this.timerWorker) {
                this.saveTimerState({
                    timeLeft: this.timeLeft,
                    isRunning: this.isRunning,
                    mode: this.currentMode
                });
                this.timerWorker.terminate();
            }
            
            if (this.wakeLock) {
                this.wakeLock.release().catch(console.error);
            }
        }
    }));
});