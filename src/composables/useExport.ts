import { ref, reactive } from 'vue'
import {
  ExportService,
  type ExportOptions,
} from '@/services/ExportService'
import type { Specimen } from '@/types/specimen'

export interface ExportState {
  exporting: boolean
  progress: number
  error: Error | null
}

export function useExport() {
  const exporting = ref(false)
  const progress = ref(0)
  const error = ref<Error | null>(null)

  const state = reactive<ExportState>({
    exporting: false,
    progress: 0,
    error: null,
  })

  const resetState = () => {
    state.exporting = false
    state.progress = 0
    state.error = null
    exporting.value = false
    progress.value = 0
    error.value = null
  }

  const updateProgress = (percent: number) => {
    state.progress = percent
    progress.value = percent
  }

  const handleError = (e: unknown) => {
    const err = e instanceof Error ? e : new Error('导出失败')
    state.error = err
    error.value = err
    state.exporting = false
    exporting.value = false
    throw err
  }

  async function exportLongImage(specimen: Specimen): Promise<Blob> {
    resetState()
    state.exporting = true
    exporting.value = true
    updateProgress(10)

    try {
      updateProgress(30)
      const blob = await ExportService.exportSpecimenLongImage(specimen)
      updateProgress(100)
      return blob
    } catch (e) {
      handleError(e)
      throw e
    } finally {
      state.exporting = false
      exporting.value = false
    }
  }

  async function exportLongImageAndDownload(specimen: Specimen): Promise<void> {
    const blob = await exportLongImage(specimen)
    const filename = `${specimen.name}_${Date.now()}.png`
    ExportService.downloadBlob(blob, filename)
  }

  async function exportAlbumPDF(
    specimens: Specimen[],
    options: ExportOptions
  ): Promise<Blob> {
    if (specimens.length === 0) {
      throw new Error('没有可导出的标本')
    }

    resetState()
    state.exporting = true
    exporting.value = true
    updateProgress(5)

    try {
      const blob = await ExportService.exportAlbumPDF(
        specimens,
        options,
        updateProgress
      )
      return blob
    } catch (e) {
      handleError(e)
      throw e
    } finally {
      state.exporting = false
      exporting.value = false
    }
  }

  async function exportAlbumPDFAndDownload(
    specimens: Specimen[],
    options: ExportOptions
  ): Promise<void> {
    const blob = await exportAlbumPDF(specimens, options)
    const safeTitle = options.title || '植物标本册'
    const filename = `${safeTitle}_${Date.now()}.pdf`
    ExportService.downloadBlob(blob, filename)
  }

  async function generatePreviewCanvas(
    specimen: Specimen,
    width: number = 400
  ): Promise<HTMLCanvasElement> {
    return ExportService.renderSpecimenToCanvas(specimen, width)
  }

  async function generatePreviewDataURL(
    specimen: Specimen,
    width: number = 400
  ): Promise<string> {
    const canvas = await generatePreviewCanvas(specimen, width)
    return canvas.toDataURL('image/png', 0.9)
  }

  async function generateCoverPreview(
    options: ExportOptions,
    width: number = 300
  ): Promise<string> {
    const canvas = document.createElement('canvas')
    const height = (width * Math.sqrt(2)) / 1
    canvas.width = width
    canvas.height = height

    ExportService.addPaperBackground(canvas, options.paperStyle)

    const ctx = canvas.getContext('2d')!
    const centerX = width / 2
    const centerY = height / 2

    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.font = `${width * 0.2}px 'Ma Shan Zheng', cursive`
    ctx.fillStyle = '#8b6914'
    ctx.textAlign = 'center'
    ctx.fillText('❀', centerX, centerY - height * 0.05)
    ctx.restore()

    ctx.font = `${width * 0.1}px 'Ma Shan Zheng', cursive`
    ctx.fillStyle = '#3d2c1e'
    ctx.textAlign = 'center'
    ctx.fillText(options.title || '植物标本册', centerX, centerY + height * 0.02)

    ctx.font = `${width * 0.04}px 'Noto Serif SC', serif`
    ctx.fillStyle = '#7a6552'
    ctx.fillText('HERBARIUM', centerX, centerY + height * 0.08)

    ctx.beginPath()
    ctx.moveTo(centerX - width * 0.15, centerY + height * 0.12)
    ctx.lineTo(centerX + width * 0.15, centerY + height * 0.12)
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()

    return canvas.toDataURL('image/png', 0.9)
  }

  function clearError() {
    state.error = null
    error.value = null
  }

  return {
    exporting,
    progress,
    error,
    state,
    exportLongImage,
    exportLongImageAndDownload,
    exportAlbumPDF,
    exportAlbumPDFAndDownload,
    generatePreviewCanvas,
    generatePreviewDataURL,
    generateCoverPreview,
    clearError,
    resetState,
  }
}

export type UseExportReturn = ReturnType<typeof useExport>
