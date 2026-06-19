import { ref, onMounted, onUnmounted } from 'vue'
import { indexedDBService } from '@/services/IndexedDBService'
import type { Specimen, SettingRecord, FilterOptions } from '@/types'

export function useIndexedDB() {
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const specimens = ref<Specimen[]>([])
  const currentSpecimen = ref<Specimen | null>(null)

  const init = async (): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      await indexedDBService.initDB()
      isInitialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('数据库初始化失败')
      console.error('IndexedDB initialization error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const clearError = (): void => {
    error.value = null
  }

  const addSpecimen = async (
    specimen: Omit<Specimen, 'id'>
  ): Promise<number | null> => {
    isLoading.value = true
    error.value = null
    try {
      const id = await indexedDBService.addSpecimen(specimen)
      await loadAllSpecimens()
      return id
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('添加标本失败')
      return null
    } finally {
      isLoading.value = false
    }
  }

  const getSpecimen = async (id: number): Promise<Specimen | null> => {
    isLoading.value = true
    error.value = null
    try {
      const specimen = await indexedDBService.getSpecimen(id)
      currentSpecimen.value = specimen ?? null
      return specimen ?? null
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('获取标本失败')
      return null
    } finally {
      isLoading.value = false
    }
  }

  const updateSpecimen = async (
    id: number,
    updates: Partial<Omit<Specimen, 'id' | 'createdAt'>>
  ): Promise<boolean> => {
    isLoading.value = true
    error.value = null
    try {
      await indexedDBService.updateSpecimen(id, updates)
      await loadAllSpecimens()
      if (currentSpecimen.value?.id === id) {
        currentSpecimen.value = await indexedDBService.getSpecimen(id) ?? null
      }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('更新标本失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const deleteSpecimen = async (id: number): Promise<boolean> => {
    isLoading.value = true
    error.value = null
    try {
      await indexedDBService.deleteSpecimen(id)
      await loadAllSpecimens()
      if (currentSpecimen.value?.id === id) {
        currentSpecimen.value = null
      }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('删除标本失败')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const loadAllSpecimens = async (): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      specimens.value = await indexedDBService.getAllSpecimens()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('加载标本列表失败')
    } finally {
      isLoading.value = false
    }
  }

  const loadSpecimensByFilter = async (filter: FilterOptions): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      const allSpecimens = await indexedDBService.getAllSpecimens()
      specimens.value = allSpecimens.filter((s) => {
        if (filter.season && s.season !== filter.season) return false
        if (filter.plantType && s.plantType !== filter.plantType) return false
        if (filter.environment && s.environment !== filter.environment) return false
        return true
      })
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('筛选标本失败')
    } finally {
      isLoading.value = false
    }
  }

  const reorderSpecimens = async (ids: number[]): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      await indexedDBService.reorderSpecimens(ids)
      await loadAllSpecimens()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('重排标本失败')
    } finally {
      isLoading.value = false
    }
  }

  const getSetting = async (key: SettingRecord['key']): Promise<string | undefined> => {
    error.value = null
    try {
      return await indexedDBService.getSetting(key)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('获取设置失败')
      return undefined
    }
  }

  const setSetting = async (key: SettingRecord['key'], value: string): Promise<boolean> => {
    error.value = null
    try {
      await indexedDBService.setSetting(key, value)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('保存设置失败')
      return false
    }
  }

  const closeDB = async (): Promise<void> => {
    try {
      await indexedDBService.closeDB()
      isInitialized.value = false
    } catch (err) {
      console.error('Failed to close database:', err)
    }
  }

  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    closeDB()
  })

  return {
    isInitialized,
    isLoading,
    error,
    specimens,
    currentSpecimen,
    init,
    clearError,
    addSpecimen,
    getSpecimen,
    updateSpecimen,
    deleteSpecimen,
    loadAllSpecimens,
    loadSpecimensByFilter,
    reorderSpecimens,
    getSetting,
    setSetting,
    closeDB,
  }
}

export type UseIndexedDBReturn = ReturnType<typeof useIndexedDB>
