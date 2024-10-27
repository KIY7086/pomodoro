<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      @click="$emit('close')"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        @click.stop
      >
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          {{ title }}
        </h3>
        
        <p class="text-gray-500 mb-6">
          {{ message }}
        </p>

        <div class="flex justify-end space-x-4">
          <button
            class="btn btn-secondary"
            @click="$emit('close')"
          >
            {{ cancelText }}
          </button>
          <button
            class="btn btn-primary"
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: {
    type: String,
    default: '确认操作'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  }
})

defineEmits(['close', 'confirm'])
</script>