<template>
  <div class="card">
    <div class="flex justify-center space-x-4 mb-6">
      <button 
        v-for="(label, m) in modes" 
        :key="m"
        class="btn"
        :class="[mode === m ? 'btn-primary' : 'btn-secondary']"
        @click="setMode(m)"
      >
        {{ label }}
      </button>
    </div>

    <div class="text-center mb-8">
      <div 
        class="text-6xl font-bold mb-4 cursor-pointer hover:text-primary-600 transition-colors"
        @click="toggleTimer"
      >
        {{ displayTime }}
      </div>

      <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          class="h-full bg-primary-500 transition-all duration-1000 ease-linear"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>

    <div class="flex justify-center space-x-4">
      <button 
        class="btn btn-primary"
        @click="startTimer"
        :disabled="isRunning"
      >
        开始
      </button>
      <button 
        class="btn btn-secondary"
        @click="pauseTimer"
        :disabled="!isRunning"
      >
        暂停
      </button>
      <button 
        class="btn btn-secondary"
        @click="resetTimer"
      >
        重置
      </button>
    </div>

    <div v-if="currentTask" class="mt-8 p-4 bg-gray-50 rounded-lg">
      <h3 class="font-medium mb-2">当前任务</h3>
      <p class="text-gray-600">{{ currentTask.title }}</p>
      <p class="text-sm text-gray-500 mt-1">
        已完成 {{ currentTask.pomodoros }}/{{ currentTask.estimatedPomodoros }} 个番茄钟
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timer'
import { useTaskStore } from '@/stores/tasks'
import { storeToRefs } from 'pinia'

const timerStore = useTimerStore()
const taskStore = useTaskStore()

const { displayTime, progress, mode, isRunning } = storeToRefs(timerStore)
const { currentTask } = storeToRefs(taskStore)

const modes = {
  work: '工作',
  shortBreak: '短休息',
  longBreak: '长休息'
}

const toggleTimer = () => {
  if (isRunning.value) {
    timerStore.pauseTimer()
  } else {
    timerStore.startTimer()
  }
}

const { startTimer, pauseTimer, resetTimer, setMode } = timerStore
</script>
