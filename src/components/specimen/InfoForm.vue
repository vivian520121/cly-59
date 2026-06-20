<template>
  <div class="info-form">
    <div class="form-paper">
      <div class="paper-holes">
        <span class="hole"></span>
        <span class="hole"></span>
        <span class="hole"></span>
      </div>

      <div class="form-content">
        <div class="form-field">
          <label class="field-label">
            <span class="label-icon">🌱</span>
            植物名称
          </label>
          <input
            v-model="localData.name"
            type="text"
            class="name-input handwriting-input"
            placeholder="请输入植物名称"
            @input="emitUpdate"
          />
          <div v-if="errors.name" class="field-error">{{ errors.name }}</div>
        </div>

        <div class="form-field">
          <label class="field-label">
            <span class="label-icon">📍</span>
            采集地点
          </label>
          <input
            v-model="localData.location"
            type="text"
            class="text-input"
            placeholder="请输入采集地点"
            @input="emitUpdate"
          />
          <div v-if="errors.location" class="field-error">{{ errors.location }}</div>
        </div>

        <div class="form-field">
          <label class="field-label">
            <span class="label-icon">📅</span>
            采集季节
          </label>
          <div class="season-selector">
            <SealStamp
              v-for="season in seasons"
              :key="season.value"
              :active="localData.season === season.value"
              :color="season.color"
              @click="selectSeason(season.value)"
            >
              {{ season.label }}
            </SealStamp>
          </div>
          <div v-if="errors.season" class="field-error">{{ errors.season }}</div>
        </div>

        <div class="form-row">
          <div class="form-field half-width">
            <label class="field-label">
              <span class="label-icon">🌿</span>
              植物类型
            </label>
            <div class="radio-group">
              <label
                v-for="type in plantTypes"
                :key="type.value"
                class="radio-item"
                :class="{ 'is-checked': localData.plantType === type.value }"
              >
                <input
                  type="radio"
                  :value="type.value"
                  v-model="localData.plantType"
                  @change="emitUpdate"
                />
                <span class="radio-custom"></span>
                <span class="radio-label">{{ type.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-field half-width">
            <label class="field-label">
              <span class="label-icon">🏔️</span>
              生长环境
            </label>
            <div class="radio-group">
              <label
                v-for="env in environments"
                :key="env.value"
                class="radio-item"
                :class="{ 'is-checked': localData.environment === env.value }"
              >
                <input
                  type="radio"
                  :value="env.value"
                  v-model="localData.environment"
                  @change="emitUpdate"
                />
                <span class="radio-custom"></span>
                <span class="radio-label">{{ env.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-field">
          <label class="field-label">
            <span class="label-icon">🌸</span>
            花期
            <span class="label-hint">(可多选)</span>
          </label>
          <div class="tags-container">
            <span
              v-for="period in bloomPeriods"
              :key="period.value"
              class="bloom-tag-wrapper"
              :class="{ 'is-active': localData.bloomPeriod.includes(period.value) }"
              @click="toggleBloomPeriod(period.value)"
            >
              <BookMarkTag :label="period.label" :variant="period.variant" />
            </span>
          </div>
        </div>

        <div class="form-field">
          <label class="field-label">
            <span class="label-icon">📝</span>
            备注
          </label>
          <div class="textarea-wrapper">
            <div class="paper-lines"></div>
            <textarea
              v-model="localData.notes"
              class="notes-textarea"
              placeholder="记录采集时的故事和观察..."
              rows="5"
              @input="emitUpdate"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { SpecimenFormData, Season, PlantType, Environment } from '@/types'
import BookMarkTag from '@/components/common/BookMarkTag.vue'
import SealStamp from '@/components/common/SealStamp.vue'

interface Props {
  modelValue: SpecimenFormData
}

interface Emits {
  (e: 'update:modelValue', value: SpecimenFormData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localData = reactive<SpecimenFormData>({
  ...props.modelValue,
  bloomPeriod: [...props.modelValue.bloomPeriod]
})
const errors = reactive<Partial<Record<keyof SpecimenFormData, string>>>({})

const seasons: { value: Season; label: string; color: string }[] = [
  { value: 'spring', label: '春', color: '#7CB342' },
  { value: 'summer', label: '夏', color: '#FFB300' },
  { value: 'autumn', label: '秋', color: '#E65100' },
  { value: 'winter', label: '冬', color: '#5C6BC0' }
]

const plantTypes: { value: PlantType; label: string }[] = [
  { value: 'herbaceous', label: '草本' },
  { value: 'woody', label: '木本' }
]

const environments: { value: Environment; label: string }[] = [
  { value: 'mountain', label: '山野' },
  { value: 'courtyard', label: '庭院' },
  { value: 'other', label: '其他' }
]

const bloomPeriods: { value: string; label: string; variant: 'spring' | 'summer' | 'autumn' | 'winter' }[] = [
  { value: 'earlySpring', label: '初春', variant: 'spring' },
  { value: 'spring', label: '春季', variant: 'spring' },
  { value: 'lateSpring', label: '晚春', variant: 'spring' },
  { value: 'earlySummer', label: '初夏', variant: 'summer' },
  { value: 'summer', label: '夏季', variant: 'summer' },
  { value: 'lateSummer', label: '夏末', variant: 'summer' },
  { value: 'autumn', label: '秋季', variant: 'autumn' },
  { value: 'winter', label: '冬季', variant: 'winter' }
]

function selectSeason(season: Season) {
  localData.season = season
  emitUpdate()
}

function toggleBloomPeriod(period: string) {
  const index = localData.bloomPeriod.indexOf(period)
  if (index === -1) {
    localData.bloomPeriod.push(period)
  } else {
    localData.bloomPeriod.splice(index, 1)
  }
  emitUpdate()
}

function emitUpdate() {
  validateForm()
  emit('update:modelValue', {
    ...localData,
    bloomPeriod: [...localData.bloomPeriod]
  })
}

function validateForm() {
  Object.keys(errors).forEach(key => {
    delete errors[key as keyof SpecimenFormData]
  })

  if (!localData.name.trim()) {
    errors.name = '请输入植物名称'
  }

  if (!localData.location.trim()) {
    errors.location = '请输入采集地点'
  }

  if (!localData.season) {
    errors.season = '请选择采集季节'
  }
}

watch(
  () => props.modelValue,
  (newValue) => {
    Object.assign(localData, newValue, {
      bloomPeriod: [...newValue.bloomPeriod]
    })
  },
  { deep: true }
)

defineExpose({
  validate: () => {
    validateForm()
    return Object.keys(errors).length === 0
  },
  getErrors: () => errors
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.info-form {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.form-paper {
  position: relative;
  background-color: var(--bg-paper);
  border-radius: var(--radius-md);
  padding: 32px 32px 32px 60px;
  @include paper-texture-vintage(0.5);
  @include aged-paper-edge;
  @include shadow-paper(3);
}

.paper-holes {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 40px;

  .hole {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: var(--bg-primary);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-row {
  display: flex;
  gap: 24px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.half-width {
    flex: 1;
  }
}

.field-label {
  @include serif-text(15px, 600);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;

  .label-icon {
    font-size: 18px;
  }

  .label-hint {
    @include serif-text(12px);
    color: var(--text-secondary);
    font-weight: 400;
  }
}

.name-input {
  @include handwriting(28px);
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-bottom: 2px dashed var(--border-color);
  padding: 8px 0;
  outline: none;
  transition: border-color var(--transition-fast);
  text-align: center;

  &::placeholder {
    opacity: 0.5;
  }

  &:focus {
    border-bottom-color: var(--plant-primary);
  }
}

.text-input {
  @include serif-text(16px);
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color);
  padding: 8px 4px;
  outline: none;
  transition: border-color var(--transition-fast);

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:focus {
    border-bottom-color: var(--plant-primary);
  }
}

.field-error {
  @include serif-text(12px);
  color: var(--color-day-error);
  margin-top: -8px;
}

.season-selector {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 16px 0;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
  @include not-selectable;

  &:hover {
    background-color: var(--hover-bg);
  }

  &.is-checked {
    background-color: var(--hover-bg);

    .radio-custom {
      border-color: var(--plant-primary);
      background-color: var(--plant-primary);

      &::after {
        transform: scale(1);
      }
    }
  }

  input[type='radio'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
}

.radio-custom {
  position: relative;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  transition: all var(--transition-fast);

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #fff;
    transition: transform var(--transition-fast);
  }
}

.radio-label {
  @include serif-text(15px);
  color: var(--text-primary);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.bloom-tag-wrapper {
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0.6;

  &:hover {
    opacity: 0.9;
    transform: translateX(2px);
  }

  &.is-active {
    opacity: 1;
    transform: translateX(2px);
  }
}

.textarea-wrapper {
  position: relative;
  width: 100%;
}

.paper-lines {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    transparent,
    transparent 27px,
    var(--border-color) 27px,
    var(--border-color) 28px
  );
  pointer-events: none;
  opacity: 0.5;
}

.notes-textarea {
  width: 100%;
  @include handwriting(18px);
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  resize: vertical;
  line-height: 28px;
  padding: 0 4px;
  min-height: 140px;

  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }
}

:global([data-theme='forest']) {
  .paper-holes .hole {
    background-color: var(--color-forest-bg);
  }
}
</style>
