<template>
  <div
    ref="canvasContainerRef"
    class="decoration-canvas"
    :class="{ 'is-dragging': isDragging, 'is-resizing': isResizing, 'is-rotating': isRotating }"
    @dragover.prevent="onDragOver"
    @drop="onDrop"
    @click="onCanvasClick"
    @keydown="onKeyDown"
    tabindex="0"
  >
    <div ref="canvasAreaRef" class="canvas-area" :style="canvasAreaStyle">
      <div v-if="specimenImageUrl" class="specimen-image-wrapper">
        <img
          :src="specimenImageUrl"
          alt="标本图片"
          class="specimen-image"
          @load="onSpecimenImageLoad"
        />
      </div>

      <div v-if="showGrid" class="grid-overlay">
        <div
          v-for="line in gridLines.horizontal"
          :key="'h' + line"
          class="grid-line horizontal"
          :style="{ top: line + 'px' }"
        ></div>
        <div
          v-for="line in gridLines.vertical"
          :key="'v' + line"
          class="grid-line vertical"
          :style="{ left: line + 'px' }"
        ></div>
      </div>

      <div
        v-for="decoration in sortedDecorations"
        :key="decoration.id"
        class="decoration-element"
        :class="{
          'is-selected': selectedId === decoration.id,
          'is-leaf': decoration.type === 'leaf'
        }"
        :style="getDecorationStyle(decoration)"
        @mousedown="onDecorationMouseDown($event, decoration)"
        @touchstart="onDecorationTouchStart($event, decoration)"
        @dblclick="onDecorationDoubleClick(decoration)"
      >
        <img
          :src="decoration.src"
          :alt="decoration.type"
          class="decoration-img"
          draggable="false"
        />

        <div
          v-if="selectedId === decoration.id"
          class="selection-frame"
        >
          <div
            v-for="handle in resizeHandles"
            :key="handle.name"
            class="resize-handle"
            :class="handle.name"
            :style="handle.style"
            @mousedown.stop="onResizeStart($event, decoration, handle.name)"
            @touchstart.stop="onResizeTouchStart($event, decoration, handle.name)"
          ></div>

          <div
            class="rotate-handle"
            @mousedown.stop="onRotateStart($event, decoration)"
            @touchstart.stop="onRotateTouchStart($event, decoration)"
          >
            <span class="rotate-icon">↻</span>
          </div>
        </div>
      </div>

      <div
        v-if="selectedDecoration && showGuides"
        class="alignment-guides"
      >
        <div
          v-if="guides.vertical"
          class="guide-line vertical"
          :style="{ left: guides.vertical + 'px' }"
        ></div>
        <div
          v-if="guides.horizontal"
          class="guide-line horizontal"
          :style="{ top: guides.horizontal + 'px' }"
        ></div>
      </div>
    </div>

    <div v-if="selectedDecoration" class="decoration-toolbar">
      <div class="toolbar-group">
        <button class="toolbar-btn" @click="bringForward" title="上移一层">⬆️</button>
        <button class="toolbar-btn" @click="sendBackward" title="下移一层">⬇️</button>
        <button class="toolbar-btn" @click="bringToFront" title="置于顶层">⏫</button>
        <button class="toolbar-btn" @click="sendToBack" title="置于底层">⏬</button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="toolbar-btn" @click="duplicateDecoration" title="复制">📋</button>
        <button class="toolbar-btn delete-btn" @click="deleteSelected" title="删除">🗑️</button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group opacity-control">
        <span class="control-label">透明度</span>
        <input
          type="range"
          class="opacity-slider"
          min="0.1"
          max="1"
          step="0.05"
          :value="selectedDecoration.opacity"
          @input="onOpacityChange"
        />
        <span class="opacity-value">{{ Math.round(selectedDecoration.opacity * 100) }}%</span>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ 'is-active': showGrid }"
          @click="showGrid = !showGrid"
          title="显示网格"
        >
          ⊞
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'is-active': snapToGrid }"
          @click="snapToGrid = !snapToGrid"
          title="吸附网格"
        >
          🧲
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { DecorationItem } from '@/types'
import {
  updateDecoration,
  deleteDecoration,
  bringForward as serviceBringForward,
  sendBackward as serviceSendBackward,
  bringToFront as serviceBringToFront,
  sendToBack as serviceSendToBack,
  duplicateDecoration as serviceDuplicateDecoration,
  createDecoration,
  type DecorationPreset
} from '@/services/DecorationService'

interface Props {
  specimenImage?: Blob | null
  decorations: DecorationItem[]
  canvasWidth?: number
  canvasHeight?: number
  gridSize?: number
}

interface Emits {
  (e: 'update:decorations', decorations: DecorationItem[]): void
  (e: 'decorationSelected', decoration: DecorationItem | null): void
}

const props = withDefaults(defineProps<Props>(), {
  specimenImage: null,
  canvasWidth: 600,
  canvasHeight: 450,
  gridSize: 20
})

const emit = defineEmits<Emits>()

const canvasContainerRef = ref<HTMLDivElement | null>(null)
const canvasAreaRef = ref<HTMLDivElement | null>(null)
const specimenImageUrl = ref<string | null>(null)
const specimenImageLoaded = ref(false)

const selectedId = ref<string | null>(null)
const showGrid = ref(false)
const snapToGrid = ref(false)
const showGuides = ref(true)

const isDragging = ref(false)
const isResizing = ref(false)
const isRotating = ref(false)

const dragStartPos = ref({ x: 0, y: 0 })
const dragStartDecoration = ref<DecorationItem | null>(null)
const activeHandle = ref<string | null>(null)
const rotationStartAngle = ref(0)
const initialRotation = ref(0)
const initialDistance = ref(0)
const initialSize = ref({ width: 0, height: 0 })

const gridLines = computed(() => {
  const horizontal: number[] = []
  const vertical: number[] = []
  for (let i = 0; i <= props.canvasWidth; i += props.gridSize) {
    vertical.push(i)
  }
  for (let i = 0; i <= props.canvasHeight; i += props.gridSize) {
    horizontal.push(i)
  }
  return { horizontal, vertical }
})

const guides = ref<{ vertical: number | null; horizontal: number | null }>({
  vertical: null,
  horizontal: null
})

const selectedDecoration = computed(() => {
  return props.decorations.find(d => d.id === selectedId.value) || null
})

const sortedDecorations = computed(() => {
  return [...props.decorations].sort((a, b) => a.zIndex - b.zIndex)
})

const canvasAreaStyle = computed(() => ({
  width: props.canvasWidth + 'px',
  height: props.canvasHeight + 'px'
}))

const resizeHandles = computed(() => [
  { name: 'nw', style: { top: '-6px', left: '-6px', cursor: 'nw-resize' } },
  { name: 'n', style: { top: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
  { name: 'ne', style: { top: '-6px', right: '-6px', cursor: 'ne-resize' } },
  { name: 'e', style: { top: '50%', right: '-6px', transform: 'translateY(-50%)', cursor: 'e-resize' } },
  { name: 'se', style: { bottom: '-6px', right: '-6px', cursor: 'se-resize' } },
  { name: 's', style: { bottom: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
  { name: 'sw', style: { bottom: '-6px', left: '-6px', cursor: 'sw-resize' } },
  { name: 'w', style: { top: '50%', left: '-6px', transform: 'translateY(-50%)', cursor: 'w-resize' } }
])

function getDecorationStyle(decoration: DecorationItem) {
  const isSelected = selectedId.value === decoration.id
  return {
    left: decoration.x + 'px',
    top: decoration.y + 'px',
    width: decoration.width + 'px',
    height: decoration.height + 'px',
    transform: `rotate(${decoration.rotation}deg)`,
    zIndex: decoration.zIndex,
    opacity: decoration.opacity,
    boxShadow: isSelected ? '0 0 0 2px var(--plant-primary), 0 4px 12px rgba(0,0,0,0.2)' : 'none',
    '--decoration-rotation': decoration.rotation + 'deg'
  }
}

function snapValue(value: number): number {
  if (!snapToGrid.value) return value
  return Math.round(value / props.gridSize) * props.gridSize
}

function updateGuides(x: number, y: number, width: number, height: number) {
  if (!showGuides.value) return

  const centerX = x + width / 2
  const centerY = y + height / 2
  const canvasCenterX = props.canvasWidth / 2
  const canvasCenterY = props.canvasHeight / 2

  guides.value = {
    vertical: Math.abs(centerX - canvasCenterX) < 5 ? canvasCenterX : null,
    horizontal: Math.abs(centerY - canvasCenterY) < 5 ? canvasCenterY : null
  }
}

function clearGuides() {
  guides.value = { vertical: null, horizontal: null }
}

function onDecorationMouseDown(e: MouseEvent, decoration: DecorationItem) {
  e.preventDefault()
  e.stopPropagation()

  selectedId.value = decoration.id
  emit('decorationSelected', decoration)

  isDragging.value = true
  dragStartPos.value = { x: e.clientX, y: e.clientY }
  dragStartDecoration.value = { ...decoration }

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

function onDecorationTouchStart(e: TouchEvent, decoration: DecorationItem) {
  e.preventDefault()
  e.stopPropagation()

  const touch = e.touches[0]
  selectedId.value = decoration.id
  emit('decorationSelected', decoration)

  isDragging.value = true
  dragStartPos.value = { x: touch.clientX, y: touch.clientY }
  dragStartDecoration.value = { ...decoration }

  document.addEventListener('touchmove', onDragTouchMove, { passive: false })
  document.addEventListener('touchend', onDragTouchEnd)
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value || !dragStartDecoration.value) return

  const deltaX = e.clientX - dragStartPos.value.x
  const deltaY = e.clientY - dragStartPos.value.y

  let newX = dragStartDecoration.value.x + deltaX
  let newY = dragStartDecoration.value.y + deltaY

  newX = Math.max(0, Math.min(props.canvasWidth - dragStartDecoration.value.width, newX))
  newY = Math.max(0, Math.min(props.canvasHeight - dragStartDecoration.value.height, newY))

  if (snapToGrid.value) {
    newX = snapValue(newX)
    newY = snapValue(newY)
  }

  updateGuides(newX, newY, dragStartDecoration.value.width, dragStartDecoration.value.height)

  const updated = updateDecoration(props.decorations, dragStartDecoration.value.id, {
    x: newX,
    y: newY
  })
  emit('update:decorations', updated)
}

function onDragTouchMove(e: TouchEvent) {
  if (!isDragging.value || !dragStartDecoration.value) return
  e.preventDefault()

  const touch = e.touches[0]
  const deltaX = touch.clientX - dragStartPos.value.x
  const deltaY = touch.clientY - dragStartPos.value.y

  let newX = dragStartDecoration.value.x + deltaX
  let newY = dragStartDecoration.value.y + deltaY

  newX = Math.max(0, Math.min(props.canvasWidth - dragStartDecoration.value.width, newX))
  newY = Math.max(0, Math.min(props.canvasHeight - dragStartDecoration.value.height, newY))

  if (snapToGrid.value) {
    newX = snapValue(newX)
    newY = snapValue(newY)
  }

  updateGuides(newX, newY, dragStartDecoration.value.width, dragStartDecoration.value.height)

  const updated = updateDecoration(props.decorations, dragStartDecoration.value.id, {
    x: newX,
    y: newY
  })
  emit('update:decorations', updated)
}

function onDragEnd() {
  isDragging.value = false
  dragStartDecoration.value = null
  clearGuides()
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

function onDragTouchEnd() {
  isDragging.value = false
  dragStartDecoration.value = null
  clearGuides()
  document.removeEventListener('touchmove', onDragTouchMove)
  document.removeEventListener('touchend', onDragTouchEnd)
}

function onDecorationDoubleClick(decoration: DecorationItem) {
  deleteSelected()
}

function onResizeStart(e: MouseEvent, decoration: DecorationItem, handle: string) {
  e.preventDefault()
  e.stopPropagation()

  isResizing.value = true
  activeHandle.value = handle
  dragStartPos.value = { x: e.clientX, y: e.clientY }
  dragStartDecoration.value = { ...decoration }
  initialSize.value = { width: decoration.width, height: decoration.height }

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeTouchStart(e: TouchEvent, decoration: DecorationItem, handle: string) {
  e.preventDefault()
  e.stopPropagation()

  const touch = e.touches[0]
  isResizing.value = true
  activeHandle.value = handle
  dragStartPos.value = { x: touch.clientX, y: touch.clientY }
  dragStartDecoration.value = { ...decoration }
  initialSize.value = { width: decoration.width, height: decoration.height }

  document.addEventListener('touchmove', onResizeTouchMove, { passive: false })
  document.addEventListener('touchend', onResizeTouchEnd)
}

function onResizeMove(e: MouseEvent) {
  if (!isResizing.value || !dragStartDecoration.value || !activeHandle.value) return

  const deltaX = e.clientX - dragStartPos.value.x
  const deltaY = e.clientY - dragStartPos.value.y
  const aspectRatio = initialSize.value.width / initialSize.value.height

  let newWidth = initialSize.value.width
  let newHeight = initialSize.value.height
  let newX = dragStartDecoration.value.x
  let newY = dragStartDecoration.value.y

  const handle = activeHandle.value

  if (handle.includes('e')) {
    newWidth = Math.max(30, initialSize.value.width + deltaX)
  }
  if (handle.includes('w')) {
    newWidth = Math.max(30, initialSize.value.width - deltaX)
    newX = dragStartDecoration.value.x + deltaX
  }
  if (handle.includes('s')) {
    newHeight = Math.max(30, initialSize.value.height + deltaY)
  }
  if (handle.includes('n')) {
    newHeight = Math.max(30, initialSize.value.height - deltaY)
    newY = dragStartDecoration.value.y + deltaY
  }

  if (e.shiftKey) {
    if (handle === 'se' || handle === 'nw') {
      newHeight = newWidth / aspectRatio
    } else if (handle === 'ne' || handle === 'sw') {
      newHeight = newWidth / aspectRatio
    }
  }

  const updated = updateDecoration(props.decorations, dragStartDecoration.value.id, {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight
  })
  emit('update:decorations', updated)
}

function onResizeTouchMove(e: TouchEvent) {
  if (!isResizing.value || !dragStartDecoration.value || !activeHandle.value) return
  e.preventDefault()

  const touch = e.touches[0]
  const deltaX = touch.clientX - dragStartPos.value.x
  const deltaY = touch.clientY - dragStartPos.value.y
  const aspectRatio = initialSize.value.width / initialSize.value.height

  let newWidth = initialSize.value.width
  let newHeight = initialSize.value.height
  let newX = dragStartDecoration.value.x
  let newY = dragStartDecoration.value.y

  const handle = activeHandle.value

  if (handle.includes('e')) {
    newWidth = Math.max(30, initialSize.value.width + deltaX)
  }
  if (handle.includes('w')) {
    newWidth = Math.max(30, initialSize.value.width - deltaX)
    newX = dragStartDecoration.value.x + deltaX
  }
  if (handle.includes('s')) {
    newHeight = Math.max(30, initialSize.value.height + deltaY)
  }
  if (handle.includes('n')) {
    newHeight = Math.max(30, initialSize.value.height - deltaY)
    newY = dragStartDecoration.value.y + deltaY
  }

  const updated = updateDecoration(props.decorations, dragStartDecoration.value.id, {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight
  })
  emit('update:decorations', updated)
}

function onResizeEnd() {
  isResizing.value = false
  activeHandle.value = null
  dragStartDecoration.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

function onResizeTouchEnd() {
  isResizing.value = false
  activeHandle.value = null
  dragStartDecoration.value = null
  document.removeEventListener('touchmove', onResizeTouchMove)
  document.removeEventListener('touchend', onResizeTouchEnd)
}

function onRotateStart(e: MouseEvent, decoration: DecorationItem) {
  e.preventDefault()
  e.stopPropagation()

  isRotating.value = true
  dragStartDecoration.value = { ...decoration }
  initialRotation.value = decoration.rotation

  const rect = canvasAreaRef.value?.getBoundingClientRect()
  if (rect) {
    const centerX = rect.left + decoration.x + decoration.width / 2
    const centerY = rect.top + decoration.y + decoration.height / 2
    rotationStartAngle.value = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
  }

  document.addEventListener('mousemove', onRotateMove)
  document.addEventListener('mouseup', onRotateEnd)
}

function onRotateTouchStart(e: TouchEvent, decoration: DecorationItem) {
  e.preventDefault()
  e.stopPropagation()

  const touch = e.touches[0]
  isRotating.value = true
  dragStartDecoration.value = { ...decoration }
  initialRotation.value = decoration.rotation

  const rect = canvasAreaRef.value?.getBoundingClientRect()
  if (rect) {
    const centerX = rect.left + decoration.x + decoration.width / 2
    const centerY = rect.top + decoration.y + decoration.height / 2
    rotationStartAngle.value = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * (180 / Math.PI)
  }

  document.addEventListener('touchmove', onRotateTouchMove, { passive: false })
  document.addEventListener('touchend', onRotateTouchEnd)
}

function onRotateMove(e: MouseEvent) {
  if (!isRotating.value || !dragStartDecoration.value) return

  const rect = canvasAreaRef.value?.getBoundingClientRect()
  if (!rect) return

  const centerX = rect.left + dragStartDecoration.value.x + dragStartDecoration.value.width / 2
  const centerY = rect.top + dragStartDecoration.value.y + dragStartDecoration.value.height / 2
  const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)

  let newRotation = initialRotation.value + (currentAngle - rotationStartAngle.value)

  if (e.shiftKey) {
    newRotation = Math.round(newRotation / 15) * 15
  }

  const updated = updateDecoration(props.decorations, dragStartDecoration.value.id, {
    rotation: newRotation
  })
  emit('update:decorations', updated)
}

function onRotateTouchMove(e: TouchEvent) {
  if (!isRotating.value || !dragStartDecoration.value) return
  e.preventDefault()

  const touch = e.touches[0]
  const rect = canvasAreaRef.value?.getBoundingClientRect()
  if (!rect) return

  const centerX = rect.left + dragStartDecoration.value.x + dragStartDecoration.value.width / 2
  const centerY = rect.top + dragStartDecoration.value.y + dragStartDecoration.value.height / 2
  const currentAngle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX) * (180 / Math.PI)

  let newRotation = initialRotation.value + (currentAngle - rotationStartAngle.value)

  const updated = updateDecoration(props.decorations, dragStartDecoration.value.id, {
    rotation: newRotation
  })
  emit('update:decorations', updated)
}

function onRotateEnd() {
  isRotating.value = false
  dragStartDecoration.value = null
  document.removeEventListener('mousemove', onRotateMove)
  document.removeEventListener('mouseup', onRotateEnd)
}

function onRotateTouchEnd() {
  isRotating.value = false
  dragStartDecoration.value = null
  document.removeEventListener('touchmove', onRotateTouchMove)
  document.removeEventListener('touchend', onRotateTouchEnd)
}

function onCanvasClick(e: MouseEvent) {
  if (e.target === canvasAreaRef.value || e.target === canvasContainerRef.value) {
    selectedId.value = null
    emit('decorationSelected', null)
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()

  const data = e.dataTransfer?.getData('application/json')
  if (!data) return

  try {
    const parsed = JSON.parse(data)
    const rect = canvasAreaRef.value?.getBoundingClientRect()
    if (!rect) return

    let x = e.clientX - rect.left - parsed.width / 2
    let y = e.clientY - rect.top - parsed.height / 2

    x = Math.max(0, Math.min(props.canvasWidth - parsed.width, x))
    y = Math.max(0, Math.min(props.canvasHeight - parsed.height, y))

    if (snapToGrid.value) {
      x = snapValue(x)
      y = snapValue(y)
    }

    const newDecoration = createDecoration(parsed.presetId, x, y)
    if (newDecoration) {
      emit('update:decorations', [...props.decorations, newDecoration])
      selectedId.value = newDecoration.id
      emit('decorationSelected', newDecoration)
    }
  } catch (err) {
    console.error('Failed to parse drop data:', err)
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (!selectedId.value) return

  const selected = props.decorations.find(d => d.id === selectedId.value)
  if (!selected) return

  const nudgeAmount = e.shiftKey ? 10 : 1

  switch (e.key) {
    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      deleteSelected()
      break
    case 'ArrowUp':
      e.preventDefault()
      moveSelected(0, -nudgeAmount)
      break
    case 'ArrowDown':
      e.preventDefault()
      moveSelected(0, nudgeAmount)
      break
    case 'ArrowLeft':
      e.preventDefault()
      moveSelected(-nudgeAmount, 0)
      break
    case 'ArrowRight':
      e.preventDefault()
      moveSelected(nudgeAmount, 0)
      break
    case 'd':
    case 'D':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        duplicateDecoration()
      }
      break
  }
}

function moveSelected(dx: number, dy: number) {
  if (!selectedId.value) return

  const selected = props.decorations.find(d => d.id === selectedId.value)
  if (!selected) return

  let newX = selected.x + dx
  let newY = selected.y + dy

  newX = Math.max(0, Math.min(props.canvasWidth - selected.width, newX))
  newY = Math.max(0, Math.min(props.canvasHeight - selected.height, newY))

  if (snapToGrid.value) {
    newX = snapValue(newX)
    newY = snapValue(newY)
  }

  const updated = updateDecoration(props.decorations, selectedId.value, { x: newX, y: newY })
  emit('update:decorations', updated)
}

function bringForward() {
  if (!selectedId.value) return
  const updated = serviceBringForward(props.decorations, selectedId.value)
  emit('update:decorations', updated)
}

function sendBackward() {
  if (!selectedId.value) return
  const updated = serviceSendBackward(props.decorations, selectedId.value)
  emit('update:decorations', updated)
}

function bringToFront() {
  if (!selectedId.value) return
  const updated = serviceBringToFront(props.decorations, selectedId.value)
  emit('update:decorations', updated)
}

function sendToBack() {
  if (!selectedId.value) return
  const updated = serviceSendToBack(props.decorations, selectedId.value)
  emit('update:decorations', updated)
}

function duplicateDecoration() {
  if (!selectedId.value) return
  const updated = serviceDuplicateDecoration(props.decorations, selectedId.value)
  emit('update:decorations', updated)
  const newItem = updated[updated.length - 1]
  selectedId.value = newItem.id
  emit('decorationSelected', newItem)
}

function deleteSelected() {
  if (!selectedId.value) return
  const updated = deleteDecoration(props.decorations, selectedId.value)
  emit('update:decorations', updated)
  selectedId.value = null
  emit('decorationSelected', null)
}

function onOpacityChange(e: Event) {
  if (!selectedId.value) return
  const target = e.target as HTMLInputElement
  const opacity = parseFloat(target.value)
  const updated = updateDecoration(props.decorations, selectedId.value, { opacity })
  emit('update:decorations', updated)
}

function onSpecimenImageLoad() {
  specimenImageLoaded.value = true
}

watch(
  () => props.specimenImage,
  (newImage) => {
    if (specimenImageUrl.value) {
      URL.revokeObjectURL(specimenImageUrl.value)
    }
    if (newImage) {
      specimenImageUrl.value = URL.createObjectURL(newImage)
      specimenImageLoaded.value = false
    } else {
      specimenImageUrl.value = null
    }
  },
  { immediate: true }
)

watch(
  () => props.decorations,
  () => {
    if (selectedId.value && !props.decorations.find(d => d.id === selectedId.value)) {
      selectedId.value = null
      emit('decorationSelected', null)
    }
  },
  { deep: true }
)

onMounted(() => {
  canvasContainerRef.value?.focus()
})

onUnmounted(() => {
  if (specimenImageUrl.value) {
    URL.revokeObjectURL(specimenImageUrl.value)
  }
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('mousemove', onRotateMove)
  document.removeEventListener('mouseup', onRotateEnd)
  document.removeEventListener('touchmove', onDragTouchMove)
  document.removeEventListener('touchend', onDragTouchEnd)
  document.removeEventListener('touchmove', onResizeTouchMove)
  document.removeEventListener('touchend', onResizeTouchEnd)
  document.removeEventListener('touchmove', onRotateTouchMove)
  document.removeEventListener('touchend', onRotateTouchEnd)
})

defineExpose({
  canvasArea: canvasAreaRef,
  selectedDecoration,
  clearSelection: () => {
    selectedId.value = null
    emit('decorationSelected', null)
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.decoration-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  outline: none;
}

.canvas-area {
  position: relative;
  background-color: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  @include paper-texture(0.3);
  @include aged-paper-edge;
  @include shadow-paper(3);
  transition: box-shadow var(--transition-normal);

  .decoration-canvas.is-dragging &,
  .decoration-canvas.is-resizing &,
  .decoration-canvas.is-rotating & {
    cursor: grabbing;
  }
}

.specimen-image-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
}

.specimen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  opacity: 0.9;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.grid-line {
  position: absolute;
  background-color: var(--plant-primary);
  opacity: 0.1;

  &.horizontal {
    left: 0;
    right: 0;
    height: 1px;
  }

  &.vertical {
    top: 0;
    bottom: 0;
    width: 1px;
  }
}

.alignment-guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.guide-line {
  position: absolute;
  background-color: var(--plant-primary);
  opacity: 0.6;

  &.horizontal {
    left: 0;
    right: 0;
    height: 1px;
  }

  &.vertical {
    top: 0;
    bottom: 0;
    width: 1px;
  }
}

.decoration-element {
  position: absolute;
  cursor: grab;
  transition: box-shadow var(--transition-fast);
  @include not-selectable;
  transform-origin: center center;

  &.is-leaf {
    animation: leafFloat 4s ease-in-out infinite;
  }

  &.is-selected {
    cursor: grabbing;
    z-index: 1000 !important;
  }

  &:hover:not(.is-selected) {
    filter: brightness(1.05);
  }
}

.decoration-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

.selection-frame {
  position: absolute;
  inset: 0;
  border: 1px dashed var(--plant-primary);
  pointer-events: none;
  z-index: 1001;
}

.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: var(--bg-paper);
  border: 2px solid var(--plant-primary);
  border-radius: 50%;
  pointer-events: auto;
  transition: transform var(--transition-fast);
  z-index: 1002;

  &:hover {
    transform: scale(1.3);
    background-color: var(--plant-primary);
  }
}

.rotate-handle {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-paper);
  border: 2px solid var(--plant-primary);
  border-radius: 50%;
  cursor: grab;
  pointer-events: auto;
  transition: all var(--transition-fast);
  z-index: 1002;

  &:hover {
    transform: translateX(-50%) scale(1.1);
    background-color: var(--plant-primary);

    .rotate-icon {
      color: var(--text-inverse);
    }
  }

  &:active {
    cursor: grabbing;
  }
}

.rotate-icon {
  font-size: 14px;
  color: var(--plant-primary);
  transition: color var(--transition-fast);
}

.decoration-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background-color: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  @include paper-texture(0.15);
  @include shadow-paper(2);
  animation: fadeInUp 0.2s ease-out;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: var(--border-color);
  opacity: 0.5;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--bg-paper);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  @include not-selectable;

  &:hover {
    border-color: var(--plant-primary);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &.is-active {
    background-color: var(--plant-primary);
    border-color: var(--plant-primary);
    color: var(--text-inverse);
  }

  &.delete-btn:hover {
    border-color: var(--color-day-error);
    background-color: rgba(166, 68, 68, 0.1);
  }
}

.opacity-control {
  gap: 8px;
}

.control-label {
  @include serif-text(13px, 500);
  color: var(--text-secondary);
  white-space: nowrap;
}

.opacity-slider {
  width: 100px;
  height: 6px;
  background-color: var(--border-color);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
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
    width: 18px;
    height: 18px;
    background-color: var(--plant-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    @include shadow-paper(2);
  }
}

.opacity-value {
  @include typewriter-text;
  font-size: 12px;
  color: var(--plant-primary);
  min-width: 36px;
  text-align: right;
}

@keyframes leafFloat {
  0%, 100% {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
    transform: translateY(0);
  }
  25% {
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.18));
    transform: translateY(-2px);
  }
  50% {
    filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.16));
    transform: translateY(-1px);
  }
  75% {
    filter: drop-shadow(0 5px 7px rgba(0, 0, 0, 0.2));
    transform: translateY(-3px);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

[data-theme='forest'] {
  .grid-line {
    opacity: 0.15;
  }

  .guide-line {
    opacity: 0.7;
  }
}
</style>
