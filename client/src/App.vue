<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <router-link to="/" class="flex items-center px-2 py-2 text-lg font-medium text-primary-600">
              {{ title }}
            </router-link>
          </div>
          <div class="flex items-center space-x-4">
            <router-link 
              v-for="item in navItems" 
              :key="item.path"
              :to="item.path"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-gray-50"
              :class="{ 'bg-primary-50 text-primary-600': $route.path === item.path }"
            >
              {{ item.name }}
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = import.meta.env.VITE_APP_TITLE
const navItems = ref([
  { name: '首页', path: '/' },
  { name: '统计', path: '/stats' },
  { name: '设置', path: '/settings' }
])
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>