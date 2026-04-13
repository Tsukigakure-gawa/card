import { describe, expect, it } from 'vitest'
import { sampleBattleConfig } from '../data/units'
import type { BattleConfig } from './types'
import { runBattle } from './simulator'

describe('runBattle', () => {
  it('should finish and include card zone logs', () => {
    const result = runBattle(sampleBattleConfig)

    expect(result.rounds).toBeGreaterThan(0)
    expect(result.winner.length).toBeGreaterThan(0)
    expect(result.logs[0]).toContain('战斗开始')
    expect(result.logs.some((line) => line.includes('抽到卡牌'))).toBe(true)
    expect(result.logs.some((line) => line.includes('出牌'))).toBe(true)
    expect(result.logs.some((line) => line.includes('弃牌'))).toBe(true)
    expect(result.logs[result.logs.length - 1]).toContain('战斗结束')
  })

  it('shield should absorb damage before hp loss', () => {
    const config: BattleConfig = {
      cards: [
        { id: 's1', name: '小护盾', type: 'shield', value: 10 },
        { id: 'd1', name: '小火球', type: 'damage', value: 8 },
      ],
      left: {
        name: 'A队',
        units: [
          { id: 'a1', name: 'A1', hp: 20, attack: 3, speed: 10 },
          { id: 'a2', name: 'A2', hp: 1, attack: 1, speed: 1 },
          { id: 'a3', name: 'A3', hp: 1, attack: 1, speed: 1 },
        ],
        deck: ['s1'],
      },
      right: {
        name: 'B队',
        units: [
          { id: 'b1', name: 'B1', hp: 20, attack: 3, speed: 9 },
          { id: 'b2', name: 'B2', hp: 1, attack: 1, speed: 1 },
          { id: 'b3', name: 'B3', hp: 1, attack: 1, speed: 1 },
        ],
        deck: ['d1'],
      },
    }

    const result = runBattle(config)
    expect(result.logs.some((line) => line.includes('护盾吸收 8'))).toBe(true)
  })

  it('should recycle discard pile into draw pile when draw pile is empty', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'c1', name: '短剑', type: 'damage', value: 3 },
        { id: 'c2', name: '小盾', type: 'shield', value: 2 },
      ],
      left: {
        name: '左队',
        units: [
          { id: 'l1', name: 'L1', hp: 30, attack: 1, speed: 10 },
          { id: 'l2', name: 'L2', hp: 30, attack: 1, speed: 1 },
          { id: 'l3', name: 'L3', hp: 30, attack: 1, speed: 1 },
        ],
        deck: ['c1'],
      },
      right: {
        name: '右队',
        units: [
          { id: 'r1', name: 'R1', hp: 30, attack: 1, speed: 9 },
          { id: 'r2', name: 'R2', hp: 30, attack: 1, speed: 1 },
          { id: 'r3', name: 'R3', hp: 30, attack: 1, speed: 1 },
        ],
        deck: ['c2'],
      },
    }

    const result = runBattle(config)

    expect(result.logs.some((line) => line.includes('洗牌回收'))).toBe(true)
    expect(result.finalState.left.drawPile.length + result.finalState.left.discardPile.length).toBeGreaterThanOrEqual(0)
    expect(result.history.length).toBeGreaterThan(1)
  })
})
