<template>
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">任务列表</h2>
      <button class="btn btn-primary" @click="showAddTask = true">
        添加任务
      </button>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      加载中...
    </div>
    
    <div v-else-if="error" class="text-center py-8 text-red-500">
      {{ error }}
    </div>
    
    <div v-else>
      <div v-if="incompleteTasks.length === 0" class="text-center py-8 text-gray-500">
        暂无待完成任务
      </div>
      
      <TransitionGroup name="list" tag="div" class="space-y-4">
        <div
          v-for="task in incompleteTasks"
          :key="task.id"
          class="task-card"
          :class="{ 'ring-2 ring-primary-500': currentTask?.id === task.id }"
          @click="selectTask(task)"
        >
          <div class="flex-1">
            <h3 class="text-lg font-medium mb-1">{{ task.title }}</h3>
            <p v-if="task.description" class="text-gray-600 text-sm mb-2">
              {{ task.description }}
            </p>
            <div class="flex items-center space-x-4 text-sm text-gray-500">
              <span>已完成 {{ task.pomodoros }}/{{ task.estimatedPomodoros }} 个番茄钟</span>
              <span>创建于 {{ formatDate(task.createdAt) }}</span>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <button 
              class="p-2 hover:bg-gray-100 rounded-full"
              @click.stop="completeTask(task)"
              title="完成任务"
            >
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button 
              class="p-2 hover:bg-gray-100 rounded-full"
              @click.stop="deleteTask(task)"
              title="删除任务"
            >
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>

      <!-- 已完成任务折叠面板 -->
      <div v-if="completedTasks.length > 0" class="mt-8">
        <button 
          class="w-full py-2 px-4 text-left text-gray-600 hover:bg-gray-50 rounded-lg flex items-center"
          @click="showCompleted = !showCompleted"
        >
          <svg 
            class="w-5 h-5 mr-2 transform transition-transform"
            :class="{ 'rotate-90': showCompleted }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          已完成任务 ({{ completedTasks.length }})
        </button>

        <TransitionGroup 
          name="list" 
          tag="div" 
          class="space-y-4 mt-4"
          v-show="showCompleted"
        >
          <div
            v-for="task in completedTasks"
            :key="task.id"
            class="task-card opacity-75"
          >
            <div class="flex-1">
              <h3 class="text-lg font-medium mb-1 line-through">{{ task.title }}</h3>
              <p v-if="task.description" class="text-gray-600 text-sm mb-2 line-through">
                {{ task.description }}
              </p>
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                <span>完成 {{ task.pomodoros }} 个番茄钟</span>
                <span>完成于 {{ formatDate(task.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- 添加任务对话框 -->
    <Teleport to="body">
      <div v-if="showAddTask" class="modal-overlay" @click="showAddTask = false">
        <div class="modal" @click.stop>
          <h2 class="text-xl font-semibold mb-6">添加新任务</h2>
          <form @submit.prevent="handleAddTask">
            <div class="space-y-4">
              <div>
                <label class="form-label" for="title">任务名称</label>
                <input
                  id="title"
                  v-model="newTask.title"
                  type="text"
                  required
                  class="input"
                  placeholder="输入任务名称"
                >
              </div>
              
              <div>
                <label class="form-label" for="description">任务描述</label>
                <textarea
                  id="description"
                  v-model="newTask.description"
                  class="input"
                  rows="3"
                  placeholder="输入任务描述（可选）"
                ></textarea>
              </div>
              
              <div>
                <label class="form-label" for="estimated">预计番茄钟数</label>
                <input
                  id="estimated"
                  v-model.number="newTask.estimatedPomodoros"
                  type="number"
                  min="1"
                  required
                  class="input"
                >
              </div>
            </div>

            <div class="flex justify-end space-x-4 mt-6">
              <button 
                type="button" 
                class="btn btn-secondary" 
                @click="showAddTask = false"
              >
                取消
              </button>
              <button type="submit" class="btn btn-primary">
                添加
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { storeToRefs } from 'pinia'

const taskStore = useTaskStore()
const { tasks, loading, error, incompleteTasks, completedTasks, currentTask } = storeToRefs(taskStore)

const showAddTask = ref(false)
const showCompleted = ref(false)
const newTask = ref({
  title: '',
  description: '',
  estimatedPomodoros: 1
})

onMounted(() => {
  taskStore.fetchTasks()
})

const handleAddTask = async () => {
  try {
    await taskStore.addTask(newTask.value)
    showAddTask.value = false
    newTask.value = {
      title: '',
      description: '',
      estimatedPomodoros: 1
    }
  } catch (error) {
    // 错误已在store中处理
  }
}

const selectTask = (task) => {
  taskStore.setCurrentTask(task)
}

const completeTask = async (task) => {
  try {
    await taskStore.updateTask(task.id, { completed: true })
  } catch (error) {
    // 错误已在store中处理
  }
}

const deleteTask = async (task) => {
  if (confirm('确定要删除这个任务吗？')) {
    try {
      await taskStore.deleteTask(task.id)
    } catch (error) {
      // 错误已在store中处理
    }
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  })
}
</script>

<style scoped>
.task-card {
  @apply flex items-start justify-between p-4 bg-white rounded-lg shadow-sm
         hover:shadow transition-shadow cursor-pointer;
}

.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4;
}

.modal {
  @apply bg-white rounded-lg shadow-xl max-w-md w-full p-6;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>