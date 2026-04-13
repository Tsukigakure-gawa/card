import { describe, expect, it } from 'vitest'
import type { BattleConfig, CardConfig, UnitConfig } from './types'
import { runBattle } from './simulator'

const unit = (overrides: Partial<UnitConfig>): UnitConfig => ({
  id: 'u',
  name: 'unit',
  profession: 'warrior',
  tags: [],
  maxHp: 20,
  attack: 5,
  speed: 5,
  position: 'front',
  backstory: '-',
  signatureSkill: 'sig',
  selectableCommonCards: ['cm'],
  selectableClassCards: ['cl'],
  loadout: { signatureSkill: 'sig', commonCards: ['cm'], classCards: ['cl'] },
  ...overrides,
})

const baseCards: CardConfig[] = [
  { id: 'cm', name: '通用打击', cardPool: 'common', costType: 'actionPoints', cost: 1, range: 'single', description: '', effects: [{ kind: 'damage', value: 3, targetType: 'enemy_front' }] },
  { id: 'cl', name: '职业打击', cardPool: 'class', classRestriction: ['warrior'], costType: 'fightingSpirit', cost: 1, range: 'single', description: '', effects: [{ kind: 'damage', value: 4, targetType: 'enemy_front' }] },
  { id: 'sig', name: '签名', cardPool: 'signature', classRestriction: ['warrior'], costType: 'fightingSpirit', cost: 1, range: 'single', description: '', effects: [{ kind: 'damage', value: 5, targetType: 'enemy_front' }] },
]

describe('refactor battle rules', () => {
  it('warrior uses fightingSpirit for class card', () => {
    const config: BattleConfig = {
      cards: baseCards,
      left: { name: 'L', units: [unit({ id: 'l1' }), unit({ id: 'l2', position: 'middle' }), unit({ id: 'l3', position: 'back' })] },
      right: { name: 'R', units: [unit({ id: 'r1' }), unit({ id: 'r2', position: 'middle' }), unit({ id: 'r3', position: 'back' })] },
    }
    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'play_card' && e.cardId === 'cl')).toBe(true)
  })

  it('mage mana recovery tracked', () => {
    const mage = unit({ id: 'm1', profession: 'mage', signatureSkill: 'sig_m', selectableClassCards: ['cl_m'], loadout: { signatureSkill: 'sig_m', commonCards: [], classCards: ['cl_m'] } })
    const cards: CardConfig[] = [
      ...baseCards,
      { id: 'cl_m', name: '法术', cardPool: 'class', classRestriction: ['mage'], costType: 'mana', cost: 1, range: 'single', description: '', effects: [{ kind: 'damage', value: 3, targetType: 'enemy_front' }] },
      { id: 'sig_m', name: '法师签名', cardPool: 'signature', classRestriction: ['mage'], costType: 'mana', cost: 1, range: 'single', description: '', effects: [{ kind: 'damage', value: 4, targetType: 'enemy_front' }] },
    ]
    const config: BattleConfig = {
      cards,
      left: { name: 'L', units: [mage, unit({ id: 'l2', position: 'middle' }), unit({ id: 'l3', position: 'back' })] },
      right: { name: 'R', units: [unit({ id: 'r1' }), unit({ id: 'r2', position: 'middle' }), unit({ id: 'r3', position: 'back' })] },
    }
    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'resource_change' && e.actorId === 'm1')).toBe(true)
  })

  it('enemy_back targeting works', () => {
    const cards: CardConfig[] = [...baseCards, { id: 'sig_back', name: '后排刺杀', cardPool: 'signature', classRestriction: ['warrior'], costType: 'fightingSpirit', cost: 1, range: 'single', description: '', effects: [{ kind: 'damage', value: 5, targetType: 'enemy_back' }] }]
    const config: BattleConfig = {
      cards,
      left: { name: 'L', units: [unit({ id: 'l1', signatureSkill: 'sig_back', loadout: { signatureSkill: 'sig_back', commonCards: [], classCards: [] } }), unit({ id: 'l2', position: 'middle' }), unit({ id: 'l3', position: 'back' })] },
      right: { name: 'R', units: [unit({ id: 'r1' }), unit({ id: 'r2', position: 'middle' }), unit({ id: 'r3', position: 'back' })] },
    }
    const result = runBattle(config)
    expect(result.events.some((e) => e.type === 'deal_damage' && e.targetId === 'r3')).toBe(true)
  })

  it('battleReport keeps unit stats', () => {
    const config: BattleConfig = {
      cards: baseCards,
      left: { name: 'L', units: [unit({ id: 'l1' }), unit({ id: 'l2', position: 'middle' }), unit({ id: 'l3', position: 'back' })] },
      right: { name: 'R', units: [unit({ id: 'r1' }), unit({ id: 'r2', position: 'middle' }), unit({ id: 'r3', position: 'back' })] },
    }
    const result = runBattle(config)
    expect(result.battleReport.units.l1).toBeDefined()
  })
})
