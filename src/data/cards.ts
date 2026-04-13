import type { CardConfig } from '../engine/types'

export const sampleCards: CardConfig[] = [
  {
    id: 'c1',
    name: '火球术',
    effects: [{ kind: 'damage', value: 10, targetType: 'enemy_front' }],
  },
  {
    id: 'c2',
    name: '精准狙击',
    effects: [{ kind: 'damage', value: 12, targetType: 'enemy_lowest_hp' }],
  },
  {
    id: 'c3',
    name: '毒液瓶',
    effects: [{ kind: 'apply_status', statusType: 'poison', value: 4, duration: 2, targetType: 'enemy_lowest_hp' }],
  },
  {
    id: 'c4',
    name: '铁壁',
    effects: [{ kind: 'shield', value: 8, targetType: 'self' }],
  },
  {
    id: 'c5',
    name: '治疗术',
    effects: [{ kind: 'heal', value: 10, targetType: 'self' }],
  },
  {
    id: 'c6',
    name: '灼烧印记',
    effects: [{ kind: 'apply_status', statusType: 'burn', value: 5, duration: 2, targetType: 'enemy_front' }],
  },
  {
    id: 'c7',
    name: '震荡打击',
    effects: [{ kind: 'apply_status', statusType: 'stun', value: 0, duration: 1, targetType: 'enemy_front' }],
  },
  {
    id: 'c8',
    name: '挑衅',
    effects: [{ kind: 'apply_status', statusType: 'taunt', value: 0, duration: 2, targetType: 'self' }],
  },
]
