<template>
  <div
    class="decoration-drawer"
    :class="{ 'is-open': isOpen }"
  >
    <div
      class="drawer-handle"
      @mousedown="onHandleMouseDown"
      @touchstart="onHandleTouchStart"
      @touchmove="onHandleTouchMove"
      @touchend="onHandleTouchEnd"
    >
      <div class="handle-bar"></div>
      <span class="handle-text">{{ isOpen ? '收起装饰' : '打开装饰' }}</span>
    </div>

    <div class="drawer-content" v-show="isOpen">
      <div class="drawer-header">
        <h3 class="drawer-title">装饰元素</h3>
        <div class="header-actions">
          <div class="search-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="搜索装饰..."
              @input="onSearch"
            />
            <span class="search-icon">🔍</span>
          </div>
          <button class="close-btn" @click="closeDrawer" title="关闭">
            <span class="close-icon">×</span>
          </button>
        </div>
      </div>

      <div class="tab-buttons">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ 'is-active': activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span class="tab-count">{{ getCountByType(tab.value) }}</span>
        </button>
      </div>

      <div class="decoration-grid" data-drag-container>
        <div
          v-for="preset in filteredPresets"
          :key="preset.id"
          class="decoration-item"
          :data-drag-item="preset.id"
          draggable="true"
          @dragstart="onDragStart($event, preset)"
          @dragend="onDragEnd"
          @click="onItemClick(preset)"
        >
          <div class="item-thumbnail">
            <img :src="preset.src" :alt="preset.name" class="thumbnail-img" />
          </div>
          <span class="item-name">{{ preset.name }}</span>
        </div>
      </div>

      <div v-if="filteredPresets.length === 0" class="empty-state">
        <span class="empty-icon">🍂</span>
        <span class="empty-text">没有找到相关装饰</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { DecorationType, DecorationItem } from '@/types'
import {
  getAllPresets,
  searchPresets,
  getPresetsByType,
  createDecorationFromPreset,
  type DecorationPreset
} from '@/services/DecorationService'

interface Emits {
  (e: 'decorationAdded', decoration: DecorationItem): void
  (e: 'decorationDragStart', preset: DecorationPreset): void
  (e: 'decorationDragEnd'): void
}

const emit = defineEmits<Emits>()

const isOpen = ref(true)
const activeTab = ref<DecorationType>('leaf')
const searchQuery = ref('')
const allPresets = ref<DecorationPreset[]>(getAllPresets())

const tabs = [
  { value: 'leaf' as DecorationType, label: '枯叶', icon: '🍂' },
  { value: 'rope' as DecorationType, label: '麻绳', icon: '🪢' },
  { value: 'frame' as DecorationType, label: '边框', icon: '🖼️' },
  { value: 'sticker' as DecorationType, label: '贴纸', icon: '🏷️' },
  { value: 'tape' as DecorationType, label: '胶带', icon: '📎' }
]

const filteredPresets = computed(() => {
  if (searchQuery.value.trim()) {
    return searchPresets(searchQuery.value)
  }
  return getPresetsByType(activeTab.value)
})

function getCountByType(type: DecorationType): number {
  return allPresets.value.filter(p => p.type === type).length
}

function onSearch() {
  if (searchQuery.value.trim()) {
    activeTab.value = 'leaf'
  }
}

function onDragStart(e: DragEvent, preset: DecorationPreset) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/json', JSON.stringify({
      presetId: preset.id,
      type: preset.type,
      width: preset.defaultWidth,
      height: preset.defaultHeight
    }))
    e.dataTransfer.setDragImage(createDragImage(preset), 50, 30)
  }
  emit('decorationDragStart', preset)
}

function onDragEnd() {
  emit('decorationDragEnd')
}

function onItemClick(preset: DecorationPreset) {
  const decoration = createDecorationFromPreset(preset, 100, 100)
  emit('decorationAdded', decoration)
}

function closeDrawer() {
  isOpen.value = false
}

function toggleDrawer() {
  isOpen.value = !isOpen.value
}

function createDragImage(preset: DecorationPreset): HTMLElement {
  const img = document.createElement('img')
  img.src = preset.src
  img.style.width = '100px'
  img.style.height = 'auto'
  img.style.opacity = '0.8'
  img.style.position = 'absolute'
  img.style.top = '-9999px'
  img.style.left = '-9999px'
  document.body.appendChild(img)
  setTimeout(() => document.body.removeChild(img), 0)
  return img
}

let startY = 0
let currentY = 0
let isDraggingHandle = false

function onHandleMouseDown(e: MouseEvent) {
  startY = e.clientY
  currentY = e.clientY
  isDraggingHandle = true
  document.addEventListener('mousemove', onHandleMouseMove)
  document.addEventListener('mouseup', onHandleMouseUp)
}

function onHandleMouseMove(e: MouseEvent) {
  if (!isDraggingHandle) return
  currentY = e.clientY
}

function onHandleMouseUp() {
  if (!isDraggingHandle) return
  const deltaY = currentY - startY
  if (Math.abs(deltaY) > 30) {
    isOpen.value = deltaY < 0
  } else {
    isOpen.value = !isOpen.value
  }
  isDraggingHandle = false
  document.removeEventListener('mousemove', onHandleMouseMove)
  document.removeEventListener('mouseup', onHandleMouseUp)
}

function onHandleTouchStart(e: TouchEvent) {
  startY = e.touches[0].clientY
  currentY = e.touches[0].clientY
  isDraggingHandle = true
}

function onHandleTouchMove(e: TouchEvent) {
  if (!isDraggingHandle) return
  currentY = e.touches[0].clientY
}

function onHandleTouchEnd() {
  if (!isDraggingHandle) return
  const deltaY = currentY - startY
  if (Math.abs(deltaY) > 30) {
    isOpen.value = deltaY < 0
  } else {
    isOpen.value = !isOpen.value
  }
  isDraggingHandle = false
}

watch(activeTab, () => {
  searchQuery.value = ''
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.decoration-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--bg-card);
  border-top: 2px solid var(--border-color);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  z-index: 100;
  transform: translateY(calc(100% - 60px));
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 60vh;
  @include paper-texture(0.2);
  @include shadow-paper(4);

  &.is-open {
    transform: translateY(0);
  }

  @media (min-width: 768px) {
    left: 50%;
    right: auto;
    transform: translateX(-50%) translateY(calc(100% - 60px));
    width: 600px;
    max-width: 90vw;

    &.is-open {
      transform: translateX(-50%) translateY(0);
    }
  }
}

.drawer-handle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60px;
  cursor: grab;
  transition: background-color var(--transition-fast);
  @include not-selectable;

  &:hover {
    background-color: var(--hover-bg);
  }

  &:active {
    cursor: grabbing;
  }
}

.handle-bar {
  width: 48px;
  height: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  transition: background-color var(--transition-fast);

  .decoration-drawer.is-open & {
    background-color: var(--plant-primary);
  }
}

.handle-text {
  @include serif-text(12px, 500);
  color: var(--text-secondary);
  letter-spacing: 0.1em;
}

.drawer-content {
  padding: 0 20px 20px;
  max-height: calc(60vh - 60px);
  overflow-y: auto;
  @include scrollbar-custom;
  animation: fadeInUp 0.3s ease-out;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-top: 8px;
}

.drawer-title {
  @include serif-text(20px, 600);
  color: var(--text-primary);
  margin: 0;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 240px;
}

.close-btn {
  @include button-reset;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-paper);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    background-color: var(--accent-red);
    border-color: var(--accent-red);
    color: #fff;
    transform: rotate(90deg);
  }
}

.close-icon {
  font-size: 20px;
  line-height: 1;
  color: var(--text-secondary);

  .close-btn:hover & {
    color: #fff;
  }
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 16px;
  background-color: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  @include serif-text(14px);
  color: var(--text-primary);
  transition: all var(--transition-fast);
  outline: none;

  &:focus {
    border-color: var(--plant-primary);
    @include shadow-paper(2);
  }

  &::placeholder {
    color: var(--text-muted);
  }
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  opacity: 0.5;
  pointer-events: none;
}

.tab-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
  @include scrollbar-hide;
}

.tab-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background-color: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: 9999px;
  cursor: pointer;
  transition: all var(--transition-fast);
  @include not-selectable;

  &:hover {
    border-color: var(--plant-primary);
    transform: translateY(-2px);
  }

  &.is-active {
    background-color: var(--plant-primary);
    border-color: var(--plant-primary);

    .tab-label,
    .tab-icon,
    .tab-count {
      color: var(--text-inverse);
    }
  }
}

.tab-icon {
  font-size: 18px;
}

.tab-label {
  @include serif-text(14px, 500);
  color: var(--text-primary);
}

.tab-count {
  @include typewriter-text;
  font-size: 11px;
  padding: 2px 6px;
  background-color: var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);

  .tab-btn.is-active & {
    background-color: rgba(255, 255, 255, 0.2);
  }
}

.decoration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.decoration-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background-color: var(--bg-paper);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: grab;
  transition: all var(--transition-fast);
  @include not-selectable;
  animation: fadeInUp 0.4s ease-out backwards;

  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  &:nth-child(3) { animation-delay: 0.15s; }
  &:nth-child(4) { animation-delay: 0.2s; }
  &:nth-child(5) { animation-delay: 0.25s; }
  &:nth-child(6) { animation-delay: 0.3s; }

  &:hover {
    border-color: var(--plant-primary);
    transform: translateY(-4px) scale(1.02);
    @include shadow-paper(3);
  }

  &:active {
    cursor: grabbing;
    transform: scale(0.98);
  }
}

.item-thumbnail {
  width: 80px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  border-radius: var(--radius-sm);
  @include paper-texture(0.15);
  overflow: hidden;
}

.thumbnail-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  transition: transform var(--transition-normal);

  .decoration-item:hover & {
    transform: scale(1.1);
  }
}

.item-name {
  @include serif-text(12px);
  color: var(--text-secondary);
  text-align: center;
  @include text-ellipsis(1);
  max-width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
  animation: float 3s ease-in-out infinite;
}

.empty-text {
  @include serif-text(14px);
  opacity: 0.7;
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

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>
