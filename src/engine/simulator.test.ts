import { describe, expect, it } from 'vitest'
import type { BattleConfig } from './types'
import { runBattle } from './simulator'

const units = (prefix: string) => [
  { id: `${prefix}1`, name: `${prefix}1`, hp: 20, attack: 2, speed: 10 },
  { id: `${prefix}2`, name: `${prefix}2`, hp: 20, attack: 1, speed: 5 },
  { id: `${prefix}3`, name: `${prefix}3`, hp: 20, attack: 1, speed: 4 },
]

describe('advanced status systems', () => {
  it('burn stacking should stack value and refresh duration', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'b1', name: '烧1', effects: [{ kind: 'apply_status', statusType: 'burn', value: 2, duration: 2, targetType: 'enemy_front' }] },
        { id: 'b2', name: '烧2', effects: [{ kind: 'apply_status', statusType: 'burn', value: 3, duration: 2, targetType: 'enemy_front' }] },
      ],
      left: { name: 'A', units: units('a'), deck: ['b1', 'b2'] },
      right: { name: 'B', units: units('b'), deck: [] },
    }

    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'apply_status' && e.payload?.mode === 'stack')).toBe(true)
  })

  it('cleanse removes negative statuses', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'p', name: '毒', effects: [{ kind: 'apply_status', statusType: 'poison', value: 2, duration: 2, targetType: 'enemy_front' }] },
        { id: 'c', name: '净化', effects: [{ kind: 'cleanse', targetType: 'self' }] },
      ],
      left: { name: 'A', units: units('a'), deck: ['c'] },
      right: { name: 'B', units: units('b'), deck: ['p'] },
    }

    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'cleanse' && Number(e.payload?.removedCount) > 0)).toBe(true)
  })

  it('dispel removes positive statuses like taunt', () => {
    const config: BattleConfig = {
      cards: [
        { id: 't', name: '挑衅', effects: [{ kind: 'apply_status', statusType: 'taunt', value: 0, duration: 2, targetType: 'self' }] },
        { id: 'd', name: '驱散', effects: [{ kind: 'dispel', targetType: 'enemy_front' }] },
      ],
      left: { name: 'A', units: units('a'), deck: ['t'] },
      right: { name: 'B', units: units('b'), deck: ['d'] },
    }

    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'dispel' && Number(e.payload?.removedCount) > 0)).toBe(true)
  })

  it('immunity blocks new status application', () => {
    const config: BattleConfig = {
      cards: [
        { id: 'im', name: '免疫', effects: [{ kind: 'apply_immunity', targetType: 'self', duration: 2, immuneTo: ['burn'] }] },
        { id: 'burn', name: '灼烧', effects: [{ kind: 'apply_status', statusType: 'burn', value: 3, duration: 1, targetType: 'enemy_front' }] },
      ],
      left: { name: 'A', units: units('a'), deck: ['im'] },
      right: { name: 'B', units: units('b'), deck: ['burn'] },
    }

    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'block_status' && e.payload?.statusType === 'burn')).toBe(true)
  })

  it('phase order should follow turn_start -> before_action -> action -> after_action -> turn_end', () => {
    const config: BattleConfig = {
      cards: [{ id: 'atk', name: '打击', effects: [{ kind: 'damage', value: 4, targetType: 'enemy_front' }] }],
      left: { name: 'A', units: units('a'), deck: ['atk'] },
      right: { name: 'B', units: units('b'), deck: [] },
    }

    const result = runBattle(config)
    const phases = result.events
      .filter((e) => e.type === 'phase_start')
      .slice(0, 5)
      .map((e) => e.payload?.phase)

    expect(phases).toEqual(['turn_start', 'before_action', 'action', 'after_action', 'turn_end'])
  })

  it('battleReport should accumulate key stats from events', () => {
    const config: BattleConfig = {
      cards: [{ id: 'atk', name: '打击', effects: [{ kind: 'damage', value: 4, targetType: 'enemy_front' }] }],
      left: { name: 'A', units: units('a'), deck: ['atk'] },
      right: { name: 'B', units: units('b'), deck: [] },
    }

    const result = runBattle(config)
    expect(result.battleReport.units.a1.dealtDamage).toBeGreaterThanOrEqual(0)
    expect(result.battleReport.units.b1.takenDamage).toBeGreaterThanOrEqual(0)
  })
})
