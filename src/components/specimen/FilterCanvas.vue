<template>
  <div class="filter-canvas">
    <div class="canvas-wrapper" :class="{ 'is-loading': isProcessing }">
      <canvas
        ref="previewCanvasRef"
        class="preview-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>

      <div v-if="isProcessing" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span class="loading-text">{{ progress.stage || '处理中...' }}</span>
        <div v-if="progress.percent > 0" class="progress-bar">
          <div class="progress-fill" :style="{ width: progress.percent + '%' }"></div>
        </div>
      </div>

      <div v-if="!hasImage" class="no-image-placeholder">
        <span class="placeholder-icon">📷</span>
        <span class="placeholder-text">请先上传图片</span>
      </div>
    </div>

    <div class="filter-controls">
      <div class="control-group">
        <label class="control-label">滤镜效果</label>
        <div class="filter-type-buttons">
          <button
            v-for="type in filterTypes"
            :key="type.value"
            class="filter-btn"
            :class="{ 'is-active': filterType === type.value }"
            :disabled="!hasImage || isProcessing"
            @click="onFilterTypeChange(type.value)"
          >
            <span class="btn-icon">{{ type.icon }}</span>
            <span class="btn-text">{{ type.label }}</span>
          </button>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">
          滤镜强度
          <span class="value-display">{{ Math.round(filterOptions.intensity! * 100) }}%</span>
        </label>
        <input
          type="range"
          class="intensity-slider"
          min="0"
          max="1"
          step="0.01"
          :value="filterOptions.intensity"
          :disabled="!hasImage || isProcessing"
          @input="onIntensityChange"
        />
      </div>

      <div class="control-group action-group">
        <button
          class="action-btn vintage-btn"
          :disabled="!hasImage || isProcessing"
          @click="applyVintagePreset"
        >
          <span class="btn-icon">✨</span>
          <span class="btn-text">一键复古</span>
        </button>

        <button
          class="action-btn apply-btn"
          :disabled="!hasImage || isProcessing"
          @click="applyAndEmit"
        >
          <span class="btn-icon">✓</span>
          <span class="btn-text">应用滤镜</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { FilterType } from '@/services/CanvasFilterService'
import { useCanvasFilter } from '@/composables/useCanvasFilter'

interface Props {
  initialImage?: Blob | null
}

interface Emits {
  (e: 'filterApplied', blob: Blob): void
}

const props = withDefaults(defineProps<Props>(), {
  initialImage: null
})

const emit = defineEmits<Emits>()

const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(600)
const canvasHeight = ref(450)

const {
  filterType,
  filterOptions,
  isProcessing,
  progress,
  hasImage,
  previewCanvas,
  loadImage,
  updatePreview,
  getFilteredBlob,
  getFilteredDataURL,
  setFilterType,
  setIntensity,
  resetFilterOptions
} = useCanvasFilter({
  previewMaxWidth: 800,
  previewMaxHeight: 600,
  outputQuality: 0.95
})

const filterTypes = [
  { value: 'none' as FilterType, label: '原图', icon: '🖼️' },
  { value: 'pressedFlower' as FilterType, label: '压花', icon: '🌸' },
  { value: 'agedPaper' as FilterType, label: '旧纸', icon: '📜' }
]

async function onFilterTypeChange(type: FilterType) {
  setFilterType(type)
  await updatePreview()
  renderPreview()
}

function onIntensityChange(e: Event) {
  const target = e.target as HTMLInputElement
  const value = parseFloat(target.value)
  setIntensity(value)
  updatePreview().then(renderPreview)
}

async function applyVintagePreset() {
  resetFilterOptions()
  setFilterType('agedPaper')
  setIntensity(1)
  await updatePreview()
  renderPreview()
}

async function applyAndEmit() {
  try {
    const blob = await getFilteredBlob()
    emit('filterApplied', blob)
  } catch (error) {
    console.error('Failed to apply filter:', error)
  }
}

function renderPreview() {
  if (!previewCanvasRef.value || !previewCanvas.value) return

  const ctx = previewCanvasRef.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, previewCanvasRef.value.width, previewCanvasRef.value.height)
  ctx.drawImage(previewCanvas.value, 0, 0)
}

function blobToFile(blob: Blob, filename: string = 'specimen.png'): File {
  return new File([blob], filename, { type: blob.type })
}

async function loadInitialImage() {
  if (props.initialImage) {
    try {
      const file = blobToFile(props.initialImage)
      await loadImage(file)
      await nextTick()
      await updatePreview()
      renderPreview()
    } catch (error) {
      console.error('Failed to load initial image:', error)
    }
  }
}

watch(
  () => props.initialImage,
  (newImage) => {
    if (newImage) {
      const file = blobToFile(newImage)
      loadImage(file).then(() => {
        updatePreview().then(renderPreview)
      })
    }
  }
)

defineExpose({
  getFilteredBlob,
  getFilteredDataURL
})

onMounted(() => {
  loadInitialImage()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.filter-canvas {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  max-width: 600px;
  margin: 0 auto;
  background-color: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  @include paper-texture(0.3);
  @include aged-paper-edge;
  @include shadow-paper(3);
  transition: all var(--transition-normal);

  &.is-loading {
    opacity: 0.7;
  }
}

.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background-color: rgba(250, 246, 237, 0.9);
  backdrop-filter: blur(4px);
  z-index: 10;

  :global([data-theme='forest']) & {
    background-color: rgba(26, 47, 26, 0.9);
  }
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border-color);
  border-top-color: var(--plant-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  @include serif-text(14px);
  color: var(--text-secondary);
}

.progress-bar {
  width: 200px;
  height: 6px;
  background-color: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--plant-primary);
  transition: width var(--transition-fast);
}

.no-image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);

  .placeholder-icon {
    font-size: 64px;
    opacity: 0.5;
  }

  .placeholder-text {
    @include serif-text(16px);
    opacity: 0.7;
  }
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  @include paper-texture(0.2);
  @include shadow-paper(2);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-label {
  @include serif-text(14px, 600);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .value-display {
    @include typewriter-text;
    color: var(--plant-primary);
  }
}

.filter-type-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-btn {
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background-color: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  @include not-selectable;

  &:hover:not(:disabled) {
    border-color: var(--plant-primary);
    transform: translateY(-2px);
    @include shadow-paper(2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.is-active {
    border-color: var(--plant-primary);
    background-color: var(--hover-bg);
    @include shadow-paper(2);
  }

  .btn-icon {
    font-size: 24px;
  }

  .btn-text {
    @include serif-text(13px);
    color: var(--text-primary);
  }
}

.intensity-slider {
  width: 100%;
  height: 8px;
  background-color: var(--border-color);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    background-color: var(--plant-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: transform var(--transition-fast);
    @include shadow-paper(2);

    &:hover {
      transform: scale(1.1);
    }
  }

  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    background-color: var(--plant-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    @include shadow-paper(2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.action-group {
  flex-direction: row;
  gap: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-serif);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  @include not-selectable;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 18px;
  }
}

.vintage-btn {
  background-color: var(--accent-gold);
  color: var(--text-inverse);
  @include shadow-paper(2);

  &:hover:not(:disabled) {
    @include shadow-paper(3);
  }
}

.apply-btn {
  background-color: var(--plant-primary);
  color: var(--text-inverse);
  @include shadow-paper(2);

  &:hover:not(:disabled) {
    @include shadow-paper(3);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
