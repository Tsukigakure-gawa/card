import type { BattleConfig } from '../engine/types'
import { sampleCards } from './cards'
import { sampleBattleConfig } from './units'

export type BattlePreset = {
  id: string
  name: string
  description: string
  config: BattleConfig
}

const cloneConfig = (config: BattleConfig): BattleConfig =>
  JSON.parse(JSON.stringify(config)) as BattleConfig

const aggressivePreset: BattleConfig = {
  cards: sampleCards,
  left: {
    name: '速攻队',
    units: [
      { id: 'a1', name: '疾风剑士', hp: 22, attack: 11, speed: 9 },
      { id: 'a2', name: '轻弩手', hp: 20, attack: 10, speed: 8 },
      { id: 'a3', name: '突袭者', hp: 24, attack: 9, speed: 7 },
    ],
    deck: ['c1', 'c2', 'c3', 'c6', 'c10', 'c7', 'c4'],
  },
  right: {
    name: '防守队',
    units: [
      { id: 'b1', name: '盾卫', hp: 35, attack: 6, speed: 4 },
      { id: 'b2', name: '祭司', hp: 26, attack: 5, speed: 6 },
      { id: 'b3', name: '守林者', hp: 30, attack: 7, speed: 5 },
    ],
    deck: ['c4', 'c5', 'c8', 'c9', 'c11', 'c3', 'c1'],
  },
}

const controlPreset: BattleConfig = {
  cards: sampleCards,
  left: {
    name: '控制队',
    units: [
      { id: 'c1', name: '咒术师', hp: 24, attack: 7, speed: 7 },
      { id: 'c2', name: '冰法', hp: 26, attack: 6, speed: 6 },
      { id: 'c3', name: '护卫', hp: 32, attack: 5, speed: 4 },
    ],
    deck: ['c7', 'c3', 'c6', 'c8', 'c11', 'c9', 'c5'],
  },
  right: {
    name: '平衡队',
    units: [
      { id: 'd1', name: '战士', hp: 30, attack: 8, speed: 6 },
      { id: 'd2', name: '猎人', hp: 24, attack: 9, speed: 7 },
      { id: 'd3', name: '医者', hp: 28, attack: 5, speed: 5 },
    ],
    deck: ['c1', 'c2', 'c4', 'c5', 'c10', 'c3', 'c6'],
  },
}

export const battlePresets: BattlePreset[] = [
  { id: 'default', name: '默认示例战斗', description: '平衡规则演示。', config: cloneConfig(sampleBattleConfig) },
  { id: 'aggressive', name: '速攻 vs 防守', description: '高爆发对抗高生存。', config: cloneConfig(aggressivePreset) },
  { id: 'control', name: '控制流对决', description: '更多状态与免疫互动。', config: cloneConfig(controlPreset) },
]
