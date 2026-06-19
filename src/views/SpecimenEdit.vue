<template>
  <div class="specimen-edit page-transition-enter">
    <div class="edit-header">
      <button class="back-btn" @click="handleBack">
        <span class="back-icon">←</span>
        <span class="back-text">返回</span>
      </button>
      <h1 class="page-title">{{ isEdit ? '编辑标本' : '新建标本' }}</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="edit-content">
      <div class="left-column">
        <div class="image-section">
          <div
            class="upload-zone"
            :class="{ 'has-image': !!originalImageBlob, 'is-dragover': isDragOver }"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            @click="triggerFileInput"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="file-input"
              @change="onFileSelect"
            />

            <div v-if="!originalImageBlob" class="upload-placeholder">
              <span class="upload-icon">📷</span>
              <p class="upload-text">点击或拖拽图片到此处上传</p>
              <p class="upload-hint">支持粘贴剪贴板图片 (Ctrl+V)</p>
            </div>

            <div v-else class="upload-preview">
              <FilterCanvas
                ref="filterCanvasRef"
                :initial-image="originalImageBlob"
                @filter-applied="onFilterApplied"
              />
            </div>
          </div>

          <div class="upload-actions" v-if="!originalImageBlob">
            <button class="upload-btn" @click="triggerFileInput">
              <span class="btn-icon">📁</span>
              <span class="btn-text">上传图片</span>
            </button>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="tabs-container">
          <div class="tabs">
            <button
              class="tab-btn"
              :class="{ 'is-active': activeTab === 'info' }"
              @click="activeTab = 'info'"
            >
              <span class="tab-icon">📝</span>
              <span class="tab-text">信息</span>
            </button>
            <button
              class="tab-btn"
              :class="{ 'is-active': activeTab === 'decoration' }"
              @click="activeTab = 'decoration'"
              :disabled="!filteredImageBlob && !originalImageBlob"
            >
              <span class="tab-icon">🎨</span>
              <span class="tab-text">装饰</span>
              <span v-if="decorations.length > 0" class="tab-badge">{{ decorations.length }}</span>
            </button>
          </div>
        </div>

        <div class="tab-content">
          <div v-show="activeTab === 'info'" class="info-panel">
            <InfoForm
              ref="infoFormRef"
              v-model="formData"
            />
          </div>

          <div v-show="activeTab === 'decoration'" class="decoration-panel">
            <div v-if="!filteredImageBlob && !originalImageBlob" class="decoration-disabled">
              <span class="disabled-icon">🖼️</span>
              <p class="disabled-text">请先上传图片后再添加装饰</p>
            </div>
            <div v-else class="decoration-canvas-wrapper">
              <DecorationCanvas
                ref="decorationCanvasRef"
                :specimen-image="filteredImageBlob || originalImageBlob"
                :decorations="decorations"
                @update:decorations="decorations = $event; hasUnsavedChanges = true"
                @decoration-selected="onDecorationSelected"
              />
              <DecorationDrawer
                @decoration-added="onDecorationAdded"
                @decoration-drag-start="onDecorationDragStart"
                @decoration-drag-end="onDecorationDragEnd"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <div class="action-left">
        <button
          v-if="isEdit"
          class="action-btn delete-btn"
          @click="handleDelete"
          :disabled="isSaving || isExporting"
        >
          <span class="btn-icon">🗑️</span>
          <span class="btn-text">删除</span>
        </button>
      </div>

      <div class="action-right">
        <button
          class="action-btn secondary-btn"
          @click="handlePreview"
          :disabled="!canSave || isSaving || isExporting"
        >
          <span class="btn-icon">👁️</span>
          <span class="btn-text">预览</span>
        </button>

        <button
          class="action-btn secondary-btn"
          @click="handleExport"
          :disabled="!canExport || isSaving || isExporting"
        >
          <span v-if="!isExporting" class="btn-icon">📥</span>
          <span v-else class="btn-icon loading"></span>
          <span class="btn-text">{{ isExporting ? '导出中...' : '导出长图' }}</span>
        </button>

        <button
          class="action-btn primary-btn"
          @click="handleSave"
          :disabled="!canSave || isSaving || isExporting"
        >
          <span v-if="!isSaving" class="btn-icon">💾</span>
          <span v-else class="btn-icon loading"></span>
          <span class="btn-text">{{ isSaving ? '保存中...' : '保存' }}</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPreview" class="preview-modal" @click.self="showPreview = false">
          <div class="preview-content">
            <button class="close-btn" @click="showPreview = false">×</button>
            <div class="preview-container">
              <img v-if="previewImageUrl" :src="previewImageUrl" alt="预览" class="preview-image" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showUnsavedWarning" class="confirm-modal">
          <div class="confirm-content">
            <h3 class="confirm-title">有未保存的更改</h3>
            <p class="confirm-message">确定要离开吗？当前的更改将会丢失。</p>
            <div class="confirm-actions">
              <button class="confirm-btn cancel-btn" @click="showUnsavedWarning = false">
                取消
              </button>
              <button class="confirm-btn confirm-btn-primary" @click="confirmLeave">
                确定离开
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import FilterCanvas from '@/components/specimen/FilterCanvas.vue'
import InfoForm from '@/components/specimen/InfoForm.vue'
import DecorationCanvas from '@/components/specimen/DecorationCanvas.vue'
import DecorationDrawer from '@/components/specimen/DecorationDrawer.vue'
import { useSpecimens } from '@/composables/useSpecimens'
import { useExport } from '@/composables/useExport'
import type { SpecimenFormData, DecorationItem, DecorationType, Specimen } from '@/types'

const route = useRoute()
const router = useRouter()

const {
  loading,
  createSpecimen,
  updateSpecimen,
  removeSpecimen,
  loadSpecimenById,
  getSpecimenById,
  setCurrentSpecimen,
  blobToDataURL
} = useSpecimens()

const {
  exporting: isExporting,
  exportLongImageAndDownload
} = useExport()

const fileInputRef = ref<HTMLInputElement | null>(null)
const filterCanvasRef = ref<InstanceType<typeof FilterCanvas> | null>(null)
const infoFormRef = ref<InstanceType<typeof InfoForm> | null>(null)
const decorationCanvasRef = ref<InstanceType<typeof DecorationCanvas> | null>(null)

const isEdit = computed(() => !!route.params.id)
const activeTab = ref<'info' | 'decoration'>('info')
const originalImageBlob = ref<Blob | null>(null)
const filteredImageBlob = ref<Blob | null>(null)
const isDragOver = ref(false)
const isSaving = ref(false)
const showPreview = ref(false)
const showUnsavedWarning = ref(false)
const previewImageUrl = ref<string | null>(null)
const hasUnsavedChanges = ref(false)
const pendingNavigation = ref<string | null>(null)

const formData = reactive<SpecimenFormData>({
  name: '',
  location: '',
  season: 'spring',
  plantType: 'herbaceous',
  environment: 'mountain',
  bloomPeriod: [],
  notes: ''
})

const decorations = ref<DecorationItem[]>([])

const canSave = computed(() => {
  const hasImage = !!originalImageBlob.value
  const hasName = formData.name.trim().length > 0
  const hasLocation = formData.location.trim().length > 0
  const hasSeason = !!formData.season
  return hasImage && hasName && hasLocation && hasSeason && !isSaving.value && !isExporting.value
})

const canExport = computed(() => {
  const hasImage = !!originalImageBlob.value
  return hasImage && !isSaving.value && !isExporting.value
})

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    handleImageFile(file)
  }
}

function onDragOver(e: DragEvent) {
  isDragOver.value = true
}

function onDragLeave(e: DragEvent) {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    handleImageFile(file)
  }
}

function handleImageFile(file: File) {
  originalImageBlob.value = file
  filteredImageBlob.value = null
  hasUnsavedChanges.value = true
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        handleImageFile(file)
        e.preventDefault()
        break
      }
    }
  }
}

function onFilterApplied(blob: Blob) {
  filteredImageBlob.value = blob
  hasUnsavedChanges.value = true
}

function onDecorationAdded(decoration: DecorationItem) {
  decorations.value = [...decorations.value, decoration]
  hasUnsavedChanges.value = true
}

function onDecorationSelected(decoration: DecorationItem | null) {
}

function onDecorationDragStart() {
}

function onDecorationDragEnd() {
}

async function loadExistingSpecimen() {
  if (!isEdit.value) return

  const id = Number(route.params.id)
  if (isNaN(id)) return

  try {
    await loadSpecimenById(id)
    const specimen = getSpecimenById(id)
    
    if (specimen) {
      formData.name = specimen.name
      formData.location = specimen.location
      formData.season = specimen.season
      formData.plantType = specimen.plantType
      formData.environment = specimen.environment
      formData.bloomPeriod = [...specimen.bloomPeriod]
      formData.notes = specimen.notes
      
      originalImageBlob.value = specimen.imageBlob
      filteredImageBlob.value = specimen.filteredImageBlob
      decorations.value = [...specimen.decorations]
      
      setCurrentSpecimen(specimen)
    }
  } catch (error) {
    console.error('Failed to load specimen:', error)
  }
}

async function handleSave() {
  if (!infoFormRef.value?.validate()) {
    return
  }

  if (!originalImageBlob.value) {
    return
  }

  isSaving.value = true
  try {
    if (isEdit.value) {
      const id = Number(route.params.id)
      await updateSpecimen(id, {
        ...formData,
        imageBlob: originalImageBlob.value,
        filteredImageBlob: filteredImageBlob.value,
        decorations: decorations.value,
        updatedAt: new Date()
      })
    } else {
      await createSpecimen(formData, originalImageBlob.value)
    }
    
    hasUnsavedChanges.value = false
    router.push('/')
  } catch (error) {
    console.error('Failed to save specimen:', error)
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!isEdit.value) return
  
  if (!confirm('确定要删除这份标本吗？此操作无法撤销。')) {
    return
  }

  const id = Number(route.params.id)
  try {
    await removeSpecimen(id)
    hasUnsavedChanges.value = false
    router.push('/')
  } catch (error) {
    console.error('Failed to delete specimen:', error)
  }
}

async function handlePreview() {
  if (!canSave.value) return
  
  try {
    const imageBlob = filteredImageBlob.value || originalImageBlob.value
    if (imageBlob) {
      previewImageUrl.value = await blobToDataURL(imageBlob)
      showPreview.value = true
    }
  } catch (error) {
    console.error('Failed to generate preview:', error)
  }
}

async function handleExport() {
  if (!canExport.value) return
  
  try {
    const specimen: Specimen = {
      id: isEdit.value ? Number(route.params.id) : undefined,
      name: formData.name || '未命名标本',
      imageBlob: originalImageBlob.value,
      filteredImageBlob: filteredImageBlob.value,
      location: formData.location || '—',
      season: formData.season,
      plantType: formData.plantType,
      environment: formData.environment,
      bloomPeriod: formData.bloomPeriod,
      notes: formData.notes,
      positionIndex: 0,
      decorations: decorations.value,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await exportLongImageAndDownload(specimen)
  } catch (error) {
    console.error('Failed to export image:', error)
  }
}

function handleBack() {
  if (hasUnsavedChanges.value) {
    pendingNavigation.value = '/'
    showUnsavedWarning.value = true
  } else {
    router.push('/')
  }
}

function confirmLeave() {
  showUnsavedWarning.value = false
  hasUnsavedChanges.value = false
  if (pendingNavigation.value) {
    router.push(pendingNavigation.value)
  }
}

watch(
  () => [formData.name, formData.location, formData.notes],
  () => {
    hasUnsavedChanges.value = true
  },
  { deep: true }
)

watch(
  () => decorations.value,
  () => {
    hasUnsavedChanges.value = true
  },
  { deep: true }
)

onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value && !showUnsavedWarning.value) {
    pendingNavigation.value = to.fullPath
    showUnsavedWarning.value = true
    next(false)
  } else {
    next()
  }
})

onMounted(async () => {
  await loadExistingSpecimen()
  document.addEventListener('paste', onPaste)
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', onPaste)
  setCurrentSpecimen(null)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.specimen-edit {
  min-height: 100vh;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.page-transition-enter {
  animation: pageFlipEnter 0.5s ease-out;
}

@keyframes pageFlipEnter {
  0% {
    opacity: 0;
    transform: perspective(1200px) rotateY(-90deg);
    transform-origin: left center;
  }
  100% {
    opacity: 1;
    transform: perspective(1200px) rotateY(0deg);
    transform-origin: left center;
  }
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  @include paper-texture(0.2);

  @media (max-width: 768px) {
    padding: var(--spacing-md);
  }
}

.back-btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  @include serif-text(14px);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--hover-bg);
    transform: translateX(-2px);
  }

  .back-icon {
    font-size: 18px;
  }
}

.page-title {
  @include handwriting(28px);
  color: var(--text-primary);
  margin: 0;

  @media (max-width: 768px) {
    font-size: 22px;
  }
}

.header-spacer {
  width: 80px;
}

.edit-content {
  flex: 1;
  display: flex;
  gap: var(--spacing-xl);
  padding: var(--spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding-bottom: 100px;

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  @media (max-width: 768px) {
    padding: var(--spacing-md);
    padding-bottom: 120px;
  }
}

.left-column {
  flex: 1;
  min-width: 0;
}

.right-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.image-section {
  position: sticky;
  top: var(--spacing-xl);
}

.upload-zone {
  min-height: 400px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  background-color: var(--bg-card);
  @include paper-texture(0.2);

  &:hover,
  &.is-dragover {
    border-color: var(--plant-primary);
    background-color: var(--hover-bg);
  }

  &.has-image {
    border: none;
    cursor: default;
    background-color: transparent;
    @include paper-texture(0);
  }

  @media (max-width: 768px) {
    min-height: 300px;
  }
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
  padding: var(--spacing-2xl);
}

.upload-icon {
  font-size: 64px;
  opacity: 0.5;
  animation: float 3s ease-in-out infinite;
}

.upload-text {
  @include serif-text(16px);
  color: var(--text-primary);
  margin: 0;
}

.upload-hint {
  @include serif-text(13px);
  color: var(--text-secondary);
  margin: 0;
}

.upload-preview {
  width: 100%;
}

.upload-actions {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-lg);
}

.upload-btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  background: linear-gradient(135deg, var(--plant-primary) 0%, #5a7247 100%);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  @include handwriting(16px);
  cursor: pointer;
  transition: all var(--transition-normal);
  @include shadow-paper(2);

  &:hover {
    transform: translateY(-2px);
    @include shadow-paper(3);
  }

  .btn-icon {
    font-size: 20px;
  }
}

.tabs-container {
  margin-bottom: var(--spacing-lg);
}

.tabs {
  display: flex;
  gap: var(--spacing-sm);
  background-color: var(--bg-card);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  @include paper-texture(0.15);
}

.tab-btn {
  @include button-reset;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: transparent;
  border-radius: var(--radius-sm);
  @include serif-text(14px, 600);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;

  &:hover:not(:disabled) {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.is-active {
    background-color: var(--hover-bg);
    color: var(--text-primary);
    @include shadow-paper(1);

    &::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: var(--spacing-md);
      right: var(--spacing-md);
      height: 2px;
      background-color: var(--plant-primary);
      border-radius: 1px;
    }
  }

  .tab-icon {
    font-size: 18px;
  }

  .tab-badge {
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
}

.tab-content {
  flex: 1;
}

.info-panel,
.decoration-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.decoration-disabled {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  text-align: center;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  @include paper-texture(0.2);

  .disabled-icon {
    font-size: 48px;
    opacity: 0.5;
    margin-bottom: var(--spacing-md);
  }

  .disabled-text {
    @include serif-text(14px);
    color: var(--text-secondary);
    margin: 0;
  }
}

.decoration-canvas-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-xl);
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  @include paper-texture(0.3);
  z-index: 100;

  @media (max-width: 768px) {
    padding: var(--spacing-sm) var(--spacing-md);
    gap: var(--spacing-sm);
  }
}

.action-left {
  display: flex;
  gap: var(--spacing-sm);
}

.action-right {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  @include button-reset;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  @include handwriting(15px);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .btn-icon {
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;

    &.loading {
      width: 18px;
      height: 18px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }

  @media (max-width: 480px) {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 13px;

    .btn-text {
      display: none;
    }
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

.delete-btn {
  background-color: transparent;
  border: 1px solid var(--accent-red);
  color: var(--accent-red);

  &:hover:not(:disabled) {
    background-color: rgba(166, 68, 68, 0.1);
  }
}

.secondary-btn {
  background-color: var(--bg-paper);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  @include paper-texture(0.15);

  &:hover:not(:disabled) {
    background-color: var(--hover-bg);
    @include shadow-paper(2);
  }
}

.primary-btn {
  background: linear-gradient(135deg, var(--plant-primary) 0%, #5a7247 100%);
  border: none;
  color: #fff;
  @include shadow-paper(2);

  &:hover:not(:disabled) {
    @include shadow-paper(3);
  }
}

.preview-modal,
.confirm-modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-xl);
}

.preview-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  @include paper-texture-vintage(0.4);
  @include shadow-paper(4);
}

.close-btn {
  @include button-reset;
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-paper);
  border: 1px solid var(--border-color);
  font-size: 24px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  z-index: 1;

  &:hover {
    background-color: var(--hover-bg);
    transform: rotate(90deg);
  }
}

.preview-container {
  max-width: 800px;
  max-height: 70vh;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: var(--radius-md);
}

.confirm-content {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  max-width: 400px;
  width: 100%;
  text-align: center;
  @include paper-texture-vintage(0.4);
  @include shadow-paper(4);
}

.confirm-title {
  @include handwriting(24px);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.confirm-message {
  @include serif-text(15px);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-xl) 0;
  line-height: 1.8;
}

.confirm-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.confirm-btn {
  @include button-reset;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  @include handwriting(15px);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex: 1;

  &:hover {
    transform: translateY(-1px);
  }
}

.cancel-btn {
  background-color: var(--bg-paper);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.confirm-btn-primary {
  background-color: var(--accent-red);
  border: none;
  color: #fff;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .preview-content,
.modal-enter-active .confirm-content {
  animation: modalIn 0.3s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
