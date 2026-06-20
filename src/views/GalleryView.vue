<template>
  <div class="gallery-view" :class="{ 'is-dragging': isDragging }">
    <div class="gallery-content">
      <SideFilter />

      <main class="main-content">
        <div class="content-header">
          <div class="header-left">
            <h2 class="section-title">标本陈列墙</h2>
            <span class="result-count">
              共 <strong>{{ filteredSpecimens.length }}</strong> 件标本
              <span v-if="hasActiveFilters" class="filter-badge">
                已筛选 ({{ activeFilterCount }})
              </span>
            </span>
          </div>
          <div class="header-right">
            <button
              class="refresh-btn"
              :class="{ 'is-refreshing': isRefreshing }"
              @click="refreshSpecimens"
              :disabled="isRefreshing"
            >
              <span class="refresh-icon">🔄</span>
              <span class="refresh-text">刷新</span>
            </button>
          </div>
        </div>

        <div
          class="pull-indicator"
          :class="{ 'is-visible': pullDistance > 0, 'is-ready': pullDistance > 80 }"
          :style="{ height: Math.min(pullDistance, 100) + 'px' }"
        >
          <span class="pull-icon">{{ pullDistance > 80 ? '✓' : '⬇️' }}</span>
          <span class="pull-text">{{ pullDistance > 80 ? '释放刷新' : '下拉刷新' }}</span>
        </div>

        <div
          ref="gridContainerRef"
          class="specimen-grid"
          data-drag-container
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <template v-if="loading && !isRefreshing">
            <div
              v-for="i in skeletonCount"
              :key="'skeleton-' + i"
              class="skeleton-card"
              :style="{ animationDelay: (i * 0.1) + 's' }"
            >
              <div class="skeleton-image"></div>
              <div class="skeleton-content">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line meta"></div>
                <div class="skeleton-line meta short"></div>
              </div>
            </div>
          </template>

          <template v-else-if="filteredSpecimens.length === 0">
            <div class="empty-state">
              <div class="empty-illustration">
                <span class="plant-emoji plant-1">🌱</span>
                <span class="plant-emoji plant-2">🌿</span>
                <span class="plant-emoji plant-3">🍀</span>
                <span class="plant-emoji plant-4">🌸</span>
                <span class="plant-emoji plant-5">🍃</span>
              </div>
              <h3 class="empty-title">你的标本陈列墙还是空的</h3>
              <p class="empty-subtitle">开始收集你身边的植物，创建属于自己的自然博物馆</p>
              <button class="create-first-btn" @click="goToCreate">
                <span class="btn-icon">🌿</span>
                <span class="btn-text">创建你的第一份标本</span>
              </button>
            </div>
          </template>

          <template v-else>
            <SpecimenCard
              v-for="(specimen, index) in filteredSpecimens"
              :key="specimen.id"
              :specimen="specimen"
              :index="index"
              class="specimen-card-item"
              :class="{ 'is-dragging': isDragging && dragState.draggedIndex === index }"
              :style="{ animationDelay: (index * 0.08) + 's' }"
              data-drag-item
            />
          </template>
        </div>

        <div
          v-if="isDragging"
          class="drag-overlay"
        >
          <div class="drag-hint">
            <span class="hint-icon">✋</span>
            <span class="hint-text">拖拽到目标位置释放</span>
          </div>
        </div>
      </main>
    </div>

    <button class="fab-btn" @click="goToCreate">
      <span class="fab-icon">+</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import SideFilter from '@/components/layout/SideFilter.vue'
import SpecimenCard from '@/components/specimen/SpecimenCard.vue'
import { useSpecimens } from '@/composables/useSpecimens'
import { useFilter } from '@/composables/useFilter'
import { useDragDrop } from '@/composables/useDragDrop'
import type { Specimen } from '@/types'

const router = useRouter()

const {
  loading,
  error,
  specimens,
  loadSpecimens,
  reorderSpecimens
} = useSpecimens()

const {
  filteredSpecimens,
  hasActiveFilters,
  activeFilterCount
} = useFilter()

const gridContainerRef = ref<HTMLElement | null>(null)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const touchStartY = ref(0)
const isPulling = ref(false)

const skeletonCount = computed(() => {
  const width = window.innerWidth
  if (width < 480) return 4
  if (width < 768) return 4
  return 8
})

const handleReorder = async (orderedItems: Specimen[]) => {
  try {
    await reorderSpecimens(orderedItems)
  } catch (err) {
    console.error('Failed to reorder specimens:', err)
  }
}

const {
  dragState,
  isDragging,
  overIndex,
  initDragListeners,
  removeDragListeners
} = useDragDrop<Specimen>({
  items: filteredSpecimens.value,
  itemSelector: '[data-drag-item]',
  containerSelector: '[data-drag-container]',
  onReorder: handleReorder,
  longPressDelay: 500
})

function goToCreate() {
  router.push('/specimen/new')
}

function goToExport() {
  router.push('/album/export')
}

async function refreshSpecimens() {
  isRefreshing.value = true
  try {
    await loadSpecimens()
    await nextTick()
    reinitDragListeners()
  } finally {
    isRefreshing.value = false
  }
}

function reinitDragListeners() {
  removeDragListeners()
  nextTick(() => {
    initDragListeners()
  })
}

function onTouchStart(e: TouchEvent) {
  if (window.scrollY === 0) {
    touchStartY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

function onTouchMove(e: TouchEvent) {
  if (!isPulling.value) return

  const currentY = e.touches[0].clientY
  const delta = currentY - touchStartY.value

  if (delta > 0 && window.scrollY === 0) {
    e.preventDefault()
    pullDistance.value = Math.min(delta * 0.5, 100)
  }
}

async function onTouchEnd() {
  if (pullDistance.value > 80) {
    await refreshSpecimens()
  }
  pullDistance.value = 0
  isPulling.value = false
}

watch(
  () => filteredSpecimens.value,
  () => {
    nextTick(() => {
      reinitDragListeners()
    })
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    initDragListeners()
  })
})

onBeforeUnmount(() => {
  removeDragListeners()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.gallery-view {
  min-height: 100vh;
  background-color: var(--bg-primary);
  transition: background-color var(--transition-normal);
}

.gallery-content {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xl);
  gap: var(--spacing-xl);

  @media (max-width: 768px) {
    padding: var(--spacing-md);
    padding-top: 72px;
  }
}

.main-content {
  flex: 1;
  min-width: 0;
  position: relative;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.section-title {
  @include handwriting(32px);
  color: var(--text-primary);
  margin: 0;

  @media (max-width: 768px) {
    font-size: 24px;
  }
}

.result-count {
  @include serif-text(14px);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  strong {
    color: var(--plant-primary);
    font-weight: 600;
  }
}

.filter-badge {
  background-color: var(--hover-bg);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.refresh-btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  @include serif-text(14px);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  @include paper-texture(0.2);

  &:hover:not(:disabled) {
    background-color: var(--hover-bg);
    transform: translateY(-1px);
    @include shadow-paper(2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.is-refreshing .refresh-icon {
    animation: spin 1s linear infinite;
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

.pull-indicator {
  display: none;
  overflow: hidden;
  transition: height var(--transition-fast);
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
  @include serif-text(13px);

  &.is-visible {
    display: flex;
  }

  &.is-ready {
    color: var(--plant-primary);
  }

  @media (max-width: 768px) {
    display: none;

    &.is-visible {
      display: flex;
    }
  }
}

.pull-icon {
  font-size: 20px;
  transition: transform var(--transition-fast);
}

.specimen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-xl);
  position: relative;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--spacing-lg);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.specimen-card-item {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease forwards;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &.is-dragging {
    opacity: 0.5;
    transform: scale(1.05) rotate(3deg);
    z-index: 1000;
    cursor: grabbing;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.skeleton-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  @include paper-texture(0.2);
  @include shadow-paper(2);
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(90deg, 
    var(--border-light) 0%, 
    var(--hover-bg) 50%, 
    var(--border-light) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s ease-in-out infinite;
  margin-bottom: var(--spacing-md);
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, 
    var(--border-light) 0%, 
    var(--hover-bg) 50%, 
    var(--border-light) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: shimmer 1.5s ease-in-out infinite;

  &.title {
    height: 24px;
    width: 80%;
  }

  &.meta {
    height: 14px;
    width: 100%;
  }

  &.short {
    width: 60%;
  }
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl) var(--spacing-xl);
  text-align: center;
}

.empty-illustration {
  position: relative;
  width: 200px;
  height: 160px;
  margin-bottom: var(--spacing-xl);

  .plant-emoji {
    position: absolute;
    font-size: 48px;
    animation: float 3s ease-in-out infinite;

    &.plant-1 {
      left: 10%;
      top: 60%;
      animation-delay: 0s;
    }

    &.plant-2 {
      left: 30%;
      top: 30%;
      animation-delay: 0.3s;
      font-size: 56px;
    }

    &.plant-3 {
      left: 50%;
      top: 10%;
      transform: translateX(-50%);
      animation-delay: 0.6s;
      font-size: 64px;
    }

    &.plant-4 {
      right: 30%;
      top: 35%;
      animation-delay: 0.9s;
      font-size: 52px;
    }

    &.plant-5 {
      right: 10%;
      top: 65%;
      animation-delay: 1.2s;
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-10px) rotate(5deg);
  }
}

.empty-title {
  @include handwriting(28px);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.empty-subtitle {
  @include serif-text(16px);
  color: var(--text-secondary);
  max-width: 400px;
  margin: 0 0 var(--spacing-xl) 0;
  line-height: 1.8;
}

.create-first-btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  background: linear-gradient(135deg, var(--plant-primary) 0%, #5a7247 100%);
  border: none;
  border-radius: var(--radius-lg);
  color: #fff;
  @include handwriting(18px);
  cursor: pointer;
  transition: all var(--transition-normal);
  @include shadow-paper(3);

  &:hover {
    transform: translateY(-2px);
    @include shadow-paper(4);
  }

  &:active {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 24px;
  }
}

.drag-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.1);
  z-index: 999;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.drag-hint {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: var(--bg-card);
  border: 2px dashed var(--plant-primary);
  border-radius: var(--radius-lg);
  @include shadow-paper(3);

  .hint-icon {
    font-size: 24px;
  }

  .hint-text {
    @include serif-text(14px, 600);
    color: var(--text-primary);
  }
}

.fab-btn {
  @include button-reset;
  position: fixed;
  bottom: var(--spacing-xl);
  right: var(--spacing-xl);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--plant-primary) 0%, #5a7247 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: 
    0 4px 12px rgba(90, 114, 71, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 100;
  opacity: 0;
  visibility: hidden;

  @media (max-width: 768px) {
    opacity: 1;
    visibility: visible;
  }

  &:hover {
    transform: scale(1.1) rotate(90deg);
    box-shadow: 
      0 6px 20px rgba(90, 114, 71, 0.5),
      0 3px 6px rgba(0, 0, 0, 0.25);
  }

  &:active {
    transform: scale(0.95);
  }
}

.fab-icon {
  font-size: 32px;
  font-weight: 300;
  line-height: 1;
}

.is-dragging {
  user-select: none;

  .specimen-card-item:not(.is-dragging) {
    transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
  }

  .specimen-card-item.drag-over {
    transform: scale(1.02);
    box-shadow: 
      0 0 0 3px var(--plant-primary),
      0 8px 16px rgba(0, 0, 0, 0.1);
  }
}
</style>
