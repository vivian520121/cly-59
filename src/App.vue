<template>
  <div
    :class="['app-container', 'paper-texture']"
    :data-theme="themeStore.currentTheme"
  >
    <AppHeader>
      <slot name="header-actions"></slot>
    </AppHeader>

    <main class="router-view-container">
      <RouterView v-slot="{ Component, route }">
        <transition name="page-flip" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useThemeStore } from '@/stores/theme'
import { useSpecimenStore } from '@/stores/specimen'
import { indexedDBService } from '@/services/IndexedDBService'

const themeStore = useThemeStore()
const specimenStore = useSpecimenStore()

onMounted(async () => {
  await indexedDBService.init()
  await themeStore.initTheme()
  await specimenStore.fetchSpecimens()
})
</script>

<style lang="scss" scoped>
.app-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color var(--transition-normal), color var(--transition-normal);
  position: relative;
}

.router-view-container {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: var(--spacing-lg);
}

.router-view-container > :deep(*) {
  position: absolute;
  top: var(--spacing-lg);
  left: var(--spacing-lg);
  right: var(--spacing-lg);
  bottom: var(--spacing-lg);
}
</style>
