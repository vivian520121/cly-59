<template>
  <div
    class="paper-card"
    :class="[`variant-${variant}`, `elevation-${elevation}`]"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'small' | 'large'
  elevation?: 1 | 2 | 3 | 4
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  elevation: 2,
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.paper-card {
  position: relative;
  background-color: var(--bg-paper);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal);

  @include paper-texture-vintage(0.5);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(ellipse at 20% 30%, rgba(139, 115, 85, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 70%, rgba(166, 139, 91, 0.06) 0%, transparent 50%);
    pointer-events: none;
    animation: paperWrinkle 8s ease-in-out infinite;
  }

  &:hover {
    transform: translateY(-2px);
  }

  &.variant-default {
    padding: var(--spacing-lg);
  }

  &.variant-small {
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
  }

  &.variant-large {
    padding: var(--spacing-xl);
    border-radius: var(--radius-xl);
  }

  &.elevation-1 {
    @include shadow-paper(1);

    &:hover {
      @include shadow-paper(2);
    }
  }

  &.elevation-2 {
    @include shadow-paper(2);

    &:hover {
      @include shadow-paper(3);
    }
  }

  &.elevation-3 {
    @include shadow-paper(3);

    &:hover {
      @include shadow-paper(4);
    }
  }

  &.elevation-4 {
    @include shadow-paper(4);

    &:hover {
      box-shadow:
        0 25px 30px -5px rgba(0, 0, 0, 0.18),
        0 12px 15px -5px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
  }
}
</style>
