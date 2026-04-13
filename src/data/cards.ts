import type { CardConfig } from '../engine/types'

export const commonCards: CardConfig[] = [
  {
    id: 'cm_strike',
    name: '强袭',
    cardPool: 'common',
    costType: 'actionPoints',
    cost: 1,
    range: 'single',
    description: '对敌方前排造成伤害。',
    effects: [{ kind: 'damage', value: 8, targetType: 'enemy_front' }],
  },
  {
    id: 'cm_guard',
    name: '格挡',
    cardPool: 'common',
    costType: 'actionPoints',
    cost: 1,
    range: 'single',
    description: '给自己护盾。',
    effects: [{ kind: 'shield', value: 8, targetType: 'self' }],
  },
  {
    id: 'cm_heal',
    name: '急救',
    cardPool: 'common',
    costType: 'actionPoints',
    cost: 2,
    range: 'single',
    description: '治疗己方单体。',
    effects: [{ kind: 'heal', value: 10, targetType: 'ally_single' }],
  },
]

export const classCards: CardConfig[] = [
  {
    id: 'cl_taunt_roar',
    name: '战吼嘲讽',
    cardPool: 'class',
    classRestriction: ['warrior', 'tank'],
    costType: 'fightingSpirit',
    cost: 2,
    range: 'single',
    description: '前排获得嘲讽。',
    effects: [{ kind: 'apply_status', statusType: 'taunt', value: 0, duration: 2, targetType: 'ally_front' }],
  },
  {
    id: 'cl_fire_brand',
    name: '灼烧印记',
    cardPool: 'class',
    classRestriction: ['mage', 'priest'],
    costType: 'mana',
    cost: 2,
    range: 'single',
    description: '对敌方中排施加灼烧。',
    effects: [{ kind: 'apply_status', statusType: 'burn', value: 4, duration: 2, targetType: 'enemy_middle' }],
  },
  {
    id: 'cl_poison_shot',
    name: '毒镖',
    cardPool: 'class',
    classRestriction: ['hunter', 'assassin'],
    costType: 'actionPoints',
    cost: 2,
    range: 'single',
    description: '对最低血敌人施加中毒。',
    effects: [{ kind: 'apply_status', statusType: 'poison', value: 3, duration: 2, targetType: 'enemy_lowest_hp' }],
  },
]

export const signatureCards: CardConfig[] = [
  {
    id: 'sg_iron_wall',
    name: '钢铁壁垒',
    cardPool: 'signature',
    classRestriction: ['tank'],
    costType: 'fightingSpirit',
    cost: 3,
    range: 'single',
    description: '自身获得大量护盾并净化。',
    effects: [
      { kind: 'shield', value: 14, targetType: 'self' },
      { kind: 'cleanse', targetType: 'self' },
    ],
  },
  {
    id: 'sg_arcane_burst',
    name: '奥术爆发',
    cardPool: 'signature',
    classRestriction: ['mage'],
    costType: 'mana',
    cost: 3,
    range: 'multi',
    description: '攻击全体敌人。',
    effects: [{ kind: 'damage', value: 6, targetType: 'all_enemies' }],
  },
  {
    id: 'sg_shadow_mark',
    name: '影袭印记',
    cardPool: 'signature',
    classRestriction: ['assassin'],
    costType: 'actionPoints',
    cost: 3,
    range: 'single',
    description: '对后排造成高额伤害。',
    effects: [{ kind: 'damage', value: 14, targetType: 'enemy_back' }],
  },
]

export const allBattleCards: CardConfig[] = [...commonCards, ...classCards, ...signatureCards]
