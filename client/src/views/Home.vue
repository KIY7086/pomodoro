<template>
  <div class="space-y-8">
    <TimerDisplay />
    <TaskList />
  </div>
</template>

<script setup>
import TimerDisplay from '@/components/Timer/TimerDisplay.vue'
import TaskList from '@/components/Tasks/TaskList.vue'
</script>