<template>
  <aside class="side-filter" :class="{ 'is-open': isOpen }">
    <button
      class="mobile-toggle"
      @click="toggleMobile"
      :aria-label="isOpen ? '关闭筛选' : '打开筛选'"
    >
      <svg v-if="!isOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M7 12h10M10 18h4" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>

    <div class="filter-panel">
      <div class="filter-header">
        <h3 class="filter-title">筛选标本</h3>
        <button
          v-if="hasActiveFilters"
          class="clear-btn"
          @click="clearFilters"
        >
          清除全部
          <span class="count-badge">{{ activeFilterCount }}</span>
        </button>
      </div>

      <div class="filter-section">
        <h4 class="section-title">
          <span class="title-icon">🌸</span>
          季节
        </h4>
        <div class="filter-buttons">
          <button
            v-for="season in seasons"
            :key="season.value"
            class="filter-btn"
            :class="{ active: filterOptions.season === season.value }"
            @click="toggleSeason(season.value)"
          >
            <span class="btn-icon">{{ season.icon }}</span>
            <span class="btn-label">{{ season.label }}</span>
            <BookMarkTag
              v-if="filterOptions.season === season.value"
              :label="season.label"
              :variant="season.value"
              class="active-tag"
            />
          </button>
        </div>
      </div>

      <div class="filter-section">
        <h4 class="section-title">
          <span class="title-icon">🌱</span>
          植物类型
        </h4>
        <div class="filter-buttons">
          <button
            v-for="type in plantTypes"
            :key="type.value"
            class="filter-btn"
            :class="{ active: filterOptions.plantType === type.value }"
            @click="togglePlantType(type.value)"
          >
            <span class="btn-icon">{{ type.icon }}</span>
            <span class="btn-label">{{ type.label }}</span>
            <BookMarkTag
              v-if="filterOptions.plantType === type.value"
              :label="type.label"
              :variant="type.value"
              class="active-tag"
            />
          </button>
        </div>
      </div>

      <div class="filter-section">
        <h4 class="section-title">
          <span class="title-icon">🏔️</span>
          生长环境
        </h4>
        <div class="filter-buttons">
          <button
            v-for="env in environments"
            :key="env.value"
            class="filter-btn"
            :class="{ active: filterOptions.environment === env.value }"
            @click="toggleEnvironment(env.value)"
          >
            <span class="btn-icon">{{ env.icon }}</span>
            <span class="btn-label">{{ env.label }}</span>
            <BookMarkTag
              v-if="filterOptions.environment === env.value"
              :label="env.label"
              :variant="env.value"
              class="active-tag"
            />
          </button>
        </div>
      </div>

      <div class="filter-footer">
        <p class="result-count">
          共 <strong>{{ filteredSpecimens.length }}</strong> 件标本
        </p>
      </div>
    </div>

    <div
      v-if="isOpen"
      class="mobile-overlay"
      @click="isOpen = false"
    ></div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BookMarkTag from '@/components/common/BookMarkTag.vue'
import { useFilter } from '@/composables/useFilter'
import type { Season, PlantType, Environment } from '@/types'

const {
  filterOptions,
  filteredSpecimens,
  hasActiveFilters,
  activeFilterCount,
  toggleSeason,
  togglePlantType,
  toggleEnvironment,
  clearFilters,
} = useFilter()

const isOpen = ref(false)

const seasons = [
  { value: 'spring' as Season, label: '春', icon: '🌷' },
  { value: 'summer' as Season, label: '夏', icon: '☀️' },
  { value: 'autumn' as Season, label: '秋', icon: '🍂' },
  { value: 'winter' as Season, label: '冬', icon: '❄️' },
]

const plantTypes = [
  { value: 'herbaceous' as PlantType, label: '草本', icon: '🌿' },
  { value: 'woody' as PlantType, label: '木本', icon: '🌳' },
]

const environments = [
  { value: 'mountain' as Environment, label: '山野', icon: '⛰️' },
  { value: 'courtyard' as Environment, label: '庭院', icon: '🏡' },
]

function toggleMobile() {
  isOpen.value = !isOpen.value
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.side-filter {
  position: relative;
  width: 280px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    top: 72px;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    z-index: 90;
    pointer-events: none;

    &.is-open {
      pointer-events: auto;
    }
  }
}

.mobile-toggle {
  @include button-reset;
  display: none;
  position: fixed;
  top: 80px;
  left: var(--spacing-md);
  z-index: 95;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 768px) {
    display: flex;
  }
}

.filter-panel {
  position: sticky;
  top: 88px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: var(--spacing-lg);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  @include scrollbar-custom;
  @include paper-texture(0.3);
  transition:
    transform var(--transition-normal),
    opacity var(--transition-normal);

  @media (max-width: 768px) {
    position: absolute;
    top: 0;
    left: 0;
    width: 280px;
    max-height: calc(100vh - 72px);
    transform: translateX(-100%);
    opacity: 0;
    border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
    border-left: none;

    .is-open & {
      transform: translateX(0);
      opacity: 1;
    }
  }
}

.mobile-overlay {
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    animation: fadeIn var(--transition-normal);
  }
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.filter-title {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin: 0;
}

.clear-btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    background-color: var(--hover-bg);
    color: var(--accent-red);
  }
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  background-color: var(--accent-red);
  border-radius: 10px;
}

.filter-section {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-family: var(--font-serif);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--spacing-md);
}

.title-icon {
  font-size: 1em;
}

.filter-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background-color: transparent;
  border: 1px solid transparent;
  text-align: left;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);

  &:hover {
    background-color: var(--hover-bg);
    transform: translateX(2px);
  }

  &.active {
    background-color: var(--hover-bg);
    border-color: var(--border-color);

    .btn-label {
      font-weight: 600;
    }
  }

  .active-tag {
    margin-left: auto;
  }
}

.btn-icon {
  font-size: 1.2em;
  width: 24px;
  text-align: center;
}

.btn-label {
  font-family: var(--font-serif);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.filter-footer {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
}

.result-count {
  font-family: var(--font-serif);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-align: center;
  margin: 0;

  strong {
    color: var(--plant-primary);
    font-weight: 600;
  }
}

@media (max-width: 480px) {
  .filter-panel {
    width: 100%;
    border-radius: 0;
  }

  .mobile-toggle {
    top: 72px;
  }
}
</style>
