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
}

export type BattleConfig = {
  left: TeamConfig
  right: TeamConfig
}

export type BattleResult = {
  winner: string
  rounds: number
  logs: string[]
}
