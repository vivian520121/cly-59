<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo-decoration left"></div>
        <h1 class="logo-text">植物标本册</h1>
        <div class="logo-decoration right"></div>
      </div>

      <div class="header-actions">
        <slot name="actions">
          <button class="btn btn-wood" @click="$emit('create')">
            <span class="btn-icon">🌿</span>
            <span class="btn-text">新建标本</span>
          </button>
          <button class="btn btn-secondary" @click="$emit('export')">
            <span class="btn-icon">📖</span>
            <span class="btn-text">导出收藏册</span>
          </button>
          <ThemeToggle />
        </slot>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'

defineEmits<{
  create: []
  export: []
}>()
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 72px;
  background: linear-gradient(180deg, #8b5a2b 0%, #6b4423 50%, #5a3a1d 100%);
  border-bottom: 3px solid #4a2f17;
  box-shadow:
    0 2px 10px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 50px,
        rgba(139, 90, 43, 0.3) 50px,
        rgba(139, 90, 43, 0.3) 51px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 20px,
        rgba(74, 47, 23, 0.2) 20px,
        rgba(74, 47, 23, 0.2) 21px
      );
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg,
      #d4a853 0%,
      #b8860b 20%,
      #d4a853 40%,
      #b8860b 60%,
      #d4a853 80%,
      #b8860b 100%
    );
    opacity: 0.8;
  }
}

.header-content {
  position: relative;
  z-index: 1;
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.logo-decoration {
  width: 24px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #d4a853 100%);
  position: relative;

  &.right {
    background: linear-gradient(90deg, #d4a853 0%, transparent 100%);
  }

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: #d4a853;
    top: 50%;
    transform: translateY(-50%);
  }

  &.left::after {
    right: 0;
  }

  &.right::before {
    left: 0;
  }
}

.logo-text {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-2xl);
  color: #f5e6d3;
  text-shadow:
    1px 1px 2px rgba(0, 0, 0, 0.5),
    0 0 10px rgba(212, 168, 83, 0.3);
  letter-spacing: 0.1em;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-family: var(--font-serif);
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    @include focus-ring(#d4a853);
  }
}

.btn-wood {
  background: linear-gradient(180deg, #a67c52 0%, #8b5a2b 50%, #6b4423 100%);
  color: #f5e6d3;
  border: 1px solid #4a2f17;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &:hover {
    background: linear-gradient(180deg, #b88c62 0%, #9b6a3b 50%, #7b5433 100%);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 8px,
        rgba(74, 47, 23, 0.1) 8px,
        rgba(74, 47, 23, 0.1) 9px
      );
    border-radius: inherit;
    pointer-events: none;
  }
}

.btn-secondary {
  background: rgba(245, 230, 211, 0.1);
  color: #f5e6d3;
  border: 1px solid rgba(245, 230, 211, 0.3);

  &:hover {
    background: rgba(245, 230, 211, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.btn-icon {
  font-size: 1.1em;
}

.btn-text {
  position: relative;
  z-index: 1;
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 var(--spacing-md);
  }

  .logo-text {
    font-size: var(--font-size-xl);
  }

  .logo-decoration {
    width: 16px;
  }

  .btn-text {
    display: none;
  }

  .btn {
    padding: var(--spacing-sm) var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .app-header {
    height: 64px;
  }

  .header-actions {
    gap: var(--spacing-sm);
  }

  .logo-decoration {
    display: none;
  }
}
</style>
