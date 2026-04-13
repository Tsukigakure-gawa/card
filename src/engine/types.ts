export type CardTargetType = 'self' | 'enemy_front' | 'enemy_lowest_hp'
export type StatusEffectType = 'burn' | 'poison' | 'stun' | 'taunt'

export type StatusEffect = {
  type: StatusEffectType
  value: number
  duration: number
  sourceUnitId?: string
}

export type CardEffect =
  | {
      kind: 'damage' | 'shield' | 'heal'
      value: number
      targetType: CardTargetType
    }
  | {
      kind: 'apply_status'
      statusType: StatusEffectType
      value: number
      duration: number
      targetType: CardTargetType
    }

export type CardConfig = {
  id: string
  name: string
  effects: CardEffect[]
}

export type UnitConfig = {
  id: string
  name: string
  hp: number
  attack: number
  speed: number
}

export type TeamConfig = {
  name: string
  units: UnitConfig[]
  deck: string[]
}

export type BattleConfig = {
  left: TeamConfig
  right: TeamConfig
  cards: CardConfig[]
}

export type UnitStateSnapshot = {
  id: string
  name: string
  team: string
  currentHp: number
  maxHp: number
  attack: number
  speed: number
  shield: number
  alive: boolean
  statusEffects: StatusEffect[]
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
  | 'unit_down'
  | 'battle_end'

export type BattleEvent = {
  type: BattleEventType
  stepIndex: number
  actorId?: string
  targetId?: string
  cardId?: string
  payload?: Record<string, number | string | boolean>
}

export type BattleResult = {
  winner: string
  rounds: number
  logs: string[]
  events: BattleEvent[]
  finalState: BattleStateSnapshot
  history: BattleStateSnapshot[]
}
