import jsPDF from 'jspdf'
import type { Specimen } from '@/types/specimen'
import type { DecorationItem } from '@/types/decoration'
import { CanvasFilterService } from './CanvasFilterService'

export type PaperStyle = 'kraft' | 'white' | 'vintage'

export interface ExportOptions {
  title: string
  paperStyle: PaperStyle
  includeIndex: boolean
}

export interface PaperColor {
  r: number
  g: number
  b: number
}

const PAPER_COLORS: Record<PaperStyle, PaperColor> = {
  kraft: { r: 210, g: 185, b: 145 },
  white: { r: 250, g: 248, b: 240 },
  vintage: { r: 235, g: 215, b: 180 },
}

const FONT_HANDWRITING = "'Ma Shan Zheng', cursive"
const FONT_SERIF = "'Noto Serif SC', 'Songti SC', serif"

const seasonMap: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

const plantTypeMap: Record<string, string> = {
  herbaceous: '草本',
  woody: '木本',
}

const environmentMap: Record<string, string> = {
  mountain: '山地',
  courtyard: '庭院',
  other: '其他',
}

export class ExportService {
  static async exportSpecimenLongImage(specimen: Specimen): Promise<Blob> {
    const width = 800
    const canvas = await this.renderSpecimenToCanvas(specimen, width)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create image blob'))
          }
        },
        'image/png',
        0.95
      )
    })
  }

  static async exportAlbumPDF(
    specimens: Specimen[],
    options: ExportOptions,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    const totalSteps = specimens.length + (options.includeIndex ? 2 : 1)
    let currentStep = 0

    const updateProgress = () => {
      currentStep++
      const percent = Math.round((currentStep / totalSteps) * 100)
      onProgress?.(percent)
    }

    await this.renderCoverPage(pdf, options, pageWidth, pageHeight)
    updateProgress()

    if (options.includeIndex && specimens.length > 5) {
      pdf.addPage()
      await this.renderTableOfContents(pdf, specimens, pageWidth, pageHeight, margin)
      updateProgress()
    }

    for (let i = 0; i < specimens.length; i++) {
      const specimen = specimens[i]
      pdf.addPage()
      await this.renderSpecimenPage(
        pdf,
        specimen,
        i + 1,
        specimens.length,
        options,
        pageWidth,
        pageHeight,
        margin,
        contentWidth
      )
      updateProgress()
    }

    return pdf.output('blob')
  }

  static async renderSpecimenToCanvas(specimen: Specimen, width: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    const imageHeight = width * 0.75
    const infoSectionHeight = 400
    const height = imageHeight + infoSectionHeight + 80

    canvas.width = width
    canvas.height = height

    this.addPaperBackground(canvas, 'vintage')

    const padding = 40

    if (specimen.filteredImageBlob) {
      const img = await this.blobToImage(specimen.filteredImageBlob)
      const imgAspect = img.width / img.height
      let drawWidth = width - padding * 2
      let drawHeight = drawWidth / imgAspect

      if (drawHeight > imageHeight - 40) {
        drawHeight = imageHeight - 40
        drawWidth = drawHeight * imgAspect
      }

      const imgX = (width - drawWidth) / 2
      const imgY = padding + 20

      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
      ctx.shadowBlur = 15
      ctx.shadowOffsetX = 5
      ctx.shadowOffsetY = 5
      ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight)
      ctx.restore()

      this.drawTapeCorners(ctx, imgX, imgY, drawWidth, drawHeight)

      if (specimen.decorations && specimen.decorations.length > 0) {
        await this.drawDecorations(ctx, specimen.decorations, imgX, imgY, drawWidth, drawHeight)
      }
    }

    const infoY = imageHeight + 60
    this.drawInfoSection(ctx, specimen, padding, infoY, width - padding * 2)

    this.drawSealStamp(ctx, width - 100, height - 100)

    return canvas
  }

  static async drawDecorations(
    ctx: CanvasRenderingContext2D,
    decorations: DecorationItem[],
    imgX: number,
    imgY: number,
    drawWidth: number,
    drawHeight: number
  ): Promise<void> {
    const canvasWidth = 600
    const canvasHeight = 450
    const imgAspect = drawWidth / drawHeight
    const canvasAspect = canvasWidth / canvasHeight

    let imgWidthInCanvas: number
    let imgHeightInCanvas: number

    if (imgAspect > canvasAspect) {
      imgWidthInCanvas = canvasWidth
      imgHeightInCanvas = canvasWidth / imgAspect
    } else {
      imgHeightInCanvas = canvasHeight
      imgWidthInCanvas = canvasHeight * imgAspect
    }

    const imgXInCanvas = (canvasWidth - imgWidthInCanvas) / 2
    const imgYInCanvas = (canvasHeight - imgHeightInCanvas) / 2
    const scale = drawWidth / imgWidthInCanvas

    const sortedDecorations = [...decorations].sort((a, b) => a.zIndex - b.zIndex)

    for (const decoration of sortedDecorations) {
      const img = await this.loadImage(decoration.src)

      const relX = decoration.x - imgXInCanvas
      const relY = decoration.y - imgYInCanvas

      const x = imgX + relX * scale
      const y = imgY + relY * scale
      const w = decoration.width * scale
      const h = decoration.height * scale

      const centerX = x + w / 2
      const centerY = y + h / 2

      ctx.save()
      ctx.globalAlpha = decoration.opacity
      ctx.translate(centerX, centerY)
      ctx.rotate((decoration.rotation * Math.PI) / 180)
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
      ctx.restore()
    }
  }

  static async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      img.src = src
    })
  }

  static addPaperBackground(canvas: HTMLCanvasElement, style: PaperStyle = 'vintage'): void {
    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas
    const color = PAPER_COLORS[style]

    const paperTexture = CanvasFilterService.generatePaperTexture(width, height, color)
    ctx.putImageData(paperTexture, 0, 0)

    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) / 1.5
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(139, 105, 20, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(10, 10, width - 20, height - 20)

    ctx.strokeStyle = 'rgba(139, 105, 20, 0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(15, 15, width - 30, height - 30)
  }

  static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number {
    const lines: string[] = []
    let currentLine = ''

    for (const char of text) {
      const testLine = currentLine + char
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight)
    })

    return y + (lines.length - 1) * lineHeight
  }

  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  private static async blobToImage(blob: Blob): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(blob)
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      img.src = url
    })
  }

  private static drawTapeCorners(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const tapeWidth = 60
    const tapeHeight = 25

    const drawTape = (tx: number, ty: number, rotation: number) => {
      ctx.save()
      ctx.translate(tx, ty)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.globalAlpha = 0.7
      ctx.fillStyle = '#d4a853'
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight)
      ctx.strokeStyle = 'rgba(139, 105, 20, 0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight)
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#8b6914'
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(
          -tapeWidth / 2 + 5 + i * 12,
          -tapeHeight / 2 + 5,
          2,
          tapeHeight - 10
        )
      }
      ctx.restore()
    }

    drawTape(x + 20, y + 15, -8)
    drawTape(x + width - 20, y + 15, 8)
    drawTape(x + 20, y + height - 15, 8)
    drawTape(x + width - 20, y + height - 15, -8)
  }

  private static drawInfoSection(
    ctx: CanvasRenderingContext2D,
    specimen: Specimen,
    x: number,
    y: number,
    width: number
  ): void {
    ctx.font = `36px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#3d2c1e'
    ctx.textAlign = 'center'
    ctx.fillText(specimen.name, x + width / 2, y)

    ctx.font = `16px ${FONT_SERIF}`
    ctx.fillStyle = '#7a6552'
    const seasonText = seasonMap[specimen.season] || specimen.season
    const plantTypeText = plantTypeMap[specimen.plantType] || specimen.plantType
    const envText = environmentMap[specimen.environment] || specimen.environment
    const metaText = `${plantTypeText} · ${seasonText} · ${envText}`
    ctx.fillText(metaText, x + width / 2, y + 35)

    ctx.beginPath()
    ctx.moveTo(x + width / 2 - 80, y + 55)
    ctx.lineTo(x + width / 2 + 80, y + 55)
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.font = `18px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#8b6914'
    ctx.fillText('采集地点', x, y + 95)
    ctx.font = `16px ${FONT_SERIF}`
    ctx.fillStyle = '#3d2c1e'
    ctx.fillText(specimen.location || '—', x, y + 120)

    ctx.font = `18px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#8b6914'
    ctx.fillText('花期', x, y + 155)
    ctx.font = `16px ${FONT_SERIF}`
    ctx.fillStyle = '#3d2c1e'
    const bloomText = specimen.bloomPeriod.length > 0 ? specimen.bloomPeriod.join('、') : '—'
    ctx.fillText(bloomText, x, y + 180)

    ctx.font = `18px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#8b6914'
    ctx.fillText('采集日期', x, y + 215)
    ctx.font = `16px ${FONT_SERIF}`
    ctx.fillStyle = '#3d2c1e'
    const dateText = specimen.createdAt
      ? new Date(specimen.createdAt).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—'
    ctx.fillText(dateText, x, y + 240)

    ctx.font = `18px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#8b6914'
    ctx.fillText('备注', x, y + 275)
    ctx.font = `15px ${FONT_SERIF}`
    ctx.fillStyle = '#3d2c1e'
    this.wrapText(ctx, specimen.notes || '—', x, y + 300, width, 24)
  }

  private static drawSealStamp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((Math.random() * 10 - 5) * (Math.PI / 180))

    ctx.globalAlpha = 0.8
    ctx.strokeStyle = '#B5533F'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.rect(-25, -25, 50, 50)
    ctx.stroke()

    ctx.beginPath()
    ctx.rect(-20, -20, 40, 40)
    ctx.stroke()

    ctx.font = `bold 16px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#B5533F'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('珍', 0, -8)
    ctx.fillText('藏', 0, 12)

    ctx.restore()
  }

  private static async renderCoverPage(
    pdf: jsPDF,
    options: ExportOptions,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const canvas = document.createElement('canvas')
    canvas.width = pageWidth * 3.78
    canvas.height = pageHeight * 3.78
    this.addPaperBackground(canvas, options.paperStyle)

    const ctx = canvas.getContext('2d')!
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.font = `120px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#8b6914'
    ctx.textAlign = 'center'
    ctx.fillText('❀', centerX, centerY - 50)
    ctx.restore()

    ctx.font = `64px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#3d2c1e'
    ctx.textAlign = 'center'
    ctx.fillText(options.title || '植物标本册', centerX, centerY + 20)

    ctx.font = `24px ${FONT_SERIF}`
    ctx.fillStyle = '#7a6552'
    ctx.fillText('HERBARIUM COLLECTION', centerX, centerY + 70)

    ctx.beginPath()
    ctx.moveTo(centerX - 120, centerY + 100)
    ctx.lineTo(centerX + 120, centerY + 100)
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.4)'
    ctx.lineWidth = 2
    ctx.stroke()

    const dateStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    ctx.font = `20px ${FONT_SERIF}`
    ctx.fillStyle = '#7a6552'
    ctx.fillText(dateStr, centerX, centerY + 140)

    this.drawDecorativeBorder(ctx, canvas.width, canvas.height)

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
  }

  private static async renderTableOfContents(
    pdf: jsPDF,
    specimens: Specimen[],
    pageWidth: number,
    pageHeight: number,
    margin: number
  ): Promise<void> {
    const canvas = document.createElement('canvas')
    canvas.width = pageWidth * 3.78
    canvas.height = pageHeight * 3.78
    this.addPaperBackground(canvas, 'white')

    const ctx = canvas.getContext('2d')!
    const padding = margin * 3.78

    ctx.font = `36px ${FONT_HANDWRITING}`
    ctx.fillStyle = '#3d2c1e'
    ctx.textAlign = 'center'
    ctx.fillText('目 录', canvas.width / 2, padding + 40)

    ctx.beginPath()
    ctx.moveTo(canvas.width / 2 - 60, padding + 65)
    ctx.lineTo(canvas.width / 2 + 60, padding + 65)
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.font = `18px ${FONT_SERIF}`
    ctx.textAlign = 'left'
    const startY = padding + 100
    const lineHeight = 35
    const contentWidth = canvas.width - padding * 2
    const pageNumOffset = contentWidth - 40

    specimens.slice(0, 15).forEach((specimen, index) => {
      const y = startY + index * lineHeight
      const pageNum = index + 2

      ctx.fillStyle = '#3d2c1e'
      ctx.fillText(`${index + 1}. ${specimen.name}`, padding, y)

      const nameWidth = ctx.measureText(`${index + 1}. ${specimen.name}`).width
      const dotStartX = padding + nameWidth + 10
      const dotEndX = padding + pageNumOffset

      ctx.fillStyle = 'rgba(139, 105, 20, 0.4)'
      for (let dx = dotStartX; dx < dotEndX; dx += 8) {
        ctx.fillRect(dx, y - 4, 4, 1)
      }

      ctx.fillStyle = '#7a6552'
      ctx.textAlign = 'right'
      ctx.fillText(String(pageNum), padding + contentWidth, y)
      ctx.textAlign = 'left'
    })

    if (specimens.length > 15) {
      ctx.font = `16px ${FONT_SERIF}`
      ctx.fillStyle = '#7a6552'
      ctx.textAlign = 'center'
      ctx.fillText(`... 还有 ${specimens.length - 15} 项标本`, canvas.width / 2, startY + 16 * lineHeight)
    }

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
  }

  private static async renderSpecimenPage(
    pdf: jsPDF,
    specimen: Specimen,
    currentPage: number,
    totalPages: number,
    options: ExportOptions,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const specimenCanvas = await this.renderSpecimenToCanvas(specimen, 550)
    const specimenImg = specimenCanvas.toDataURL('image/png')

    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = pageWidth * 3.78
    bgCanvas.height = pageHeight * 3.78
    this.addPaperBackground(bgCanvas, options.paperStyle)

    this.drawDecorativeCorner(bgCanvas.getContext('2d')!, 20, 20, 1)
    this.drawDecorativeCorner(
      bgCanvas.getContext('2d')!,
      bgCanvas.width - 20,
      20,
      -1
    )
    this.drawDecorativeCorner(
      bgCanvas.getContext('2d')!,
      20,
      bgCanvas.height - 20,
      -1
    )
    this.drawDecorativeCorner(
      bgCanvas.getContext('2d')!,
      bgCanvas.width - 20,
      bgCanvas.height - 20,
      1
    )

    const bgImg = bgCanvas.toDataURL('image/png')
    pdf.addImage(bgImg, 'PNG', 0, 0, pageWidth, pageHeight)

    const imgWidth = contentWidth
    const imgHeight = (imgWidth * specimenCanvas.height) / specimenCanvas.width
    const imgX = margin
    const imgY = margin + 10
    const maxImgHeight = pageHeight - margin * 2 - 20

    let finalImgHeight = imgHeight
    if (imgHeight > maxImgHeight) {
      finalImgHeight = maxImgHeight
    }

    pdf.addImage(specimenImg, 'PNG', imgX, imgY, imgWidth, finalImgHeight)

    pdf.setFontSize(10)
    pdf.setTextColor(122, 101, 82)
    pdf.text(
      `第 ${currentPage} 页 / 共 ${totalPages + (options.includeIndex ? 2 : 1)} 页`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  private static drawDecorativeBorder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const padding = 30

    ctx.strokeStyle = 'rgba(139, 105, 20, 0.3)'
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding + 30, padding)
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, padding + 30)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(width - padding, padding)
    ctx.lineTo(width - padding - 30, padding)
    ctx.moveTo(width - padding, padding)
    ctx.lineTo(width - padding, padding + 30)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(padding + 30, height - padding)
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(padding, height - padding - 30)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(width - padding, height - padding)
    ctx.lineTo(width - padding - 30, height - padding)
    ctx.moveTo(width - padding, height - padding)
    ctx.lineTo(width - padding, height - padding - 30)
    ctx.stroke()
  }

  private static drawDecorativeCorner(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    direction: number
  ): void {
    const size = 40
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(direction, direction)

    ctx.strokeStyle = 'rgba(139, 105, 20, 0.4)'
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(size, 0)
    ctx.moveTo(0, 0)
    ctx.lineTo(0, size)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(8, 0)
    ctx.lineTo(8, 8)
    ctx.lineTo(0, 8)
    ctx.stroke()

    ctx.restore()
  }
}

export const exportSpecimenLongImage = ExportService.exportSpecimenLongImage.bind(ExportService)
export const exportAlbumPDF = ExportService.exportAlbumPDF.bind(ExportService)
export const renderSpecimenToCanvas = ExportService.renderSpecimenToCanvas.bind(ExportService)
export const addPaperBackground = ExportService.addPaperBackground.bind(ExportService)
export const wrapText = ExportService.wrapText.bind(ExportService)
export const downloadBlob = ExportService.downloadBlob.bind(ExportService)
