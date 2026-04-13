export type CardType = 'damage' | 'shield'
export type CardTargetType = 'self' | 'enemy_front' | 'enemy_lowest_hp'

export type CardConfig = {
  id: string
  name: string
  type: CardType
  value: number
  targetType: CardTargetType
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
  | 'basic_attack'
  | 'gain_shield'
  | 'deal_damage'
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
