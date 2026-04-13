import type { BattleConfig, BattleResult, UnitConfig } from './types'

type UnitState = UnitConfig & {
  team: string
  currentHp: number
  alive: boolean
}

const getLivingUnits = (units: UnitState[]) => units.filter((unit) => unit.alive)

const chooseTarget = (units: UnitState[]) => getLivingUnits(units)[0]

export const runBattle = (config: BattleConfig): BattleResult => {
  const logs: string[] = []
  let rounds = 0

  const leftUnits: UnitState[] = config.left.units.map((unit) => ({
    ...unit,
    team: config.left.name,
    currentHp: unit.hp,
    alive: true,
  }))

  const rightUnits: UnitState[] = config.right.units.map((unit) => ({
    ...unit,
    team: config.right.name,
    currentHp: unit.hp,
    alive: true,
  }))

  const allUnits = [...leftUnits, ...rightUnits]

  logs.push(`战斗开始：${config.left.name} vs ${config.right.name}`)

  while (getLivingUnits(leftUnits).length > 0 && getLivingUnits(rightUnits).length > 0) {
    rounds += 1
    logs.push(`-- 回合 ${rounds} --`)

    const turnOrder = getLivingUnits(allUnits).sort((a, b) => {
      if (b.speed === a.speed) return a.id.localeCompare(b.id)
      return b.speed - a.speed
    })

    for (const actor of turnOrder) {
      if (!actor.alive) {
        continue
      }

      const enemies = actor.team === config.left.name ? rightUnits : leftUnits
      const target = chooseTarget(enemies)
      if (!target) {
        break
      }

      target.currentHp -= actor.attack
      logs.push(
        `${actor.team}·${actor.name} 攻击 ${target.team}·${target.name}，造成 ${actor.attack} 伤害（剩余 ${Math.max(target.currentHp, 0)}）`,
      )

      if (target.currentHp <= 0 && target.alive) {
        target.alive = false
        logs.push(`${target.team}·${target.name} 被击败`)
      }

      if (getLivingUnits(leftUnits).length === 0 || getLivingUnits(rightUnits).length === 0) {
        break
      }
    }
  }

  const winner = getLivingUnits(leftUnits).length > 0 ? config.left.name : config.right.name
  logs.push(`战斗结束：胜利方 ${winner}`)

  return { winner, rounds, logs }
}
