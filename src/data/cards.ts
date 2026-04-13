import type { CardConfig } from '../engine/types'

export const sampleCards: CardConfig[] = [
  { id: 'c1', name: '火球术', type: 'damage', value: 10, targetType: 'enemy_front' },
  { id: 'c2', name: '精准狙击', type: 'damage', value: 12, targetType: 'enemy_lowest_hp' },
  { id: 'c3', name: '箭雨', type: 'damage', value: 9, targetType: 'enemy_front' },
  { id: 'c4', name: '铁壁', type: 'shield', value: 8, targetType: 'self' },
  { id: 'c5', name: '守护祷言', type: 'shield', value: 10, targetType: 'self' },
  { id: 'c6', name: '奥术飞弹', type: 'damage', value: 7, targetType: 'enemy_lowest_hp' },
]
