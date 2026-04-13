export type CardType = 'damage' | 'shield'

export type CardConfig = {
  id: string
  name: string
  type: CardType
  value: number
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

export type BattleResult = {
  winner: string
  rounds: number
  logs: string[]
}
