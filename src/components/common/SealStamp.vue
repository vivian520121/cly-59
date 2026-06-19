<template>
  <div
    class="seal-stamp"
    :class="{ 'is-mounted': isMounted, 'is-active': active }"
    :style="{
      color: color,
    }"
    @click="$emit('click', $event)"
  >
    <div class="seal-inner" :style="{ transform: `rotate(${rotation + 45}deg)` }">
      <span class="seal-text">
        <slot>{{ text }}</slot>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  text?: string
  color?: string
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '珍藏',
  color: '#B5533F',
  active: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const rotation = ref(0)
const isMounted = ref(false)

onMounted(() => {
  rotation.value = Math.random() * 10 - 5
  requestAnimationFrame(() => {
    isMounted.value = true
  })
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.seal-stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  position: relative;
  opacity: 0;
  transform: scale(1.5) rotate(-10deg);
  transition:
    opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;

  &.is-mounted {
    opacity: 0.5;
    transform: scale(1) rotate(0deg);
  }

  &.is-active {
    opacity: 0.95;
    transform: scale(1.05) rotate(0deg);
  }

  &:hover:not(.is-active) {
    opacity: 0.75;
  }

  &::before {
    content: '';
    position: absolute;
    inset: 2px;
    border: 2px solid currentColor;
    border-radius: 4px;
    opacity: 0.8;
    transform: rotate(45deg);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 6px;
    border: 1px solid currentColor;
    border-radius: 2px;
    opacity: 0.6;
    transform: rotate(45deg);
    filter: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='rough'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='2'/%3E%3C/filter%3E%3C/svg%3E#rough");
  }
}

.seal-inner {
  position: relative;
  z-index: 1;
}

.seal-text {
  font-family: var(--font-handwriting);
  font-size: 16px;
  font-weight: bold;
  color: currentColor;
  letter-spacing: 0.1em;
  writing-mode: vertical-rl;
  text-orientation: upright;
  line-height: 1.2;
  opacity: 0.95;
  mix-blend-mode: multiply;
  filter: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='ink'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='1.5'/%3E%3C/filter%3E%3C/svg%3E#ink");
}
</style>
