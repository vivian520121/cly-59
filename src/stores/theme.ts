import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { indexedDBService } from '@/services/IndexedDBService'

export type Theme = 'day' | 'forest'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<Theme>('day')
  const isInitialized = ref(false)

  const isForestMode = computed(() => currentTheme.value === 'forest')

  async function initTheme(): Promise<void> {
    if (isInitialized.value) return

    const savedTheme = await indexedDBService.getSetting('theme')
    if (savedTheme === 'day' || savedTheme === 'forest') {
      currentTheme.value = savedTheme
    }
    isInitialized.value = true
  }

  function setTheme(theme: Theme): void {
    currentTheme.value = theme
  }

  function toggleTheme(): void {
    currentTheme.value = currentTheme.value === 'day' ? 'forest' : 'day'
  }

  watch(currentTheme, async (newTheme) => {
    if (isInitialized.value) {
      await indexedDBService.setSetting('theme', newTheme)
    }
  })

  return {
    currentTheme,
    isForestMode,
    initTheme,
    setTheme,
    toggleTheme,
  }
})
