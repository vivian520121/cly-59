<template>
  <span
    class="bookmark-tag"
    :class="[`variant-${variant}`, { 'is-active': active }]"
    :style="color ? { background: customColorBg, color: customColorText } : {}"
    @click="$emit('click', $event)"
  >
    <span class="tag-label">
      <slot>{{ label }}</slot>
    </span>
    <span class="tag-notch"></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label?: string
  variant?: 'spring' | 'summer' | 'autumn' | 'winter' | 'herbaceous' | 'woody' | 'mountain' | 'courtyard' | 'other'
  active?: boolean
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  variant: 'spring',
  active: false,
  color: undefined,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const customColorBg = computed(() => {
  if (!props.color) return undefined
  return props.color
})

const customColorText = computed(() => {
  if (!props.color) return undefined
  return '#ffffff'
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.bookmark-tag {
  display: inline-flex;
  align-items: center;
  position: relative;
  height: 28px;
  padding: 0 12px 0 14px;
  font-size: var(--font-size-sm);
  font-family: var(--font-serif);
  font-weight: 500;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  cursor: pointer;
  opacity: 0.6;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);

  &.is-active {
    opacity: 1;
    transform: translateX(2px);
    box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.15);
  }

  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.5);
  }

  &:hover:not(.is-active) {
    opacity: 0.85;
    transform: translateX(2px);
    box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.15);
  }

  &.variant-spring {
    background: linear-gradient(135deg, #a8c97a 0%, #8ab661 100%);
    color: #2d4a1c;
  }

  &.variant-summer {
    background: linear-gradient(135deg, #7ab6a8 0%, #5a9e8f 100%);
    color: #1c4a3d;
  }

  &.variant-autumn {
    background: linear-gradient(135deg, #d4a574 0%, #c48c4a 100%);
    color: #4a321c;
  }

  &.variant-winter {
    background: linear-gradient(135deg, #a8b8c9 0%, #8aa0b6 100%);
    color: #1c324a;
  }

  &.variant-herbaceous {
    background: linear-gradient(135deg, #b8d4a0 0%, #9cc47e 100%);
    color: #2d4a1c;
  }

  &.variant-woody {
    background: linear-gradient(135deg, #c9a888 0%, #b08860 100%);
    color: #4a321c;
  }

  &.variant-mountain {
    background: linear-gradient(135deg, #9ab8a8 0%, #7a9e8f 100%);
    color: #1c4a3d;
  }

  &.variant-courtyard {
    background: linear-gradient(135deg, #d4b87a 0%, #c4a05a 100%);
    color: #4a3d1c;
  }

  &.variant-other {
    background: linear-gradient(135deg, #b0a8c9 0%, #9088b0 100%);
    color: #3d324a;
  }
}

.tag-label {
  position: relative;
  z-index: 1;
  margin-left: 4px;
}

.tag-notch {
  position: absolute;
  right: 0;
  top: 0;
  width: 0;
  height: 0;
  border-top: 14px solid transparent;
  border-bottom: 14px solid transparent;
  border-left: 10px solid var(--bg-paper);
}
</style>
