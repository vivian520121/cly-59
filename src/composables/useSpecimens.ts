import { ref, computed, onMounted } from 'vue'
import { useSpecimenStore } from '@/stores/specimen'
import type { Specimen, SpecimenFormData } from '@/types'

export function useSpecimens() {
  const specimenStore = useSpecimenStore()

  const loading = computed(() => specimenStore.loading)
  const error = computed(() => specimenStore.error)
  const specimens = computed(() => specimenStore.specimens)
  const currentSpecimen = computed(() => specimenStore.currentSpecimen)

  const imageDataURLs = ref<Map<number, string>>(new Map())
  const filteredImageDataURLs = ref<Map<number, string>>(new Map())

  async function blobToDataURL(blob: Blob | null): Promise<string | null> {
    if (!blob) return null

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async function loadSpecimens() {
    await specimenStore.fetchSpecimens()
  }

  async function loadSpecimenById(id: number) {
    await specimenStore.fetchSpecimenById(id)
  }

  async function createSpecimen(
    formData: SpecimenFormData,
    imageBlob: Blob | null = null,
  ): Promise<number> {
    const positionIndex = specimens.value.length

    const specimen: Omit<Specimen, 'id'> = {
      ...formData,
      imageBlob,
      filteredImageBlob: null,
      positionIndex,
      decorations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const id = await specimenStore.addSpecimen(specimen)
    return id
  }

  async function updateSpecimen(id: number, updates: Partial<Specimen>): Promise<void> {
    await specimenStore.updateSpecimen(id, updates)
  }

  async function removeSpecimen(id: number): Promise<void> {
    await specimenStore.deleteSpecimen(id)
    imageDataURLs.value.delete(id)
    filteredImageDataURLs.value.delete(id)
  }

  function getSpecimenById(id: number): Specimen | undefined {
    return specimens.value.find((s) => s.id === id)
  }

  function setCurrentSpecimen(specimen: Specimen | null): void {
    specimenStore.setCurrentSpecimen(specimen)
  }

  async function reorderSpecimens(orderedSpecimens: Specimen[]): Promise<void> {
    const ids = orderedSpecimens.map((s) => s.id!).filter((id): id is number => id !== undefined)
    await specimenStore.reorderSpecimens(ids)
  }

  async function getSpecimenImageURL(specimen: Specimen): Promise<string | null> {
    if (specimen.id !== undefined && imageDataURLs.value.has(specimen.id)) {
      return imageDataURLs.value.get(specimen.id)!
    }

    const dataURL = await blobToDataURL(specimen.imageBlob)
    if (dataURL && specimen.id !== undefined) {
      imageDataURLs.value.set(specimen.id, dataURL)
    }
    return dataURL
  }

  async function getSpecimenFilteredImageURL(specimen: Specimen): Promise<string | null> {
    if (specimen.id !== undefined && filteredImageDataURLs.value.has(specimen.id)) {
      return filteredImageDataURLs.value.get(specimen.id)!
    }

    const dataURL = await blobToDataURL(specimen.filteredImageBlob)
    if (dataURL && specimen.id !== undefined) {
      filteredImageDataURLs.value.set(specimen.id, dataURL)
    }
    return dataURL
  }

  onMounted(async () => {
    await loadSpecimens()
  })

  return {
    loading,
    error,
    specimens,
    currentSpecimen,
    loadSpecimens,
    loadSpecimenById,
    createSpecimen,
    updateSpecimen,
    removeSpecimen,
    getSpecimenById,
    setCurrentSpecimen,
    reorderSpecimens,
    blobToDataURL,
    getSpecimenImageURL,
    getSpecimenFilteredImageURL,
  }
}
