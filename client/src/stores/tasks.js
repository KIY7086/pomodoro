import { defineStore } from 'pinia'
import axios from 'axios'

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    currentTask: null,
    loading: false,
    error: null
  }),

  getters: {
    incompleteTasks: (state) => state.tasks.filter(task => !task.completed),
    completedTasks: (state) => state.tasks.filter(task => task.completed),
    
    taskStats: (state) => ({
      total: state.tasks.length,
      completed: state.tasks.filter(task => task.completed).length,
      totalPomodoros: state.tasks.reduce((sum, task) => sum + task.pomodoros, 0),
      estimatedPomodoros: state.tasks.reduce((sum, task) => sum + task.estimatedPomodoros, 0)
    })
  },

  actions: {
    async fetchTasks() {
      this.loading = true
      try {
        const response = await axios.get('/api/tasks')
        this.tasks = response.data
      } catch (error) {
        this.error = '获取任务列表失败'
        console.error('获取任务失败:', error)
      } finally {
        this.loading = false
      }
    },

    async addTask(task) {
      try {
        const response = await axios.post('/api/tasks', task)
        this.tasks.unshift(response.data)
        return response.data
      } catch (error) {
        this.error = '添加任务失败'
        throw error
      }
    },

    async updateTask(taskId, updates) {
      try {
        const response = await axios.patch(`/api/tasks/${taskId}`, updates)
        const index = this.tasks.findIndex(task => task.id === taskId)
        if (index !== -1) {
          this.tasks[index] = response.data
        }
        if (this.currentTask?.id === taskId) {
          this.currentTask = response.data
        }
        return response.data
      } catch (error) {
        this.error = '更新任务失败'
        throw error
      }
    },

    async deleteTask(taskId) {
      try {
        await axios.delete(`/api/tasks/${taskId}`)
        this.tasks = this.tasks.filter(task => task.id !== taskId)
        if (this.currentTask?.id === taskId) {
          this.currentTask = null
        }
      } catch (error) {
        this.error = '删除任务失败'
        throw error
      }
    },

    setCurrentTask(task) {
      this.currentTask = task
    },

    async incrementPomodoro(taskId) {
      const task = this.tasks.find(t => t.id === taskId)
      if (task) {
        await this.updateTask(taskId, {
          pomodoros: task.pomodoros + 1
        })
      }
    }
  }
})