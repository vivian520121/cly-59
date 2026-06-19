import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import type { Theme } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()

  const currentTheme = computed(() => themeStore.currentTheme)
  const isForestMode = computed(() => themeStore.isForestMode)
  const isDayMode = computed(() => themeStore.currentTheme === 'day')

  function setTheme(theme: Theme): void {
    themeStore.setTheme(theme)
    applyThemeToDocument(theme)
  }

  function toggleTheme(): void {
    themeStore.toggleTheme()
    applyThemeToDocument(themeStore.currentTheme)
  }

  function applyThemeToDocument(theme: Theme): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  function initTheme(): Promise<void> {
    return themeStore.initTheme().then(() => {
      applyThemeToDocument(themeStore.currentTheme)
    })
  }

  return {
    currentTheme,
    isForestMode,
    isDayMode,
    setTheme,
    toggleTheme,
    initTheme,
  }
}

export type UseThemeReturn = ReturnType<typeof useTheme>
