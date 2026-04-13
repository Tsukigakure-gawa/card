import type { BattleConfig } from '../engine/types'
import { sampleCards } from './cards'

export const sampleBattleConfig: BattleConfig = {
  cards: sampleCards,
  left: {
    name: '玩家队伍',
    units: [
      { id: 'p1', name: '先锋战士', hp: 30, attack: 8, speed: 5 },
      { id: 'p2', name: '游侠', hp: 24, attack: 10, speed: 7 },
      { id: 'p3', name: '护卫', hp: 36, attack: 6, speed: 4 },
    ],
    deck: ['c4', 'c1', 'c6', 'c2', 'c5', 'c3'],
  },
  right: {
    name: '敌方队伍',
    units: [
      { id: 'e1', name: '哥布林', hp: 20, attack: 7, speed: 6 },
      { id: 'e2', name: '兽人战士', hp: 32, attack: 9, speed: 4 },
      { id: 'e3', name: '骷髅弓手', hp: 22, attack: 8, speed: 8 },
    ],
    deck: ['c3', 'c5', 'c6', 'c2', 'c4', 'c1'],
  },
}
