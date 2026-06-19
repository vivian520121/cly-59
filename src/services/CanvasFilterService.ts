export type FilterType = 'pressedFlower' | 'agedPaper' | 'none'

export interface ColorShift {
  r: number
  g: number
  b: number
}

export interface FilterStep {
  name: string
  params: Record<string, unknown>
}

export interface FilterOptions {
  intensity: number
  desaturation: number
  brightness: number
  contrast: number
  noiseAmount: number
  vignetteStrength: number
  colorShift: ColorShift
  blendMode: GlobalCompositeOperation
  blendOpacity: number
}

export type FilterFn = (imageData: ImageData, options?: Partial<FilterOptions>) => ImageData

export class FilterPipeline {
  private steps: FilterFn[] = []

  add(filter: FilterFn): FilterPipeline {
    this.steps.push(filter)
    return this
  }

  apply(imageData: ImageData, options?: Partial<FilterOptions>): ImageData {
    let result = imageData
    for (const step of this.steps) {
      result = step(result, options)
    }
    return result
  }

  clear(): void {
    this.steps = []
  }

  getSteps(): FilterFn[] {
    return [...this.steps]
  }
}

export class CanvasFilterService {
  private static paperTextureCache: ImageData | null = null

  static desaturate(imageData: ImageData, amount: number = 0.5): ImageData {
    const data = imageData.data
    const clampedAmount = Math.max(0, Math.min(1, amount))

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const gray = 0.299 * r + 0.587 * g + 0.114 * b

      data[i] = Math.round(r + (gray - r) * clampedAmount)
      data[i + 1] = Math.round(g + (gray - g) * clampedAmount)
      data[i + 2] = Math.round(b + (gray - b) * clampedAmount)
    }

    return imageData
  }

  static colorShift(imageData: ImageData, shift: ColorShift): ImageData {
    const data = imageData.data
    const { r: dr, g: dg, b: db } = shift

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + dr))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + dg))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + db))
    }

    return imageData
  }

  static adjustBrightness(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data
    const delta = Math.round(amount * 255)

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + delta))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + delta))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + delta))
    }

    return imageData
  }

  static adjustContrast(imageData: ImageData, amount: number): ImageData {
    const data = imageData.data
    const factor = (259 * (amount * 255 + 255)) / (255 * (259 - amount * 255))

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128))
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128))
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128))
    }

    return imageData
  }

  static addNoise(imageData: ImageData, amount: number = 0.08): ImageData {
    const data = imageData.data
    const noiseRange = amount * 255

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * noiseRange
      data[i] = Math.max(0, Math.min(255, data[i] + noise))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
    }

    return imageData
  }

  static applyVignette(
    imageData: ImageData,
    strength: number = 0.3,
    radius: number = 0.8
  ): ImageData {
    const { width, height, data } = imageData
    const centerX = width / 2
    const centerY = height / 2
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY) * radius

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > maxDistance) {
          const vignetteFactor = Math.min(
            1,
            strength * ((distance - maxDistance) / (maxDistance * (1 / radius - 1)))
          )
          data[idx] = Math.round(data[idx] * (1 - vignetteFactor))
          data[idx + 1] = Math.round(data[idx + 1] * (1 - vignetteFactor))
          data[idx + 2] = Math.round(data[idx + 2] * (1 - vignetteFactor))
        }
      }
    }

    return imageData
  }

  static blendTexture(
    imageData: ImageData,
    texture: ImageData,
    mode: GlobalCompositeOperation = 'multiply',
    opacity: number = 0.6
  ): ImageData {
    const { data } = imageData
    const textureData = texture.data

    for (let i = 0; i < data.length; i += 4) {
      const srcR = data[i]
      const srcG = data[i + 1]
      const srcB = data[i + 2]

      const texR = textureData[i % textureData.length]
      const texG = textureData[(i + 1) % textureData.length]
      const texB = textureData[(i + 2) % textureData.length]

      let outR: number, outG: number, outB: number

      switch (mode) {
        case 'multiply':
          outR = (srcR * texR) / 255
          outG = (srcG * texG) / 255
          outB = (srcB * texB) / 255
          break
        case 'screen':
          outR = 255 - ((255 - srcR) * (255 - texR)) / 255
          outG = 255 - ((255 - srcG) * (255 - texG)) / 255
          outB = 255 - ((255 - srcB) * (255 - texB)) / 255
          break
        case 'overlay':
          outR = srcR < 128 ? (2 * srcR * texR) / 255 : 255 - (2 * (255 - srcR) * (255 - texR)) / 255
          outG = srcG < 128 ? (2 * srcG * texG) / 255 : 255 - (2 * (255 - srcG) * (255 - texG)) / 255
          outB = srcB < 128 ? (2 * srcB * texB) / 255 : 255 - (2 * (255 - srcB) * (255 - texB)) / 255
          break
        default:
          outR = texR
          outG = texG
          outB = texB
      }

      data[i] = Math.round(srcR + (outR - srcR) * opacity)
      data[i + 1] = Math.round(srcG + (outG - srcG) * opacity)
      data[i + 2] = Math.round(srcB + (outB - srcB) * opacity)
    }

    return imageData
  }

  static generatePaperTexture(
    width: number = 512,
    height: number = 512,
    baseColor: ColorShift = { r: 210, g: 185, b: 145 }
  ): ImageData {
    if (this.paperTextureCache && this.paperTextureCache.width === width && this.paperTextureCache.height === height) {
      return this.cloneImageData(this.paperTextureCache)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4

        const noise1 = (Math.sin(x * 0.1) + Math.cos(y * 0.15)) * 8
        const noise2 = (Math.random() - 0.5) * 30
        const fiberNoise = Math.sin(x * 0.05 + y * 0.08) * 12

        let variation = noise1 + noise2 + fiberNoise

        if (Math.random() < 0.02) {
          variation -= 20 + Math.random() * 30
        }

        if (Math.random() < 0.01) {
          variation += 10 + Math.random() * 15
        }

        data[idx] = Math.max(0, Math.min(255, baseColor.r + variation))
        data[idx + 1] = Math.max(0, Math.min(255, baseColor.g + variation * 0.9))
        data[idx + 2] = Math.max(0, Math.min(255, baseColor.b + variation * 0.7))
        data[idx + 3] = 255
      }
    }

    this.addCreaseShadows(imageData)

    this.paperTextureCache = this.cloneImageData(imageData)
    return imageData
  }

  private static addCreaseShadows(imageData: ImageData): void {
    const { width, height, data } = imageData
    const creaseCount = 3 + Math.floor(Math.random() * 3)

    for (let c = 0; c < creaseCount; c++) {
      const isHorizontal = Math.random() > 0.5
      const position = Math.random() * (isHorizontal ? height : width)
      const width_ = 2 + Math.random() * 4
      const depth = 15 + Math.random() * 25

      if (isHorizontal) {
        const y = Math.floor(position)
        for (let x = 0; x < width; x++) {
          const offset = Math.sin(x * 0.02 + c) * 2
          const cy = Math.floor(y + offset)
          for (let dy = -Math.ceil(width_); dy <= Math.ceil(width_); dy++) {
            const ty = cy + dy
            if (ty >= 0 && ty < height) {
              const idx = (ty * width + x) * 4
              const dist = Math.abs(dy)
              const factor = Math.max(0, 1 - dist / width_)
              const darken = depth * factor
              data[idx] = Math.max(0, data[idx] - darken)
              data[idx + 1] = Math.max(0, data[idx + 1] - darken * 0.95)
              data[idx + 2] = Math.max(0, data[idx + 2] - darken * 0.85)
            }
          }
        }
      } else {
        const x = Math.floor(position)
        for (let y = 0; y < height; y++) {
          const offset = Math.sin(y * 0.02 + c) * 2
          const cx = Math.floor(x + offset)
          for (let dx = -Math.ceil(width_); dx <= Math.ceil(width_); dx++) {
            const tx = cx + dx
            if (tx >= 0 && tx < width) {
              const idx = (y * width + tx) * 4
              const dist = Math.abs(dx)
              const factor = Math.max(0, 1 - dist / width_)
              const darken = depth * factor
              data[idx] = Math.max(0, data[idx] - darken)
              data[idx + 1] = Math.max(0, data[idx + 1] - darken * 0.95)
              data[idx + 2] = Math.max(0, data[idx + 2] - darken * 0.85)
            }
          }
        }
      }
    }
  }

  static applyWarmTones(imageData: ImageData, highlightBoost: number = 0.15): ImageData {
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b

      if (luminance > 180) {
        const boost = (luminance - 180) / 75 * highlightBoost * 255
        data[i] = Math.min(255, r + boost * 0.8)
        data[i + 1] = Math.min(255, g + boost * 0.5)
        data[i + 2] = Math.min(255, b - boost * 0.3)
      } else if (luminance < 80) {
        const darken = (80 - luminance) / 80 * 15
        data[i] = Math.max(0, r - darken * 0.3)
        data[i + 1] = Math.max(0, g - darken * 0.6)
        data[i + 2] = Math.max(0, b - darken * 0.9)
      }
    }

    return imageData
  }

  static PressedFlowerFilter(imageData: ImageData, options?: Partial<FilterOptions>): ImageData {
    const opts: FilterOptions = {
      intensity: 1,
      desaturation: 0.5,
      brightness: -0.05,
      contrast: 0,
      noiseAmount: 0.08,
      vignetteStrength: 0.3,
      colorShift: { r: -10, g: 5, b: -15 },
      blendMode: 'multiply',
      blendOpacity: 0.6,
      ...options
    }

    const pipeline = new FilterPipeline()

    pipeline.add((img) => this.desaturate(img, opts.desaturation * opts.intensity))
    pipeline.add((img) => this.colorShift(img, {
      r: opts.colorShift.r * opts.intensity,
      g: opts.colorShift.g * opts.intensity,
      b: opts.colorShift.b * opts.intensity
    }))
    pipeline.add((img) => this.adjustBrightness(img, opts.brightness * opts.intensity))
    pipeline.add((img) => this.addNoise(img, opts.noiseAmount * opts.intensity))
    pipeline.add((img) => this.applyVignette(img, opts.vignetteStrength * opts.intensity, 0.8))

    return pipeline.apply(imageData, opts)
  }

  static AgedPaperFilter(imageData: ImageData, options?: Partial<FilterOptions>): ImageData {
    const opts: FilterOptions = {
      intensity: 1,
      desaturation: 0.2,
      brightness: 0,
      contrast: -0.15,
      noiseAmount: 0.03,
      vignetteStrength: 0.2,
      colorShift: { r: 0, g: 0, b: 0 },
      blendMode: 'multiply',
      blendOpacity: 0.6,
      ...options
    }

    const { width, height } = imageData
    const paperTexture = this.generatePaperTexture(width, height)

    const pipeline = new FilterPipeline()

    pipeline.add((img) => this.desaturate(img, opts.desaturation * opts.intensity))
    pipeline.add((img) => this.adjustContrast(img, opts.contrast * opts.intensity))
    pipeline.add((img) => this.blendTexture(img, paperTexture, opts.blendMode, opts.blendOpacity * opts.intensity))
    pipeline.add((img) => this.applyWarmTones(img, 0.15 * opts.intensity))
    pipeline.add((img) => this.addNoise(img, opts.noiseAmount * opts.intensity))
    pipeline.add((img) => this.applyVignette(img, opts.vignetteStrength * opts.intensity, 0.85))

    return pipeline.apply(imageData, opts)
  }

  static applyFilter(
    imageData: ImageData,
    filterType: FilterType,
    options?: Partial<FilterOptions>
  ): ImageData {
    const cloned = this.cloneImageData(imageData)

    switch (filterType) {
      case 'pressedFlower':
        return this.PressedFlowerFilter(cloned, options)
      case 'agedPaper':
        return this.AgedPaperFilter(cloned, options)
      case 'none':
      default:
        return cloned
    }
  }

  static cloneImageData(imageData: ImageData): ImageData {
    const cloned = new ImageData(imageData.width, imageData.height)
    cloned.data.set(imageData.data)
    return cloned
  }

  static createPipeline(): FilterPipeline {
    return new FilterPipeline()
  }

  static clearTextureCache(): void {
    this.paperTextureCache = null
  }
}

export const PressedFlowerFilter = CanvasFilterService.PressedFlowerFilter.bind(CanvasFilterService)
export const AgedPaperFilter = CanvasFilterService.AgedPaperFilter.bind(CanvasFilterService)
export const applyFilter = CanvasFilterService.applyFilter.bind(CanvasFilterService)
export const desaturate = CanvasFilterService.desaturate.bind(CanvasFilterService)
export const colorShift = CanvasFilterService.colorShift.bind(CanvasFilterService)
export const adjustBrightness = CanvasFilterService.adjustBrightness.bind(CanvasFilterService)
export const adjustContrast = CanvasFilterService.adjustContrast.bind(CanvasFilterService)
export const addNoise = CanvasFilterService.addNoise.bind(CanvasFilterService)
export const applyVignette = CanvasFilterService.applyVignette.bind(CanvasFilterService)
export const blendTexture = CanvasFilterService.blendTexture.bind(CanvasFilterService)
export const generatePaperTexture = CanvasFilterService.generatePaperTexture.bind(CanvasFilterService)
export const createPipeline = CanvasFilterService.createPipeline.bind(CanvasFilterService)
