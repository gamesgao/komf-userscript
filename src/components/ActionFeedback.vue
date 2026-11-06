<template>
  <svg v-if="success" class="komf-action-success" width="24" height="24" viewBox="0 0 24 24"
       role="img" :aria-label="label">
    <path d="M5 12.5 9.5 17 19 7" fill="none" stroke="currentColor" stroke-width="3"
          stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <q-spinner v-else size="24px" />
</template>

<script setup lang="ts">
defineProps({
  success: Boolean,
  label: { type: String, default: 'Completed' }
})
</script>

<style scoped>
.komf-action-success {
  display: block;
  flex: none;
  width: 24px !important;
  height: 24px !important;
  color: #15803d !important;
}
:global([data-komf-theme='dark']) .komf-action-success {
  color: #4ade80 !important;
}
</style>
