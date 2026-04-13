import { describe, expect, it } from 'vitest'
import type { BattleConfig } from './types'
import { runBattle } from './simulator'

const fillerUnits = (prefix: string) => [
  { id: `${prefix}1`, name: `${prefix}1`, hp: 20, attack: 1, speed: 10 },
  { id: `${prefix}2`, name: `${prefix}2`, hp: 20, attack: 1, speed: 5 },
  { id: `${prefix}3`, name: `${prefix}3`, hp: 20, attack: 1, speed: 4 },
]

describe('status effect system', () => {
  it('burn should deal periodic damage and then be removed', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'burn', name: '燃烧', effects: [{ kind: 'apply_status', statusType: 'burn', value: 3, duration: 1, targetType: 'enemy_front' }] },
      ],
      left: { name: 'A', units: fillerUnits('a'), deck: ['burn'] },
      right: { name: 'B', units: fillerUnits('b'), deck: [] },
    }

    const result = runBattle(config)

    expect(result.events.some((e) => e.type === 'apply_status' && e.payload?.statusType === 'burn')).toBe(true)
    expect(result.events.some((e) => e.type === 'tick_status' && e.payload?.statusType === 'burn')).toBe(true)
    expect(result.events.some((e) => e.type === 'remove_status' && e.payload?.statusType === 'burn')).toBe(true)
  })

  it('stun should skip unit turn', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'stun', name: '眩晕', effects: [{ kind: 'apply_status', statusType: 'stun', value: 0, duration: 1, targetType: 'enemy_front' }] },
      ],
      left: { name: 'A', units: fillerUnits('a'), deck: ['stun'] },
      right: { name: 'B', units: fillerUnits('b'), deck: [] },
    }

    const result = runBattle(config)

    expect(result.events.some((e) => e.type === 'skip_turn')).toBe(true)
  })

  it('taunt should redirect basic attack target', () => {
    const config: BattleConfig = {
      cards: [{ id: 'taunt', name: '挑衅', effects: [{ kind: 'apply_status', statusType: 'taunt', value: 0, duration: 2, targetType: 'self' }] }],
      left: {
        name: 'A',
        units: [
          { id: 'a1', name: 'A1', hp: 20, attack: 2, speed: 10 },
          { id: 'a2', name: 'A2', hp: 20, attack: 2, speed: 5 },
          { id: 'a3', name: 'A3', hp: 20, attack: 2, speed: 4 },
        ],
        deck: ['taunt'],
      },
      right: {
        name: 'B',
        units: [
          { id: 'b1', name: 'B1', hp: 20, attack: 2, speed: 9 },
          { id: 'b2', name: 'B2', hp: 20, attack: 2, speed: 6 },
          { id: 'b3', name: 'B3', hp: 20, attack: 2, speed: 3 },
        ],
        deck: [],
      },
    }

    const result = runBattle(config)
    const firstBasic = result.events.find((e) => e.type === 'basic_attack' && e.actorId === 'b1')

    expect(firstBasic?.targetId).toBe('a1')
  })

  it('heal should not exceed max hp', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'heal', name: '治疗', effects: [{ kind: 'heal', value: 50, targetType: 'self' }] },
      ],
      left: {
        name: 'A',
        units: [
          { id: 'a1', name: 'A1', hp: 20, attack: 1, speed: 10 },
          { id: 'a2', name: 'A2', hp: 20, attack: 1, speed: 5 },
          { id: 'a3', name: 'A3', hp: 20, attack: 1, speed: 4 },
        ],
        deck: ['heal'],
      },
      right: {
        name: 'B',
        units: [
          { id: 'b1', name: 'B1', hp: 20, attack: 5, speed: 9 },
          { id: 'b2', name: 'B2', hp: 20, attack: 1, speed: 6 },
          { id: 'b3', name: 'B3', hp: 20, attack: 1, speed: 3 },
        ],
        deck: [],
      },
    }

    const result = runBattle(config)
    const healEvent = result.events.find((e) => e.type === 'heal' && e.actorId === 'a1')

    expect(healEvent).toBeDefined()
    expect(Number(healEvent?.payload?.targetHpAfter)).toBeLessThanOrEqual(20)
  })

  it('poison should tick as separate status type', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'poison', name: '中毒', effects: [{ kind: 'apply_status', statusType: 'poison', value: 2, duration: 1, targetType: 'enemy_front' }] },
      ],
      left: { name: 'A', units: fillerUnits('a'), deck: ['poison'] },
      right: { name: 'B', units: fillerUnits('b'), deck: [] },
    }

    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'tick_status' && e.payload?.statusType === 'poison')).toBe(true)
  })
})
