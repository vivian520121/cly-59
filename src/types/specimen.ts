import type { DecorationItem } from './decoration'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type PlantType = 'herbaceous' | 'woody'
export type Environment = 'mountain' | 'courtyard' | 'other'

export interface Specimen {
  id?: number
  name: string
  imageBlob: Blob | null
  filteredImageBlob: Blob | null
  location: string
  season: Season
  plantType: PlantType
  environment: Environment
  bloomPeriod: string[]
  notes: string
  positionIndex: number
  decorations: DecorationItem[]
  createdAt: Date
  updatedAt: Date
}

export interface SpecimenFormData {
  name: string
  location: string
  season: Season
  plantType: PlantType
  environment: Environment
  bloomPeriod: string[]
  notes: string
}

export interface FilterOptions {
  season: Season | null
  plantType: PlantType | null
  environment: Environment | null
}

export interface SettingRecord {
  key: 'theme' | 'displayMode' | 'gridColumns'
  value: string
}
