import { describe, expect, it } from 'vitest'
import { sampleBattleConfig } from '../data/units'
import type { BattleConfig } from './types'
import { runBattle } from './simulator'

describe('runBattle', () => {
  it('should emit structured events with required core types', () => {
    const result = runBattle(sampleBattleConfig)
    const eventTypes = new Set(result.events.map((event) => event.type))

    expect(result.events.length).toBeGreaterThan(0)
    expect(result.events[0].type).toBe('battle_start')
    expect(eventTypes.has('turn_start')).toBe(true)
    expect(eventTypes.has('draw_card')).toBe(true)
    expect(eventTypes.has('play_card')).toBe(true)
    expect(eventTypes.has('deal_damage')).toBe(true)
    expect(result.events[result.events.length - 1].type).toBe('battle_end')

    for (let i = 0; i < result.events.length; i += 1) {
      expect(result.events[i].stepIndex).toBe(i + 1)
    }
  })

  it('enemy_lowest_hp target should hit the lowest hp enemy unit', () => {
    const config: BattleConfig = {
      cards: [{ id: 'd1', name: '点杀', type: 'damage', value: 5, targetType: 'enemy_lowest_hp' }],
      left: {
        name: '左队',
        units: [
          { id: 'l1', name: 'L1', hp: 20, attack: 2, speed: 10 },
          { id: 'l2', name: 'L2', hp: 20, attack: 1, speed: 1 },
          { id: 'l3', name: 'L3', hp: 20, attack: 1, speed: 1 },
        ],
        deck: ['d1'],
      },
      right: {
        name: '右队',
        units: [
          { id: 'r1', name: 'R1', hp: 20, attack: 1, speed: 9 },
          { id: 'r2', name: 'R2', hp: 6, attack: 1, speed: 2 },
          { id: 'r3', name: 'R3', hp: 12, attack: 1, speed: 3 },
        ],
        deck: [],
      },
    }

    const result = runBattle(config)
    const firstDamageEvent = result.events.find((event) => event.type === 'deal_damage' && event.cardId === 'd1')

    expect(firstDamageEvent?.targetId).toBe('r2')
  })

  it('ai should prioritize shield card when shield is low', () => {
    const config: BattleConfig = {
      cards: [
        { id: 's1', name: '护盾术', type: 'shield', value: 7, targetType: 'self' },
        { id: 'd1', name: '火焰弹', type: 'damage', value: 7, targetType: 'enemy_front' },
      ],
      left: {
        name: 'A队',
        units: [
          { id: 'a1', name: 'A1', hp: 20, attack: 2, speed: 10 },
          { id: 'a2', name: 'A2', hp: 20, attack: 1, speed: 1 },
          { id: 'a3', name: 'A3', hp: 20, attack: 1, speed: 1 },
        ],
        deck: ['d1', 's1'],
      },
      right: {
        name: 'B队',
        units: [
          { id: 'b1', name: 'B1', hp: 20, attack: 1, speed: 9 },
          { id: 'b2', name: 'B2', hp: 20, attack: 1, speed: 1 },
          { id: 'b3', name: 'B3', hp: 20, attack: 1, speed: 1 },
        ],
        deck: [],
      },
    }

    const result = runBattle(config)
    const a1PlayEvents = result.events.filter((event) => event.type === 'play_card' && event.actorId === 'a1')

    expect(a1PlayEvents.length).toBeGreaterThan(1)
    expect(a1PlayEvents[0].cardId).toBe('d1')
    expect(a1PlayEvents[1].cardId).toBe('s1')

    const hasGainShield = result.events.some((event) => event.type === 'gain_shield' && event.actorId === 'a1')
    expect(hasGainShield).toBe(true)
  })
})
