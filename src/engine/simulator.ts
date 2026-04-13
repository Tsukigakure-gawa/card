import type { BattleConfig, BattleResult, CardConfig, TeamConfig, UnitConfig } from './types'

type UnitState = UnitConfig & {
  team: string
  currentHp: number
  shield: number
  alive: boolean
}

type TeamState = {
  name: string
  units: UnitState[]
  drawPile: string[]
  hand: CardConfig[]
}

const getLivingUnits = (units: UnitState[]) => units.filter((unit) => unit.alive)

const chooseTarget = (units: UnitState[]) => getLivingUnits(units)[0]

const applyDamage = (target: UnitState, damage: number) => {
  const absorbed = Math.min(target.shield, damage)
  target.shield -= absorbed
  const hpDamage = damage - absorbed
  target.currentHp -= hpDamage

  if (target.currentHp <= 0 && target.alive) {
    target.alive = false
  }

  return { absorbed, hpDamage }
}

const createTeamState = (team: TeamConfig): TeamState => ({
  name: team.name,
  units: team.units.map((unit) => ({
    ...unit,
    team: team.name,
    currentHp: unit.hp,
    shield: 0,
    alive: true,
  })),
  drawPile: [...team.deck],
  hand: [],
})

const drawCard = (team: TeamState, cardsById: Map<string, CardConfig>, logs: string[]) => {
  const cardId = team.drawPile.shift()
  if (!cardId) {
    logs.push(`${team.name} 抽牌失败：牌库为空`)
    return
  }

  const card = cardsById.get(cardId)
  if (!card) {
    logs.push(`${team.name} 抽到未知卡牌：${cardId}`)
    return
  }

  team.hand.push(card)
  logs.push(`${team.name} 抽到卡牌：${card.name}(${card.type}:${card.value})`)
}

export const runBattle = (config: BattleConfig): BattleResult => {
  const logs: string[] = []
  let rounds = 0

  const cardsById = new Map(config.cards.map((card) => [card.id, card]))

  const leftTeam = createTeamState(config.left)
  const rightTeam = createTeamState(config.right)
  const allUnits = [...leftTeam.units, ...rightTeam.units]

  logs.push(`战斗开始：${leftTeam.name} vs ${rightTeam.name}`)

  while (getLivingUnits(leftTeam.units).length > 0 && getLivingUnits(rightTeam.units).length > 0) {
    rounds += 1
    logs.push(`-- 回合 ${rounds} --`)

    const turnOrder = getLivingUnits(allUnits).sort((a, b) => {
      if (b.speed === a.speed) return a.id.localeCompare(b.id)
      return b.speed - a.speed
    })

    for (const actor of turnOrder) {
      if (!actor.alive) continue

      const actorTeam = actor.team === leftTeam.name ? leftTeam : rightTeam
      const enemyTeam = actor.team === leftTeam.name ? rightTeam : leftTeam

      drawCard(actorTeam, cardsById, logs)

      const cardToUse = actorTeam.hand[0]
      if (cardToUse) {
        actorTeam.hand.shift()
        logs.push(`${actor.team}·${actor.name} 使用卡牌：${cardToUse.name}`)

        if (cardToUse.type === 'damage') {
          const target = chooseTarget(enemyTeam.units)
          if (!target) break

          const { absorbed, hpDamage } = applyDamage(target, cardToUse.value)
          logs.push(
            `卡牌伤害 -> ${target.team}·${target.name} 受到 ${cardToUse.value} 伤害（护盾吸收 ${absorbed}，生命扣除 ${hpDamage}，剩余生命 ${Math.max(target.currentHp, 0)}，剩余护盾 ${target.shield}）`,
          )

          if (!target.alive) logs.push(`${target.team}·${target.name} 被击败`)
        }

        if (cardToUse.type === 'shield') {
          actor.shield += cardToUse.value
          logs.push(
            `护盾提升 -> ${actor.team}·${actor.name} 获得 ${cardToUse.value} 护盾（当前生命 ${actor.currentHp}，当前护盾 ${actor.shield}）`,
          )
        }
      } else {
        const target = chooseTarget(enemyTeam.units)
        if (!target) break

        const { absorbed, hpDamage } = applyDamage(target, actor.attack)
        logs.push(
          `${actor.team}·${actor.name} 普通攻击 ${target.team}·${target.name}，造成 ${actor.attack} 伤害（护盾吸收 ${absorbed}，生命扣除 ${hpDamage}，剩余生命 ${Math.max(target.currentHp, 0)}，剩余护盾 ${target.shield}）`,
        )

        if (!target.alive) logs.push(`${target.team}·${target.name} 被击败`)
      }

      if (getLivingUnits(leftTeam.units).length === 0 || getLivingUnits(rightTeam.units).length === 0) {
        break
      }
    }
  }

  const winner = getLivingUnits(leftTeam.units).length > 0 ? leftTeam.name : rightTeam.name
  logs.push(`战斗结束：胜利方 ${winner}`)

  return { winner, rounds, logs }
}
