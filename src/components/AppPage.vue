<template>
  <div class="app-page">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
defineSlots<{
  default?: () => any;
}>();
</script>

<style scoped>
.app-page {
  position: relative;
}
</style>