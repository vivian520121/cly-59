export type DecorationType = 'leaf' | 'rope' | 'frame' | 'sticker' | 'tape'

export interface DecorationItem {
  id: string
  type: DecorationType
  src: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  opacity: number
}
