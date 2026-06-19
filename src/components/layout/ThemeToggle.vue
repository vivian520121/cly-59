<template>
  <button
    class="theme-toggle"
    :class="{ 'is-forest': isForestMode }"
    @click="toggleTheme"
    :aria-label="isForestMode ? '切换到日间模式' : '切换到森林模式'"
  >
    <span class="toggle-track">
      <span class="toggle-thumb">
        <svg
          v-if="isForestMode"
          class="icon leaf-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
        <svg
          v-else
          class="icon sun-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { isForestMode, toggleTheme } = useTheme()
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.theme-toggle {
  @include button-reset;
  position: relative;
  padding: 4px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-card) 100%);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition:
    background-color var(--transition-slow),
    border-color var(--transition-slow),
    box-shadow var(--transition-slow);

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    @include focus-ring;
  }

  &.is-forest {
    .toggle-track {
      background: linear-gradient(135deg, #2d4a2d 0%, #1a2f1a 100%);
    }

    .toggle-thumb {
      transform: translateX(28px);
      background: linear-gradient(135deg, #7cb342 0%, #558b2f 100%);
      color: #ffffff;
    }

    .leaf-icon {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    .sun-icon {
      opacity: 0;
      transform: rotate(-180deg) scale(0.5);
    }
  }
}

.toggle-track {
  display: flex;
  align-items: center;
  width: 60px;
  height: 32px;
  padding: 0 4px;
  border-radius: 20px;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  transition: background var(--transition-slow);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 50%);
    pointer-events: none;
  }
}

.toggle-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd93d 0%, #ffb347 100%);
  color: #8b4513;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition:
    transform var(--transition-slow) cubic-bezier(0.68, -0.55, 0.265, 1.55),
    background var(--transition-slow),
    color var(--transition-slow);
  position: relative;
  z-index: 1;

  .icon {
    width: 14px;
    height: 14px;
    transition:
      opacity var(--transition-slow),
      transform var(--transition-slow);
    position: absolute;
  }

  .sun-icon {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }

  .leaf-icon {
    opacity: 0;
    transform: rotate(180deg) scale(0.5);
  }
}
</style>
