<template>
  <div class="max-w-2xl mx-auto">
    <div class="card">
      <h2 class="text-xl font-semibold mb-6">设置</h2>
      
      <form @submit.prevent="saveSettings" class="space-y-8">
        <!-- 时间设置 -->
        <div class="settings-section">
          <h3 class="settings-title">时间设置（分钟）</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-group">
              <label class="form-label" for="workTime">工作时长</label>
              <div class="flex items-center space-x-4">
                <input
                  id="workTime"
                  v-model.number="formSettings.workTime"
                  type="range"
                  min="1"
                  max="60"
                  class="flex-1"
                >
                <input
                  type="number"
                  v-model.number="formSettings.workTime"
                  min="1"
                  max="60"
                  class="input w-20"
                >
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="shortBreakTime">短休息时长</label>
              <div class="flex items-center space-x-4">
                <input
                  id="shortBreakTime"
                  v-model.number="formSettings.shortBreakTime"
                  type="range"
                  min="1"
                  max="30"
                  class="flex-1"
                >
                <input
                  type="number"
                  v-model.number="formSettings.shortBreakTime"
                  min="1"
                  max="30"
                  class="input w-20"
                >
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="longBreakTime">长休息时长</label>
              <div class="flex items-center space-x-4">
                <input
                  id="longBreakTime"
                  v-model.number="formSettings.longBreakTime"
                  type="range"
                  min="5"
                  max="60"
                  class="flex-1"
                >
                <input
                  type="number"
                  v-model.number="formSettings.longBreakTime"
                  min="5"
                  max="60"
                  class="input w-20"
                >
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="longBreakInterval">长休息间隔</label>
              <div class="flex items-center space-x-4">
                <input
                  id="longBreakInterval"
                  v-model.number="formSettings.longBreakInterval"
                  type="range"
                  min="2"
                  max="8"
                  class="flex-1"
                >
                <input
                  type="number"
                  v-model.number="formSettings.longBreakInterval"
                  min="2"
                  max="8"
                  class="input w-20"
                >
              </div>
              <p class="text-sm text-gray-500 mt-1">
                完成多少个番茄钟后进入长休息
              </p>
            </div>
          </div>
        </div>

        <!-- 自动化设置 -->
        <div class="settings-section">
          <h3 class="settings-title">自动化设置</h3>
          
          <div class="space-y-4">
            <label class="flex items-center space-x-3">
              <input
                v-model="formSettings.autoStartBreak"
                type="checkbox"
                class="form-checkbox"
              >
              <span class="text-sm">工作结束后自动开始休息</span>
            </label>
            
            <label class="flex items-center space-x-3">
              <input
                v-model="formSettings.autoStartWork"
                type="checkbox"
                class="form-checkbox"
              >
              <span class="text-sm">休息结束后自动开始工作</span>
            </label>
          </div>
        </div>

        <!-- 通知设置 -->
        <div class="settings-section">
          <h3 class="settings-title">通知设置</h3>
          
          <div class="space-y-4">
            <label class="flex items-center space-x-3">
              <input
                v-model="formSettings.notification"
                type="checkbox"
                class="form-checkbox"
                @change="handleNotificationChange"
              >
              <span class="text-sm">启用桌面通知</span>
            </label>
            <p 
              v-if="!notificationSupported" 
              class="text-sm text-yellow-600"
            >
              您的浏览器不支持通知功能
            </p>
            <p 
              v-else-if="notificationDenied" 
              class="text-sm text-red-600"
            >
              通知权限被拒绝，请在浏览器设置中启用
            </p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-4">
          <button 
            type="button" 
            class="btn btn-secondary"
            @click="resetToDefault"
          >
            恢复默认设置
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
          >
            保存设置
          </button>
        </div>
      </form>
    </div>

    <!-- 简单的设置说明 -->
    <div class="mt-8 bg-blue-50 p-4 rounded-lg">
      <h4 class="text-blue-700 font-medium mb-2">使用说明</h4>
      <ul class="text-sm text-blue-600 space-y-2">
        <li>• 工作时长：每个番茄钟的工作时间，推荐 25 分钟</li>
        <li>• 短休息：两个番茄钟之间的休息时间，推荐 5 分钟</li>
        <li>• 长休息：完成多个番茄钟后的较长休息时间，推荐 15-30 分钟</li>
        <li>• 长休息间隔：连续完成几个番茄钟后进行长休息，推荐 4 个</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTimerStore } from '@/stores/timer'
import { storeToRefs } from 'pinia'
import { requestNotificationPermission } from '@/utils/notification'

const timerStore = useTimerStore()
const { settings } = storeToRefs(timerStore)

const formSettings = ref({ ...settings.value })
const notificationSupported = ref('Notification' in window)
const notificationDenied = ref(false)

// 默认设置
const defaultSettings = {
  workTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  autoStartBreak: false,
  autoStartWork: false,
  longBreakInterval: 4,
  notification: true
}

onMounted(async () => {
  // 检查通知权限
  if (notificationSupported.value) {
    if (Notification.permission === 'denied') {
      notificationDenied.value = true
      formSettings.value.notification = false
    } else if (Notification.permission === 'default') {
      // 如果用户还未决定，设置为false
      formSettings.value.notification = false
    }
  } else {
    formSettings.value.notification = false
  }
})

const saveSettings = () => {
  timerStore.updateSettings(formSettings.value)
  // 显示保存成功提示
  const toast = document.createElement('div')
  toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg'
  toast.textContent = '设置已保存'
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.remove()
  }, 2000)
}

const resetToDefault = () => {
  if (confirm('确定要恢复默认设置吗？')) {
    formSettings.value = { ...defaultSettings }
  }
}

const handleNotificationChange = async (e) => {
  if (e.target.checked && notificationSupported.value) {
    const granted = await requestNotificationPermission()
    if (!granted) {
      formSettings.value.notification = false
      notificationDenied.value = true
    }
  }
}
</script>

<style scoped>
.settings-section {
  @apply p-6 bg-gray-50 rounded-lg;
}

.settings-title {
  @apply text-lg font-medium text-gray-700 mb-4;
}

.form-checkbox {
  @apply h-4 w-4 text-primary-600 border-gray-300 rounded 
         focus:ring-primary-500 focus:ring-offset-0;
}

/* 自定义range滑块样式 */
input[type="range"] {
  @apply h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer;
}

input[type="range"]::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 bg-primary-500 rounded-full 
         cursor-pointer transition-all hover:bg-primary-600;
}

input[type="range"]:focus {
  @apply outline-none;
}

input[type="range"]::-webkit-slider-thumb:hover {
  @apply shadow-lg;
}
</style>