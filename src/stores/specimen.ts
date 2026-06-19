import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Specimen, Season, PlantType, Environment, FilterOptions } from '@/types'
import { indexedDBService } from '@/services/IndexedDBService'

export const useSpecimenStore = defineStore('specimen', () => {
  const specimens = ref<Specimen[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentSpecimen = ref<Specimen | null>(null)
  const filterOptions = ref<FilterOptions>({
    season: null,
    plantType: null,
    environment: null,
  })

  const filteredSpecimens = computed(() => {
    return specimens.value.filter((s) => {
      if (filterOptions.value.season && s.season !== filterOptions.value.season) {
        return false
      }
      if (filterOptions.value.plantType && s.plantType !== filterOptions.value.plantType) {
        return false
      }
      if (filterOptions.value.environment && s.environment !== filterOptions.value.environment) {
        return false
      }
      return true
    })
  })

  async function fetchSpecimens(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      specimens.value = await indexedDBService.getAllSpecimens()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取标本列表失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchSpecimenById(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const specimen = await indexedDBService.getSpecimen(id)
      currentSpecimen.value = specimen || null
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取标本详情失败'
    } finally {
      loading.value = false
    }
  }

  async function addSpecimen(specimen: Omit<Specimen, 'id'>): Promise<number> {
    loading.value = true
    error.value = null
    try {
      const id = await indexedDBService.addSpecimen(specimen)
      await fetchSpecimens()
      return id
    } catch (e) {
      error.value = e instanceof Error ? e.message : '添加标本失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateSpecimen(id: number, updates: Partial<Specimen>): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await indexedDBService.updateSpecimen(id, updates)
      await fetchSpecimens()
      if (currentSpecimen.value?.id === id) {
        currentSpecimen.value = { ...currentSpecimen.value, ...updates }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '更新标本失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteSpecimen(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await indexedDBService.deleteSpecimen(id)
      await fetchSpecimens()
      if (currentSpecimen.value?.id === id) {
        currentSpecimen.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '删除标本失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function reorderSpecimens(ids: number[]): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await indexedDBService.reorderSpecimens(ids)
      await fetchSpecimens()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '重排标本失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  function setFilterSeason(season: Season | null): void {
    filterOptions.value.season = season
  }

  function setFilterPlantType(plantType: PlantType | null): void {
    filterOptions.value.plantType = plantType
  }

  function setFilterEnvironment(environment: Environment | null): void {
    filterOptions.value.environment = environment
  }

  function clearFilters(): void {
    filterOptions.value = {
      season: null,
      plantType: null,
      environment: null,
    }
  }

  function setCurrentSpecimen(specimen: Specimen | null): void {
    currentSpecimen.value = specimen
  }

  return {
    specimens,
    loading,
    error,
    currentSpecimen,
    filterOptions,
    filteredSpecimens,
    fetchSpecimens,
    fetchSpecimenById,
    addSpecimen,
    updateSpecimen,
    deleteSpecimen,
    reorderSpecimens,
    setFilterSeason,
    setFilterPlantType,
    setFilterEnvironment,
    clearFilters,
    setCurrentSpecimen,
  }
})
