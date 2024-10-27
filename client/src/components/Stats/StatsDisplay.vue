<template>
  <div class="space-y-8">
    <!-- 今日统计 -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-6">今日统计</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="stat-card">
          <div class="stat-value">{{ todayStats.completedPomodoros }}</div>
          <div class="stat-label">完成番茄钟</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ formatDuration(todayStats.workTime) }}</div>
          <div class="stat-label">专注时间</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ taskStats.completed }}</div>
          <div class="stat-label">完成任务</div>
        </div>
      </div>
    </div>

    <!-- 任务统计 -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-6">任务统计</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="stat-card">
          <div class="stat-title">任务完成率</div>
          <div class="flex items-end space-x-2">
            <div class="stat-value">
              {{ ((taskStats.completed / (taskStats.total || 1)) * 100).toFixed(1) }}%
            </div>
            <div class="text-gray-500 mb-1">
              ({{ taskStats.completed }}/{{ taskStats.total }})
            </div>
          </div>
          <div class="w-full h-2 bg-gray-100 rounded-full mt-2">
            <div 
              class="h-full bg-primary-500 rounded-full"
              :style="{
                width: `${(taskStats.completed / (taskStats.total || 1)) * 100}%`
              }"
            ></div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-title">番茄钟使用率</div>
          <div class="flex items-end space-x-2">
            <div class="stat-value">
              {{ ((taskStats.totalPomodoros / (taskStats.estimatedPomodoros || 1)) * 100).toFixed(1) }}%
            </div>
            <div class="text-gray-500 mb-1">
              ({{ taskStats.totalPomodoros }}/{{ taskStats.estimatedPomodoros }})
            </div>
          </div>
          <div class="w-full h-2 bg-gray-100 rounded-full mt-2">
            <div 
              class="h-full bg-primary-500 rounded-full"
              :style="{
                width: `${(taskStats.totalPomodoros / (taskStats.estimatedPomodoros || 1)) * 100}%`
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useTimerStore } from '@/stores/timer'
import { useTaskStore } from '@/stores/tasks'
import { formatDuration } from '@/utils/time'

const timerStore = useTimerStore()
const taskStore = useTaskStore()

const { todayStats } = storeToRefs(timerStore)
const { taskStats } = storeToRefs(taskStore)
</script>

<style scoped>
.stat-card {
  @apply p-4 bg-gray-50 rounded-lg;
}

.stat-value {
  @apply text-3xl font-bold text-primary-600;
}

.stat-label {
  @apply text-sm text-gray-500 mt-1;
}

.stat-title {
  @apply text-sm font-medium text-gray-600 mb-2;
}
</style>