import type { BattleConfig, TeamConfig, UnitConfig } from '../engine/types'
import { allBattleCards } from './cards'
import { characterCatalog } from './characters'

export type BattlePreset = {
  id: string
  name: string
  description: string
  leftTeam: UnitConfig[]
  rightTeam: UnitConfig[]
}

const cloneUnit = (unit: UnitConfig): UnitConfig => JSON.parse(JSON.stringify(unit)) as UnitConfig
const byId = (id: string) => {
  const found = characterCatalog.find((c) => c.id === id)
  if (!found) throw new Error(`unknown character ${id}`)
  return cloneUnit(found)
}

export const battlePresets: BattlePreset[] = [
  {
    id: 'default',
    name: '经典三职业',
    description: '坦克+法师+刺客的基础演示。',
    leftTeam: [byId('hero_tank_borin'), byId('hero_mage_lyra'), byId('hero_assassin_kite')],
    rightTeam: [byId('hero_tank_borin'), byId('hero_mage_lyra'), byId('hero_assassin_kite')],
  },
  {
    id: 'burst',
    name: '刺杀压制',
    description: '后排爆发更频繁。',
    leftTeam: [byId('hero_tank_borin'), byId('hero_assassin_kite'), byId('hero_assassin_kite')],
    rightTeam: [byId('hero_tank_borin'), byId('hero_mage_lyra'), byId('hero_mage_lyra')],
  },
  {
    id: 'control',
    name: '法术控制',
    description: '法术与持续伤害为主。',
    leftTeam: [byId('hero_mage_lyra'), byId('hero_tank_borin'), byId('hero_mage_lyra')],
    rightTeam: [byId('hero_tank_borin'), byId('hero_assassin_kite'), byId('hero_mage_lyra')],
  },
]

export const buildBattleConfigFromPreset = (preset: BattlePreset): BattleConfig => {
  const left: TeamConfig = { name: '左队', units: preset.leftTeam.map(cloneUnit) }
  const right: TeamConfig = { name: '右队', units: preset.rightTeam.map(cloneUnit) }
  return { left, right, cards: allBattleCards }
}
