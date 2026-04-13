import { describe, expect, it } from 'vitest'
import { sampleBattleConfig } from '../data/units'
import type { BattleConfig } from './types'
import { runBattle } from './simulator'

describe('runBattle', () => {
  it('should finish and include card actions in logs', () => {
    const result = runBattle(sampleBattleConfig)

    expect(result.rounds).toBeGreaterThan(0)
    expect(result.winner.length).toBeGreaterThan(0)
    expect(result.logs[0]).toContain('战斗开始')
    expect(result.logs.some((line) => line.includes('抽到卡牌'))).toBe(true)
    expect(result.logs.some((line) => line.includes('使用卡牌'))).toBe(true)
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
    const shieldAbsorbLog = result.logs.find((line) => line.includes('护盾吸收 8'))

    expect(shieldAbsorbLog).toBeDefined()
  })
})
