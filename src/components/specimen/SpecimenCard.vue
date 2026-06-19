<template>
  <div
    ref="cardRef"
    class="specimen-card"
    :class="{
      'is-dragging': isDragging,
      'is-drag-over': isDragOver,
      'show-wrinkle': showWrinkle
    }"
    :data-index="index"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerLeave"
    @mouseenter="onDragEnter"
    @mouseleave="onDragLeave"
    @click="onClick"
  >
    <div class="card-tape tape-top-left"></div>
    <div class="card-tape tape-top-right"></div>

    <div class="paper-frame">
      <div class="image-wrapper">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="specimen.name"
          class="specimen-image"
          @load="onImageLoad"
        />
        <div v-else class="image-placeholder">
          <span class="placeholder-icon">🌿</span>
          <span class="placeholder-text">暂无图片</span>
        </div>
      </div>

      <div v-if="hasDecorations" class="decoration-preview">
        <span v-if="hasLeafDecoration" class="deco-icon leaf">🍃</span>
        <span v-if="hasRopeDecoration" class="deco-icon rope">🧵</span>
      </div>
    </div>

    <div class="card-content">
      <h3 class="plant-name">{{ specimen.name || '未命名植物' }}</h3>

      <div class="specimen-meta">
        <div class="meta-item">
          <span class="meta-icon">📅</span>
          <span class="meta-text">{{ seasonText }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">📍</span>
          <span class="meta-text">{{ specimen.location || '未知地点' }}</span>
        </div>
      </div>
    </div>

    <div class="paper-wrinkle-overlay"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Specimen } from '@/types'
import { useDragDrop } from '@/composables/useDragDrop'

interface Props {
  specimen: Specimen
  index: number
}

const props = defineProps<Props>()

const router = useRouter()
const cardRef = ref<HTMLElement | null>(null)
const imageUrl = ref<string | null>(null)
const showWrinkle = ref(false)

const {
  isDragging,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerLeave,
  handleDragEnter,
  handleDragLeave,
  overIndex
} = useDragDrop()

const isDragOver = computed(() => overIndex.value === props.index)

const hasDecorations = computed(() => props.specimen.decorations.length > 0)

const hasLeafDecoration = computed(() =>
  props.specimen.decorations.some(d => d.type === 'leaf')
)

const hasRopeDecoration = computed(() =>
  props.specimen.decorations.some(d => d.type === 'rope')
)

const seasonText = computed(() => {
  const seasonMap: Record<string, string> = {
    spring: '春',
    summer: '夏',
    autumn: '秋',
    winter: '冬'
  }
  return seasonMap[props.specimen.season] || '未知季节'
})

function loadImage() {
  const blob = props.specimen.filteredImageBlob || props.specimen.imageBlob
  if (blob) {
    imageUrl.value = URL.createObjectURL(blob)
  } else {
    imageUrl.value = null
  }
}

function onImageLoad() {
  setTimeout(() => {
    showWrinkle.value = true
    setTimeout(() => {
      showWrinkle.value = false
    }, 2000)
  }, 300)
}

function onPointerDown(e: PointerEvent) {
  if (cardRef.value) {
    handlePointerDown(e, cardRef.value, props.index, props.specimen.id)
  }
}

function onPointerMove(e: PointerEvent) {
  handlePointerMove(e)
}

function onPointerUp(e: PointerEvent) {
  if (cardRef.value) {
    handlePointerUp(e, cardRef.value)
  }
}

function onPointerLeave(e: PointerEvent) {
  if (cardRef.value) {
    handlePointerLeave(e, cardRef.value)
  }
}

function onDragEnter() {
  handleDragEnter(props.index)
}

function onDragLeave() {
  handleDragLeave()
}

function onClick() {
  if (!isDragging.value && props.specimen.id) {
    router.push(`/specimen/${props.specimen.id}`)
  }
}

watch(
  () => [props.specimen.filteredImageBlob, props.specimen.imageBlob],
  () => {
    if (imageUrl.value) {
      URL.revokeObjectURL(imageUrl.value)
    }
    loadImage()
  }
)

onMounted(() => {
  loadImage()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.specimen-card {
  position: relative;
  width: 280px;
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
  @include paper-texture-vintage(0.4);
  @include shadow-vintage-card;
  @include not-selectable;

  &:hover {
    transform: translateY(-6px) rotate(-0.5deg);
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.15),
      0 4px 8px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(139, 115, 85, 0.15);
  }

  &.is-dragging {
    opacity: 0.8;
    transform: scale(1.05) rotate(3deg);
    cursor: grabbing;
    z-index: 1000;
  }

  &.is-drag-over {
    transform: scale(1.02);
    box-shadow:
      0 0 0 3px var(--plant-primary),
      0 8px 16px rgba(0, 0, 0, 0.1);
  }

  &.show-wrinkle .paper-wrinkle-overlay {
    animation: paperWrinkle 2s ease-in-out;
  }
}

.card-tape {
  position: absolute;
  width: 60px;
  height: 24px;
  @include tape-effect(#D4A853, 0.65);
  transform: rotate(-3deg);
  z-index: 10;

  &.tape-top-left {
    top: -8px;
    left: 20px;
    transform: rotate(-8deg);
  }

  &.tape-top-right {
    top: -6px;
    right: 24px;
    transform: rotate(6deg);
  }
}

.paper-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background-color: var(--bg-paper);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  @include aged-paper-edge;
  @include shadow-paper(2);
}

.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
}

.specimen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);

  .placeholder-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .placeholder-text {
    @include serif-text(14px);
    opacity: 0.7;
  }
}

.decoration-preview {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8px;
  display: flex;
  gap: 4px;

  .deco-icon {
    font-size: 16px;
    opacity: 0.8;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));

    &.leaf {
      transform: rotate(-15deg);
    }

    &.rope {
      transform: rotate(15deg);
    }
  }
}

.card-content {
  padding-top: 16px;
}

.plant-name {
  @include handwriting(24px);
  margin: 0 0 12px 0;
  color: var(--text-primary);
  text-align: center;
  letter-spacing: 0.1em;
}

.specimen-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;

  .meta-icon {
    font-size: 14px;
    opacity: 0.7;
  }

  .meta-text {
    @include serif-text(13px);
    color: var(--text-secondary);
    @include text-ellipsis(1);
  }
}

.paper-wrinkle-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image:
    radial-gradient(ellipse at 20% 30%, rgba(139, 115, 85, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(166, 139, 91, 0.08) 0%, transparent 50%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 200% 200%, 200% 200%, 400px 400px;
  opacity: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
}

@keyframes paperWrinkle {
  0% {
    opacity: 0;
    background-position: 0% 0%, 0% 0%, 0% 0%;
  }
  25% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.4;
    background-position: 100% 100%, 100% 100%, 100% 100%;
  }
  75% {
    opacity: 0.3;
  }
  100% {
    opacity: 0;
    background-position: 0% 0%, 0% 0%, 0% 0%;
  }
}
</style>
