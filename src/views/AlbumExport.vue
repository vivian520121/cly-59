<template>
  <div class="album-export">
    <nav class="breadcrumb" :class="{ 'is-visible': !isFlipping }">
      <router-link to="/" class="breadcrumb-link">
        <span class="breadcrumb-icon">←</span>
        <span>返回标本陈列墙</span>
      </router-link>
    </nav>

    <transition name="fade" mode="out-in">
      <div v-if="specimens.length === 0" key="empty" class="empty-state">
        <div class="empty-icon">📚</div>
        <h2 class="empty-title">还没有标本</h2>
        <p class="empty-subtitle">先去采集一些植物标本，再来制作收藏册吧</p>
        <router-link to="/specimen/new" class="btn btn-primary">
          新建标本
        </router-link>
      </div>

      <div v-else key="content" class="export-container">
        <header class="export-header">
          <h1 class="page-title">收藏册导出</h1>
          <p class="page-subtitle">将你的标本收藏导出为精美的 PDF 画册</p>
        </header>

        <div class="export-content">
          <div class="preview-section">
            <div class="preview-tabs">
              <button
                class="tab-btn"
                :class="{ active: previewMode === 'single' }"
                @click="previewMode = 'single'"
              >
                单页预览
              </button>
              <button
                class="tab-btn"
                :class="{ active: previewMode === 'grid' }"
                @click="previewMode = 'grid'"
              >
                概览网格
              </button>
              <button
                class="tab-btn"
                :class="{ active: previewMode === 'cover' }"
                @click="previewMode = 'cover'"
              >
                封面设计
              </button>
            </div>

            <div class="preview-area">
              <transition name="page-flip" mode="out-in">
                <div v-if="previewMode === 'single'" key="single" class="single-preview">
                  <div class="page-container">
                    <button
                      class="nav-btn prev-btn"
                      :disabled="currentPreviewIndex === 0"
                      @click="navigatePreview(-1)"
                    >
                      ‹
                    </button>
                    <div class="page-wrapper" ref="pageWrapperRef">
                      <transition name="page-flip" mode="out-in">
                        <img
                          v-if="currentPreviewURL"
                          :key="currentPreviewIndex"
                          :src="currentPreviewURL"
                          :alt="currentSpecimen?.name"
                          class="preview-image"
                          @load="onPreviewLoad"
                        />
                      </transition>
                      <div v-if="loadingPreview" class="preview-loading">
                        <div class="spinner"></div>
                        <span>加载中...</span>
                      </div>
                    </div>
                    <button
                      class="nav-btn next-btn"
                      :disabled="currentPreviewIndex === specimens.length - 1"
                      @click="navigatePreview(1)"
                    >
                      ›
                    </button>
                  </div>
                  <div class="preview-info">
                    <span class="specimen-name">{{ currentSpecimen?.name }}</span>
                    <span class="page-indicator">
                      {{ currentPreviewIndex + 1 }} / {{ specimens.length }}
                    </span>
                  </div>
                  <div class="preview-dots">
                    <button
                      v-for="(_, index) in specimens"
                      :key="index"
                      class="dot"
                      :class="{ active: index === currentPreviewIndex }"
                      @click="goToPreview(index)"
                    ></button>
                  </div>
                </div>

                <div v-else-if="previewMode === 'grid'" key="grid" class="grid-preview">
                  <div class="grid-container">
                    <div
                      v-for="(specimen, index) in specimens"
                      :key="specimen.id"
                      class="grid-item"
                      :class="{ 'is-loaded': previewGridURLs[index] }"
                    >
                      <img
                        v-if="previewGridURLs[index]"
                        :src="previewGridURLs[index]"
                        :alt="specimen.name"
                        class="grid-image"
                      />
                      <div v-else class="grid-placeholder">
                        <div class="spinner small"></div>
                      </div>
                      <div class="grid-overlay">
                        <span class="grid-name">{{ specimen.name }}</span>
                        <span class="grid-number">#{{ index + 1 }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else-if="previewMode === 'cover'" key="cover" class="cover-preview">
                  <div class="cover-wrapper">
                    <img
                      v-if="coverPreviewURL"
                      :src="coverPreviewURL"
                      alt="封面预览"
                      class="cover-image"
                    />
                    <div v-else class="cover-loading">
                      <div class="spinner"></div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <aside class="settings-section">
            <div class="settings-card">
              <h3 class="settings-title">导出设置</h3>

              <div class="form-group">
                <label class="form-label">相册标题</label>
                <input
                  v-model="exportOptions.title"
                  type="text"
                  class="form-input handwriting-input"
                  placeholder="我的植物标本册"
                  maxlength="20"
                />
              </div>

              <div class="form-group">
                <label class="form-label">纸张风格</label>
                <div class="paper-style-selector">
                  <button
                    v-for="style in paperStyles"
                    :key="style.value"
                    class="style-btn"
                    :class="{ active: exportOptions.paperStyle === style.value }"
                    @click="selectPaperStyle(style.value)"
                  >
                    <span
                      class="style-swatch"
                      :style="{ backgroundColor: style.color }"
                    ></span>
                    <span class="style-name">{{ style.label }}</span>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label checkbox-label">
                  <input
                    v-model="exportOptions.includeIndex"
                    type="checkbox"
                    class="checkbox"
                  />
                  <span class="checkbox-custom"></span>
                  <span>包含目录页</span>
                  <span v-if="specimens.length <= 5" class="hint">
                    (标本超过 5 项时显示)
                  </span>
                </label>
              </div>

              <div class="form-group stats-group">
                <div class="stat-item">
                  <span class="stat-value">{{ specimens.length }}</span>
                  <span class="stat-label">标本数量</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ estimatedPages }}</span>
                  <span class="stat-label">预计页数</span>
                </div>
              </div>

              <div class="action-buttons">
                <button
                  class="btn btn-secondary btn-block"
                  :disabled="exporting"
                  @click="showFullPreview"
                >
                  <span class="btn-icon">👁</span>
                  预览
                </button>
                <button
                  class="btn btn-primary btn-block export-btn"
                  :disabled="exporting"
                  @click="handleExportPDF"
                >
                  <span v-if="exporting" class="btn-content">
                    <span class="spinner small"></span>
                    <span>导出中 {{ progress }}%</span>
                  </span>
                  <span v-else class="btn-content">
                    <span class="btn-icon">📄</span>
                    导出 PDF
                  </span>
                </button>
              </div>

              <div v-if="error" class="error-message">
                <span class="error-icon">⚠</span>
                {{ error.message }}
                <button class="error-close" @click="clearError">×</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">全屏预览</h3>
            <button class="modal-close" @click="closeModal">×</button>
          </div>
          <div class="modal-body">
            <div class="modal-preview">
              <div class="modal-page-container">
                <button
                  class="nav-btn prev-btn"
                  :disabled="modalIndex === 0"
                  @click="navigateModal(-1)"
                >
                  ‹
                </button>
                <div class="modal-page-wrapper">
                  <transition name="page-flip" mode="out-in">
                    <img
                      v-if="modalPreviewURL"
                      :key="modalIndex"
                      :src="modalPreviewURL"
                      alt="预览"
                      class="modal-preview-image"
                    />
                  </transition>
                </div>
                <button
                  class="nav-btn next-btn"
                  :disabled="modalIndex === specimens.length - 1"
                  @click="navigateModal(1)"
                >
                  ›
                </button>
              </div>
              <div class="modal-indicator">
                {{ modalIndex + 1 }} / {{ specimens.length }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useSpecimens } from '@/composables/useSpecimens'
import { useExport } from '@/composables/useExport'
import type { PaperStyle, ExportOptions } from '@/services/ExportService'
import type { Specimen } from '@/types/specimen'

const { specimens } = useSpecimens()
const {
  exporting,
  progress,
  error,
  exportAlbumPDFAndDownload,
  generatePreviewDataURL,
  generateCoverPreview,
  clearError,
} = useExport()

const previewMode = ref<'single' | 'grid' | 'cover'>('single')
const currentPreviewIndex = ref(0)
const loadingPreview = ref(false)
const isFlipping = ref(false)
const currentPreviewURL = ref<string>('')
const previewGridURLs = ref<Record<number, string>>({})
const coverPreviewURL = ref<string>('')
const showModal = ref(false)
const modalIndex = ref(0)
const modalPreviewURL = ref<string>('')
const pageWrapperRef = ref<HTMLElement | null>(null)

const exportOptions = reactive<ExportOptions>({
  title: '我的植物标本册',
  paperStyle: 'vintage',
  includeIndex: true,
})

const paperStyles = [
  { value: 'kraft' as PaperStyle, label: '牛皮纸', color: '#d2b991' },
  { value: 'white' as PaperStyle, label: '白  纸', color: '#faf8f0' },
  { value: 'vintage' as PaperStyle, label: '复古纸', color: '#ebd7b4' },
]

const currentSpecimen = computed<Specimen | undefined>(() => {
  return specimens.value[currentPreviewIndex.value]
})

const estimatedPages = computed(() => {
  let pages = specimens.value.length + 1
  if (exportOptions.includeIndex && specimens.value.length > 5) {
    pages += 1
  }
  return pages
})

const selectPaperStyle = (style: PaperStyle) => {
  exportOptions.paperStyle = style
  updateCoverPreview()
}

const navigatePreview = (direction: number) => {
  if (isFlipping.value) return
  const newIndex = currentPreviewIndex.value + direction
  if (newIndex >= 0 && newIndex < specimens.value.length) {
    isFlipping.value = true
    currentPreviewIndex.value = newIndex
    loadCurrentPreview()
    setTimeout(() => {
      isFlipping.value = false
    }, 500)
  }
}

const goToPreview = (index: number) => {
  if (isFlipping.value || index === currentPreviewIndex.value) return
  isFlipping.value = true
  currentPreviewIndex.value = index
  loadCurrentPreview()
  setTimeout(() => {
    isFlipping.value = false
  }, 500)
}

const loadCurrentPreview = async () => {
  const specimen = currentSpecimen.value
  if (!specimen) return

  loadingPreview.value = true
  try {
    const url = await generatePreviewDataURL(specimen, 500)
    currentPreviewURL.value = url
  } catch (e) {
    console.error('Failed to load preview:', e)
  } finally {
    loadingPreview.value = false
  }
}

const loadGridPreviews = async () => {
  for (let i = 0; i < specimens.value.length; i++) {
    const specimen = specimens.value[i]
    try {
      const url = await generatePreviewDataURL(specimen, 200)
      previewGridURLs.value[i] = url
    } catch (e) {
      console.error(`Failed to load grid preview ${i}:`, e)
    }
  }
}

const updateCoverPreview = async () => {
  try {
    coverPreviewURL.value = await generateCoverPreview(exportOptions, 350)
  } catch (e) {
    console.error('Failed to load cover preview:', e)
  }
}

const handleExportPDF = async () => {
  try {
    await exportAlbumPDFAndDownload(specimens.value, { ...exportOptions })
  } catch (e) {
    console.error('Export failed:', e)
  }
}

const showFullPreview = async () => {
  showModal.value = true
  modalIndex.value = currentPreviewIndex.value
  await loadModalPreview()
}

const closeModal = () => {
  showModal.value = false
  modalPreviewURL.value = ''
}

const navigateModal = async (direction: number) => {
  const newIndex = modalIndex.value + direction
  if (newIndex >= 0 && newIndex < specimens.value.length) {
    modalIndex.value = newIndex
    await loadModalPreview()
  }
}

const loadModalPreview = async () => {
  const specimen = specimens.value[modalIndex.value]
  if (!specimen) return

  try {
    const url = await generatePreviewDataURL(specimen, 600)
    modalPreviewURL.value = url
  } catch (e) {
    console.error('Failed to load modal preview:', e)
  }
}

const onPreviewLoad = () => {
  loadingPreview.value = false
}

watch(
  () => exportOptions.title,
  () => {
    updateCoverPreview()
  }
)

watch(
  () => specimens.value.length,
  (newLen) => {
    if (newLen > 0) {
      nextTick(() => {
        loadCurrentPreview()
        loadGridPreviews()
        updateCoverPreview()
      })
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (specimens.value.length > 0) {
    await loadCurrentPreview()
    await loadGridPreviews()
    await updateCoverPreview()
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;
@use '@/styles/animations' as *;

.album-export {
  min-height: 100vh;
  padding: var(--spacing-lg);
  animation: fadeIn 0.5s ease-out;
}

.breadcrumb {
  margin-bottom: var(--spacing-lg);
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;

  &.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: color var(--transition-fast);

  &:hover {
    color: var(--accent-color);
  }
}

.breadcrumb-icon {
  font-size: var(--font-size-base);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  animation: fadeInUp 0.6s ease-out;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: var(--spacing-lg);
  animation: float 3s ease-in-out infinite;
}

.empty-title {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-3xl);
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.empty-subtitle {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
  font-size: var(--font-size-lg);
}

.export-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  animation: fadeInDown 0.5s ease-out;
}

.page-title {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-4xl);
  color: var(--accent-color);
  margin-bottom: var(--spacing-sm);
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
}

.export-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: var(--spacing-xl);
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.preview-section {
  animation: fadeInLeft 0.6s ease-out;
}

.preview-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.tab-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
  }

  &.active {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: var(--text-inverse);
  }
}

.preview-area {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;

  @include paper-texture-vintage(0.3);
}

.single-preview {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.page-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  width: 100%;
  justify-content: center;
}

.nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-2xl);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: var(--accent-color);
    color: var(--text-inverse);
    border-color: var(--accent-color);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.page-wrapper {
  position: relative;
  width: 100%;
  max-width: 450px;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.preview-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 450px;
  padding: 0 var(--spacing-sm);
}

.specimen-name {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
}

.page-indicator {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.preview-dots {
  display: flex;
  gap: var(--spacing-sm);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: var(--border-color);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--accent-color);
    transform: scale(1.2);
  }

  &.active {
    background: var(--accent-color);
    width: 24px;
    border-radius: 4px;
  }
}

.grid-preview {
  width: 100%;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-md);
}

.grid-item {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-normal);
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.4s ease-out forwards;

  &:nth-child(n) {
    animation-delay: calc(var(--i, 0) * 0.05s);
  }

  @for $i from 1 through 20 {
    &:nth-child(#{$i}) {
      --i: #{$i};
    }
  }

  &.is-loaded {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
}

.grid-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #fff;
}

.grid-placeholder {
  width: 100%;
  height: 100%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-sm);
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.grid-name {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-sm);
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-number {
  font-size: var(--font-size-xs);
  opacity: 0.8;
}

.cover-preview {
  width: 100%;
  display: flex;
  justify-content: center;
}

.cover-wrapper {
  width: 100%;
  max-width: 350px;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}

.cover-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.settings-section {
  animation: fadeInRight 0.6s ease-out;
}

.settings-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
  position: sticky;
  top: var(--spacing-lg);
}

.settings-title {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-2xl);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  font-family: var(--font-handwriting);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.form-input {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(139, 105, 20, 0.1);
  }

  &.handwriting-input {
    font-family: var(--font-handwriting);
    font-size: var(--font-size-xl);
  }
}

.paper-style-selector {
  display: flex;
  gap: var(--spacing-sm);
}

.style-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--accent-color);
  }

  &.active {
    border-color: var(--accent-color);
    background: rgba(139, 105, 20, 0.05);
  }
}

.style-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.style-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--font-size-base);

  input {
    display: none;
  }
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  position: relative;
  transition: all var(--transition-fast);

  &::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    color: var(--text-inverse);
    font-size: 14px;
    font-weight: bold;
    transition: transform var(--transition-fast);
  }

  input:checked + & {
    background: var(--accent-color);
    border-color: var(--accent-color);

    &::after {
      transform: translate(-50%, -50%) scale(1);
    }
  }
}

.hint {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  margin-left: var(--spacing-xs);
}

.stats-group {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.stat-value {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-3xl);
  color: var(--accent-color);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
  text-decoration: none;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: var(--accent-color);
    color: var(--text-inverse);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(139, 105, 20, 0.3);
    }
  }

  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);

    &:hover:not(:disabled) {
      border-color: var(--accent-color);
      color: var(--accent-color);
    }
  }

  &.btn-block {
    width: 100%;
  }

  &.export-btn {
    font-family: var(--font-handwriting);
    font-size: var(--font-size-xl);
    padding: var(--spacing-lg);
  }
}

.btn-content {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-icon {
  font-size: var(--font-size-lg);
}

.error-message {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: rgba(166, 68, 68, 0.1);
  border: 1px solid var(--color-day-error);
  border-radius: var(--radius-md);
  color: var(--color-day-error);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  animation: fadeIn 0.3s ease-out;
}

.error-icon {
  font-size: var(--font-size-lg);
}

.error-close {
  margin-left: auto;
  background: none;
  border: none;
  color: inherit;
  font-size: var(--font-size-xl);
  cursor: pointer;
  line-height: 1;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-xl);
}

.modal-content {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: fadeInUp 0.3s ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-2xl);
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: var(--font-size-3xl);
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1;
  transition: color var(--transition-fast);

  &:hover {
    color: var(--accent-color);
  }
}

.modal-body {
  padding: var(--spacing-xl);
  overflow-y: auto;
}

.modal-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.modal-page-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  width: 100%;
  justify-content: center;
}

.modal-page-wrapper {
  position: relative;
  width: 100%;
  max-width: 550px;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.modal-preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}

.modal-indicator {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  &.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.page-flip-enter-active {
  animation: pageFlipEnter 0.5s ease-out forwards;
}

.page-flip-leave-active {
  animation: pageFlipLeave 0.5s ease-in forwards;
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

@keyframes pageFlipLeave {
  0% {
    opacity: 1;
    transform: perspective(1200px) rotateY(0deg);
    transform-origin: right center;
  }
  100% {
    opacity: 0;
    transform: perspective(1200px) rotateY(90deg);
    transform-origin: right center;
  }
}
</style>
