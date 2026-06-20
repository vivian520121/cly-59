<template>
  <div
    class="decoration-panel-top"
    :class="{ 'is-open': isOpen }"
  >
    <div
      class="panel-header"
      @click="toggleDrawer"
    >
      <div class="header-left">
        <span class="panel-icon">🎨</span>
        <span class="panel-title">装饰素材</span>
        <span v-if="decorationCount > 0" class="count-badge">{{ decorationCount }}</span>
      </div>
      <div class="header-right">
        <span class="toggle-text">{{ isOpen ? '收起' : '展开' }}</span>
        <span class="toggle-arrow" :class="{ 'is-open': isOpen }">▼</span>
      </div>
    </div>

    <Transition name="panel-expand">
      <div class="panel-content" v-show="isOpen">
        <div class="content-inner">
          <div class="search-bar">
            <div class="search-wrapper">
              <input
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索装饰..."
                @input="onSearch"
                @click.stop
              />
              <span class="search-icon">🔍</span>
            </div>
          </div>

          <div class="tab-buttons">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="tab-btn"
              :class="{ 'is-active': activeTab === tab.value }"
              @click.stop="activeTab = tab.value"
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
              @click.stop="onItemClick(preset)"
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
    </Transition>
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

interface Props {
  decorationCount?: number
}

interface Emits {
  (e: 'decorationAdded', decoration: DecorationItem): void
  (e: 'decorationDragStart', preset: DecorationPreset): void
  (e: 'decorationDragEnd'): void
}

const props = withDefaults(defineProps<Props>(), {
  decorationCount: 0
})

const emit = defineEmits<Emits>()

const isOpen = ref(false)
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

watch(activeTab, () => {
  searchQuery.value = ''
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.decoration-panel-top {
  width: 100%;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  @include paper-texture(0.15);
  @include shadow-paper(2);
  transition: all var(--transition-normal);

  &.is-open {
    @include shadow-paper(3);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  @include not-selectable;

  &:hover {
    background-color: var(--hover-bg);
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.panel-icon {
  font-size: 20px;
}

.panel-title {
  @include handwriting(18px);
  color: var(--text-primary);
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background-color: var(--plant-primary);
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.toggle-text {
  @include serif-text(13px);
  color: var(--text-secondary);
}

.toggle-arrow {
  font-size: 12px;
  color: var(--text-secondary);
  transition: transform var(--transition-fast);

  &.is-open {
    transform: rotate(180deg);
  }
}

.panel-expand-enter-active,
.panel-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.panel-expand-enter-from,
.panel-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.panel-expand-enter-to,
.panel-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

.panel-content {
  overflow: hidden;
}

.content-inner {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
}

.search-bar {
  margin-bottom: var(--spacing-md);
}

.search-wrapper {
  position: relative;
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
  margin-bottom: var(--spacing-md);
  overflow-x: auto;
  padding-bottom: 4px;
  @include scrollbar-hide;
}

.tab-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: var(--bg-paper);
  border: 2px solid var(--border-color);
  border-radius: 9999px;
  cursor: pointer;
  transition: all var(--transition-fast);
  @include not-selectable;

  &:hover {
    border-color: var(--plant-primary);
    transform: translateY(-1px);
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
  font-size: 16px;
}

.tab-label {
  @include serif-text(13px, 500);
  color: var(--text-primary);
}

.tab-count {
  @include typewriter-text;
  font-size: 11px;
  padding: 1px 5px;
  background-color: var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);

  .tab-btn.is-active & {
    background-color: rgba(255, 255, 255, 0.2);
  }
}

.decoration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
  @include scrollbar-custom;
}

.decoration-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  background-color: var(--bg-paper);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: grab;
  transition: all var(--transition-fast);
  @include not-selectable;
  animation: fadeInUp 0.3s ease-out backwards;

  &:nth-child(1) { animation-delay: 0.03s; }
  &:nth-child(2) { animation-delay: 0.06s; }
  &:nth-child(3) { animation-delay: 0.09s; }
  &:nth-child(4) { animation-delay: 0.12s; }
  &:nth-child(5) { animation-delay: 0.15s; }
  &:nth-child(6) { animation-delay: 0.18s; }

  &:hover {
    border-color: var(--plant-primary);
    transform: translateY(-2px) scale(1.02);
    @include shadow-paper(2);
  }

  &:active {
    cursor: grabbing;
    transform: scale(0.98);
  }
}

.item-thumbnail {
  width: 70px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  border-radius: var(--radius-sm);
  @include paper-texture(0.1);
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
  @include serif-text(11px);
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
  padding: 32px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 40px;
  opacity: 0.5;
  animation: float 3s ease-in-out infinite;
}

.empty-text {
  @include serif-text(13px);
  opacity: 0.7;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(6px);
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
    transform: translateY(-6px);
  }
}
</style>
