export type Profession = 'warrior' | 'tank' | 'mage' | 'priest' | 'hunter' | 'assassin'
export type Position = 'front' | 'middle' | 'back'
export type CardPool = 'common' | 'class' | 'signature'
export type CostType = 'actionPoints' | 'mana' | 'fightingSpirit'
export type CardTargetType =
  | 'self'
  | 'ally_single'
  | 'ally_front'
  | 'ally_back'
  | 'enemy_front'
  | 'enemy_middle'
  | 'enemy_back'
  | 'enemy_single'
  | 'enemy_lowest_hp'
  | 'all_allies'
  | 'all_enemies'

export type StatusEffectType = 'burn' | 'poison' | 'stun' | 'taunt'
export type BattlePhase = 'turn_start' | 'before_action' | 'action' | 'after_action' | 'turn_end'

export type StatusEffect = {
  type: StatusEffectType
  value: number
  duration: number
  sourceUnitId?: string
}

export type ImmunityEffect = {
  immuneTo: StatusEffectType[]
  duration: number
  sourceUnitId?: string
}

export type CardEffect =
  | { kind: 'damage' | 'shield' | 'heal'; value: number; targetType: CardTargetType }
  | { kind: 'apply_status'; statusType: StatusEffectType; value: number; duration: number; targetType: CardTargetType }
  | { kind: 'cleanse' | 'dispel'; targetType: CardTargetType }
  | { kind: 'apply_immunity'; targetType: CardTargetType; duration: number; immuneTo: StatusEffectType[] }

export type CardConfig = {
  id: string
  name: string
  cardPool: CardPool
  classRestriction?: Profession[]
  costType: CostType
  cost: number
  range: 'single' | 'multi'
  description: string
  effects: CardEffect[]
}

export type UnitLoadout = {
  signatureSkill: string
  commonCards: string[]
  classCards: string[]
}

export type UnitConfig = {
  id: string
  name: string
  profession: Profession
  tags: string[]
  maxHp: number
  attack: number
  speed: number
  position: Position
  backstory: string
  signatureSkill: string
  selectableCommonCards: string[]
  selectableClassCards: string[]
  loadout: UnitLoadout
}

export type TeamConfig = {
  name: string
  units: UnitConfig[]
}

export type BattleConfig = {
  left: TeamConfig
  right: TeamConfig
  cards: CardConfig[]
}

export type UnitStateSnapshot = {
  id: string
  name: string
  profession: Profession
  position: Position
  team: string
  currentHp: number
  maxHp: number
  attack: number
  speed: number
  shield: number
  alive: boolean
  actionPoints: number
  maxActionPoints: number
  classResourceType?: CostType
  classResource: number
  maxClassResource: number
  statusEffects: StatusEffect[]
  immunities: ImmunityEffect[]
}

export type TeamStateSnapshot = {
  name: string
  units: UnitStateSnapshot[]
  drawPile: string[]
  hand: string[]
  discardPile: string[]
}

export type TurnInfo = {
  round: number
  actorTeam: string
  actorUnitId: string
  actorUnitName: string
}

export type BattleStateSnapshot = {
  left: TeamStateSnapshot
  right: TeamStateSnapshot
  turn: TurnInfo | null
  logs: string[]
}

export type BattleEventType =
  | 'battle_start'
  | 'phase_start'
  | 'turn_start'
  | 'draw_card'
  | 'recycle_discard'
  | 'play_card'
  | 'discard_card'
  | 'basic_attack'
  | 'gain_shield'
  | 'deal_damage'
  | 'apply_status'
  | 'tick_status'
  | 'remove_status'
  | 'heal'
  | 'skip_turn'
  | 'cleanse'
  | 'dispel'
  | 'apply_immunity'
  | 'block_status'
  | 'resource_change'
  | 'unit_down'
  | 'battle_end'

export type BattleEvent = {
  type: BattleEventType
  stepIndex: number
  phase?: BattlePhase
  actorId?: string
  targetId?: string
  cardId?: string
  payload?: Record<string, number | string | boolean>
}

export type BattleReportUnitStats = {
  unitId: string
  dealtDamage: number
  takenDamage: number
  healingReceived: number
  statusesApplied: number
  statusDamageTriggers: number
}

export type BattleReport = {
  units: Record<string, BattleReportUnitStats>
}

export type BattleResult = {
  winner: string
  rounds: number
  logs: string[]
  events: BattleEvent[]
  finalState: BattleStateSnapshot
  history: BattleStateSnapshot[]
  battleReport: BattleReport
}
