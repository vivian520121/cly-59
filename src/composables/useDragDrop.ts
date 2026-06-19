import { ref, onUnmounted } from 'vue'

interface DragDropOptions<T = unknown> {
  items?: T[]
  itemSelector?: string
  containerSelector?: string
  onReorder?: (items: T[]) => void
  longPressDelay?: number
}

interface DragState {
  draggedIndex: number | null
  dropTargetIndex: number | null
  isDragging: boolean
  longPressTimer: ReturnType<typeof setTimeout> | null
  touchStartX: number
  touchStartY: number
}

interface PointerDragState {
  isDragging: boolean
  draggedIndex: number | null
  draggedId: number | null
  draggedElement: HTMLElement | null
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  overIndex: number | null
  hasMoved: boolean
}

const DEFAULT_LONG_PRESS_DELAY = 500

export function useDragDrop<T = unknown>(options: DragDropOptions<T> = {}) {
  const {
    items = [],
    itemSelector = '[data-drag-item]',
    containerSelector = '[data-drag-container]',
    onReorder,
    longPressDelay = DEFAULT_LONG_PRESS_DELAY,
  } = options

  const dragState = ref<DragState>({
    draggedIndex: null,
    dropTargetIndex: null,
    isDragging: false,
    longPressTimer: null,
    touchStartX: 0,
    touchStartY: 0,
  })

  const pointerState = ref<PointerDragState>({
    isDragging: false,
    draggedIndex: null,
    draggedId: null,
    draggedElement: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    overIndex: null,
    hasMoved: false,
  })

  const isDragging = ref(false)
  const overIndex = ref<number | null>(null)

  const firstRects = ref<DOMRect[]>([])
  const dragElements = ref<HTMLElement[]>([])

  function getContainer(): HTMLElement | null {
    return document.querySelector(containerSelector)
  }

  function getItems(): HTMLElement[] {
    const container = getContainer()
    if (!container) return []
    return Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[]
  }

  function getIndexFromElement(el: HTMLElement): number {
    const items = getItems()
    return items.indexOf(el)
  }

  function readFirstRects() {
    dragElements.value = getItems()
    firstRects.value = dragElements.value.map((el) => el.getBoundingClientRect())
  }

  function animateFLIP(draggedIndex: number, targetIndex: number) {
    if (dragElements.value.length === 0) {
      readFirstRects()
    }

    const lastRects = dragElements.value.map((el) => el.getBoundingClientRect())

    dragElements.value.forEach((el, index) => {
      if (index === draggedIndex) return

      const first = firstRects.value[index]
      const last = lastRects[index]

      if (!first || !last) return

      const deltaX = first.left - last.left
      const deltaY = first.top - last.top

      if (deltaX !== 0 || deltaY !== 0) {
        el.style.transition = 'none'
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      }
    })

    requestAnimationFrame(() => {
      dragElements.value.forEach((el) => {
        el.style.transition = 'transform 300ms cubic-bezier(0.2, 0, 0, 1)'
        el.style.transform = ''
      })
    })
  }

  function onDragStart(e: DragEvent) {
    const target = e.currentTarget as HTMLElement
    const index = getIndexFromElement(target)

    dragState.value.draggedIndex = index
    dragState.value.isDragging = true

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
    }

    target.style.transform = 'scale(1.05)'
    target.style.opacity = '0.8'
    target.style.zIndex = '1000'

    readFirstRects()
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    if (!dragState.value.isDragging) return

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }

    const target = e.target as HTMLElement
    const dragItem = target.closest(itemSelector) as HTMLElement

    if (dragItem) {
      const targetIndex = getIndexFromElement(dragItem)
      dragState.value.dropTargetIndex = targetIndex

      getItems().forEach((item, idx) => {
        if (idx === targetIndex && idx !== dragState.value.draggedIndex) {
          item.classList.add('drag-over')
        } else {
          item.classList.remove('drag-over')
        }
      })
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    if (dragState.value.draggedIndex === null) return

    const draggedIndex = dragState.value.draggedIndex
    const targetIndex = dragState.value.dropTargetIndex

    if (targetIndex !== null && draggedIndex !== targetIndex && onReorder) {
      readFirstRects()
      animateFLIP(draggedIndex, targetIndex)

      const newItems = [...items]
      const [draggedItem] = newItems.splice(draggedIndex, 1)
      newItems.splice(targetIndex, 0, draggedItem)

      onReorder(newItems)
    }

    resetDragState()
  }

  function onDragEnd(e: DragEvent) {
    const target = e.currentTarget as HTMLElement
    target.style.transform = ''
    target.style.opacity = ''
    target.style.zIndex = ''

    resetDragState()
  }

  function resetDragState() {
    dragState.value.draggedIndex = null
    dragState.value.dropTargetIndex = null
    dragState.value.isDragging = false

    if (dragState.value.longPressTimer) {
      clearTimeout(dragState.value.longPressTimer)
      dragState.value.longPressTimer = null
    }

    getItems().forEach((item) => {
      item.classList.remove('drag-over')
      item.style.transform = ''
      item.style.opacity = ''
      item.style.zIndex = ''
    })
  }

  function onTouchStart(e: TouchEvent) {
    const target = e.currentTarget as HTMLElement
    const touch = e.touches[0]

    dragState.value.touchStartX = touch.clientX
    dragState.value.touchStartY = touch.clientY

    dragState.value.longPressTimer = setTimeout(() => {
      const index = getIndexFromElement(target)
      dragState.value.draggedIndex = index
      dragState.value.isDragging = true

      target.style.transform = 'scale(1.05)'
      target.style.opacity = '0.8'
      target.style.zIndex = '1000'

      readFirstRects()

      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, longPressDelay)
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragState.value.isDragging) {
      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - dragState.value.touchStartX)
      const deltaY = Math.abs(touch.clientY - dragState.value.touchStartY)

      if (deltaX > 10 || deltaY > 10) {
        if (dragState.value.longPressTimer) {
          clearTimeout(dragState.value.longPressTimer)
          dragState.value.longPressTimer = null
        }
      }
      return
    }

    e.preventDefault()

    const touch = e.touches[0]
    const elementFromPoint = document.elementFromPoint(touch.clientX, touch.clientY)
    const dragItem = elementFromPoint?.closest(itemSelector) as HTMLElement

    if (dragItem) {
      const targetIndex = getIndexFromElement(dragItem)
      dragState.value.dropTargetIndex = targetIndex

      getItems().forEach((item, idx) => {
        if (idx === targetIndex && idx !== dragState.value.draggedIndex) {
          item.classList.add('drag-over')
        } else {
          item.classList.remove('drag-over')
        }
      })
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (dragState.value.longPressTimer) {
      clearTimeout(dragState.value.longPressTimer)
      dragState.value.longPressTimer = null
    }

    if (!dragState.value.isDragging) return

    const draggedIndex = dragState.value.draggedIndex
    const targetIndex = dragState.value.dropTargetIndex

    if (targetIndex !== null && draggedIndex !== null && draggedIndex !== targetIndex && onReorder) {
      readFirstRects()
      animateFLIP(draggedIndex, targetIndex)

      const newItems = [...items]
      const [draggedItem] = newItems.splice(draggedIndex, 1)
      newItems.splice(targetIndex, 0, draggedItem)

      onReorder(newItems)
    }

    resetDragState()
  }

  function initDragListeners() {
    const items = getItems()
    items.forEach((item) => {
      item.setAttribute('draggable', 'true')
      item.dataset.dragItem = ''

      item.addEventListener('dragstart', onDragStart)
      item.addEventListener('dragover', onDragOver)
      item.addEventListener('drop', onDrop)
      item.addEventListener('dragend', onDragEnd)

      item.addEventListener('touchstart', onTouchStart, { passive: true })
      item.addEventListener('touchmove', onTouchMove, { passive: false })
      item.addEventListener('touchend', onTouchEnd)
      item.addEventListener('touchcancel', onTouchEnd)
    })
  }

  function removeDragListeners() {
    const items = getItems()
    items.forEach((item) => {
      item.removeEventListener('dragstart', onDragStart)
      item.removeEventListener('dragover', onDragOver)
      item.removeEventListener('drop', onDrop)
      item.removeEventListener('dragend', onDragEnd)

      item.removeEventListener('touchstart', onTouchStart)
      item.removeEventListener('touchmove', onTouchMove)
      item.removeEventListener('touchend', onTouchEnd)
      item.removeEventListener('touchcancel', onTouchEnd)
    })
  }

  function handlePointerDown(e: PointerEvent, element: HTMLElement, index: number, id?: number) {
    if (e.button !== 0) return

    pointerState.value = {
      isDragging: false,
      draggedIndex: index,
      draggedId: id ?? null,
      draggedElement: element,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - element.getBoundingClientRect().left,
      offsetY: e.clientY - element.getBoundingClientRect().top,
      overIndex: null,
      hasMoved: false,
    }

    element.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent) {
    if (pointerState.value.draggedIndex === null) return

    const deltaX = Math.abs(e.clientX - pointerState.value.startX)
    const deltaY = Math.abs(e.clientY - pointerState.value.startY)

    if (!pointerState.value.isDragging && (deltaX > 5 || deltaY > 5)) {
      pointerState.value.isDragging = true
      pointerState.value.hasMoved = true
      isDragging.value = true

      if (pointerState.value.draggedElement) {
        pointerState.value.draggedElement.style.transform = 'scale(1.05) rotate(3deg)'
        pointerState.value.draggedElement.style.opacity = '0.8'
        pointerState.value.draggedElement.style.zIndex = '1000'
        pointerState.value.draggedElement.style.cursor = 'grabbing'
      }

      readFirstRects()
    }

    if (pointerState.value.isDragging) {
      const elementFromPoint = document.elementFromPoint(e.clientX, e.clientY)
      const dragItem = elementFromPoint?.closest(itemSelector) as HTMLElement

      if (dragItem && pointerState.value.draggedElement !== dragItem) {
        const targetIndex = getIndexFromElement(dragItem)
        pointerState.value.overIndex = targetIndex
        overIndex.value = targetIndex

        getItems().forEach((item, idx) => {
          if (idx === targetIndex && idx !== pointerState.value.draggedIndex) {
            item.classList.add('drag-over')
          } else {
            item.classList.remove('drag-over')
          }
        })
      }
    }
  }

  function handlePointerUp(e: PointerEvent, element: HTMLElement) {
    if (pointerState.value.draggedIndex === null) return

    element.releasePointerCapture(e.pointerId)

    const draggedIndex = pointerState.value.draggedIndex
    const targetIndex = pointerState.value.overIndex

    if (
      pointerState.value.isDragging &&
      targetIndex !== null &&
      draggedIndex !== targetIndex &&
      onReorder
    ) {
      readFirstRects()
      animateFLIP(draggedIndex, targetIndex)

      const newItems = [...items]
      const [draggedItem] = newItems.splice(draggedIndex, 1)
      newItems.splice(targetIndex, 0, draggedItem)

      onReorder(newItems)
    }

    resetPointerState()
  }

  function handlePointerLeave(e: PointerEvent, element: HTMLElement) {
    if (pointerState.value.isDragging) {
      handlePointerUp(e, element)
    } else {
      resetPointerState()
    }
  }

  function handleDragEnter(index: number) {
    if (pointerState.value.isDragging && pointerState.value.draggedIndex !== index) {
      pointerState.value.overIndex = index
      overIndex.value = index
    }
  }

  function handleDragLeave() {
    pointerState.value.overIndex = null
    overIndex.value = null

    getItems().forEach((item) => {
      item.classList.remove('drag-over')
    })
  }

  function resetPointerState() {
    if (pointerState.value.draggedElement) {
      pointerState.value.draggedElement.style.transform = ''
      pointerState.value.draggedElement.style.opacity = ''
      pointerState.value.draggedElement.style.zIndex = ''
      pointerState.value.draggedElement.style.cursor = ''
    }

    pointerState.value = {
      isDragging: false,
      draggedIndex: null,
      draggedId: null,
      draggedElement: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      overIndex: null,
      hasMoved: false,
    }

    isDragging.value = false
    overIndex.value = null

    getItems().forEach((item) => {
      item.classList.remove('drag-over')
    })
  }

  onUnmounted(() => {
    removeDragListeners()
    resetDragState()
    resetPointerState()
  })

  return {
    dragState,
    initDragListeners,
    removeDragListeners,
    resetDragState,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
    overIndex,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handleDragEnter,
    handleDragLeave,
  }
}
