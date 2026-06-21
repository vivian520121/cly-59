import { openDB, type IDBPDatabase } from 'idb'
import type { Specimen, SettingRecord } from '@/types'

const DB_NAME = 'HerbariumDB'
const DB_VERSION = 1

const STORE_SPECIMENS = 'specimens'
const STORE_SETTINGS = 'settings'

class IndexedDBService {
  private db: IDBPDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SPECIMENS)) {
          const specimenStore = db.createObjectStore(STORE_SPECIMENS, {
            keyPath: 'id',
            autoIncrement: true,
          })
          specimenStore.createIndex('season', 'season')
          specimenStore.createIndex('plantType', 'plantType')
          specimenStore.createIndex('environment', 'environment')
          specimenStore.createIndex('createdAt', 'createdAt')
          specimenStore.createIndex('positionIndex', 'positionIndex')
        }

        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' })
        }
      },
    })
  }

  async initDB(): Promise<void> {
    return this.init()
  }

  private async ensureDB(): Promise<IDBPDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  private toStorable(specimen: Partial<Specimen>): Partial<Specimen> {
    const storable: Partial<Specimen> = { ...specimen }
    if (specimen.bloomPeriod) {
      storable.bloomPeriod = [...specimen.bloomPeriod]
    }
    if (specimen.decorations) {
      storable.decorations = specimen.decorations.map((d) => ({ ...d }))
    }
    return storable
  }

  async getAllSpecimens(): Promise<Specimen[]> {
    const db = await this.ensureDB()
    const specimens = await db.getAllFromIndex(STORE_SPECIMENS, 'positionIndex')
    return specimens.map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }))
  }

  async getSpecimen(id: number): Promise<Specimen | undefined> {
    const db = await this.ensureDB()
    const specimen = await db.get(STORE_SPECIMENS, id)
    if (specimen) {
      return {
        ...specimen,
        createdAt: new Date(specimen.createdAt),
        updatedAt: new Date(specimen.updatedAt),
      }
    }
    return undefined
  }

  async addSpecimen(specimen: Omit<Specimen, 'id'>): Promise<number> {
    const db = await this.ensureDB()
    const now = new Date()
    const data = this.toStorable({
      ...specimen,
      createdAt: now,
      updatedAt: now,
    })
    return (await db.add(STORE_SPECIMENS, data)) as number
  }

  async updateSpecimen(id: number, updates: Partial<Specimen>): Promise<void> {
    const db = await this.ensureDB()
    const existing = await this.getSpecimen(id)
    if (!existing) return

    const updated = this.toStorable({
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    })
    await db.put(STORE_SPECIMENS, updated)
  }

  async deleteSpecimen(id: number): Promise<void> {
    const db = await this.ensureDB()
    await db.delete(STORE_SPECIMENS, id)
  }

  async reorderSpecimens(ids: number[]): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(STORE_SPECIMENS, 'readwrite')

    await Promise.all(
      ids.map((id, index) =>
        tx.store.get(id).then((specimen) => {
          if (specimen) {
            specimen.positionIndex = index
            specimen.updatedAt = new Date()
            return tx.store.put(specimen)
          }
        }),
      ),
    )

    await tx.done
  }

  async getSetting(key: SettingRecord['key']): Promise<string | undefined> {
    const db = await this.ensureDB()
    const record = await db.get(STORE_SETTINGS, key)
    return record?.value
  }

  async setSetting(key: SettingRecord['key'], value: string): Promise<void> {
    const db = await this.ensureDB()
    await db.put(STORE_SETTINGS, { key, value })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  async closeDB(): Promise<void> {
    return this.close()
  }
}

export const indexedDBService = new IndexedDBService()
