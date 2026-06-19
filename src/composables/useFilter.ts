import { computed } from 'vue'
import { useSpecimenStore } from '@/stores/specimen'
import type { Season, PlantType, Environment, FilterOptions } from '@/types'

export function useFilter() {
  const specimenStore = useSpecimenStore()

  const filterOptions = computed(() => specimenStore.filterOptions)
  const filteredSpecimens = computed(() => specimenStore.filteredSpecimens)
  const hasActiveFilters = computed(() => {
    const { season, plantType, environment } = specimenStore.filterOptions
    return season !== null || plantType !== null || environment !== null
  })

  const activeFilterCount = computed(() => {
    let count = 0
    if (specimenStore.filterOptions.season) count++
    if (specimenStore.filterOptions.plantType) count++
    if (specimenStore.filterOptions.environment) count++
    return count
  })

  function setSeason(season: Season | null): void {
    specimenStore.setFilterSeason(season)
  }

  function setPlantType(plantType: PlantType | null): void {
    specimenStore.setFilterPlantType(plantType)
  }

  function setEnvironment(environment: Environment | null): void {
    specimenStore.setFilterEnvironment(environment)
  }

  function toggleSeason(season: Season): void {
    if (specimenStore.filterOptions.season === season) {
      specimenStore.setFilterSeason(null)
    } else {
      specimenStore.setFilterSeason(season)
    }
  }

  function togglePlantType(plantType: PlantType): void {
    if (specimenStore.filterOptions.plantType === plantType) {
      specimenStore.setFilterPlantType(null)
    } else {
      specimenStore.setFilterPlantType(plantType)
    }
  }

  function toggleEnvironment(environment: Environment): void {
    if (specimenStore.filterOptions.environment === environment) {
      specimenStore.setFilterEnvironment(null)
    } else {
      specimenStore.setFilterEnvironment(environment)
    }
  }

  function clearFilters(): void {
    specimenStore.clearFilters()
  }

  function setFilters(filters: Partial<FilterOptions>): void {
    if (filters.season !== undefined) specimenStore.setFilterSeason(filters.season)
    if (filters.plantType !== undefined) specimenStore.setFilterPlantType(filters.plantType)
    if (filters.environment !== undefined) specimenStore.setFilterEnvironment(filters.environment)
  }

  return {
    filterOptions,
    filteredSpecimens,
    hasActiveFilters,
    activeFilterCount,
    setSeason,
    setPlantType,
    setEnvironment,
    toggleSeason,
    togglePlantType,
    toggleEnvironment,
    clearFilters,
    setFilters,
  }
}

export type UseFilterReturn = ReturnType<typeof useFilter>
