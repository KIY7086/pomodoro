import { defineStore } from 'pinia'
import { useTaskStore } from './tasks'
import { sendNotification } from '@/utils/notification'

export const useTimerStore = defineStore('timer', {
  state: () => ({
    time: 25 * 60,
    isRunning: false,
    intervalId: null,
    mode: 'work',
    settings: {
      workTime: 25,
      shortBreakTime: 5,
      longBreakTime: 15,
      autoStartBreak: false,
      autoStartWork: false,
      longBreakInterval: 4,
      notification: true
    },
    todayStats: {
      completedPomodoros: 0,
      workTime: 0,
    },
    currentSequence: 0
  }),

  getters: {
    displayTime: (state) => {
      const minutes = Math.floor(state.time / 60)
      const seconds = state.time % 60
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    },
    
    progress: (state) => {
      const total = state.mode === 'work' 
        ? state.settings.workTime * 60
        : state.mode === 'shortBreak' 
          ? state.settings.shortBreakTime * 60
          : state.settings.longBreakTime * 60
      return ((total - state.time) / total) * 100
    },

    modeLabel: (state) => {
      switch (state.mode) {
        case 'work': return '工作'
        case 'shortBreak': return '短休息'
        case 'longBreak': return '长休息'
        default: return ''
      }
    }
  },

  actions: {
    startTimer() {
      if (!this.isRunning) {
        this.isRunning = true
        this.intervalId = setInterval(() => {
          if (this.time > 0) {
            this.time--
            if (this.mode === 'work') {
              this.todayStats.workTime++
            }
          } else {
            this.handleTimerComplete()
          }
        }, 1000)
      }
    },

    pauseTimer() {
      if (this.isRunning) {
        clearInterval(this.intervalId)
        this.isRunning = false
        this.intervalId = null
      }
    },

    resetTimer() {
      this.pauseTimer()
      this.time = this.getTimeByMode(this.mode)
    },

    getTimeByMode(mode) {
      switch (mode) {
        case 'work':
          return this.settings.workTime * 60
        case 'shortBreak':
          return this.settings.shortBreakTime * 60
        case 'longBreak':
          return this.settings.longBreakTime * 60
        default:
          return this.settings.workTime * 60
      }
    },

    async handleTimerComplete() {
      this.pauseTimer()
      
      if (this.mode === 'work') {
        this.todayStats.completedPomodoros++
        this.currentSequence++
        
        const taskStore = useTaskStore()
        if (taskStore.currentTask) {
          await taskStore.incrementPomodoro(taskStore.currentTask.id)
        }
        
        if (this.currentSequence >= this.settings.longBreakInterval) {
          this.setMode('longBreak')
          this.currentSequence = 0
        } else {
          this.setMode('shortBreak')
        }

        if (this.settings.autoStartBreak) {
          this.startTimer()
        }
      } else {
        this.setMode('work')
        if (this.settings.autoStartWork) {
          this.startTimer()
        }
      }

      if (this.settings.notification) {
        sendNotification('番茄钟提醒', {
          body: this.mode === 'work' ? '工作时间结束,该休息了!' : '休息结束,继续工作吧!'
        })
      }
    },

    setMode(mode) {
      this.mode = mode
      this.time = this.getTimeByMode(mode)
    },

    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings }
      if (!this.isRunning) {
        this.time = this.getTimeByMode(this.mode)
      }
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'pomodoro-settings',
        storage: localStorage,
        paths: ['settings']
      },
      {
        key: 'pomodoro-today',
        storage: localStorage,
        paths: ['todayStats'],
        beforeRestore: (context) => {
          const today = new Date().toDateString()
          const lastDate = localStorage.getItem('pomodoro-last-date')
          
          if (lastDate !== today) {
            context.store.todayStats = {
              completedPomodoros: 0,
              workTime: 0
            }
            localStorage.setItem('pomodoro-last-date', today)
          }
        }
      }
    ]
  }
})