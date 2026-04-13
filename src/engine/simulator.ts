import type {
  BattleConfig,
  BattleResult,
  BattleStateSnapshot,
  CardConfig,
  TeamConfig,
  TeamStateSnapshot,
  TurnInfo,
  UnitConfig,
  UnitStateSnapshot,
} from './types'

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
  discardPile: CardConfig[]
}

type BattleState = {
  left: TeamState
  right: TeamState
  turn: TurnInfo | null
  logs: string[]
}

const getLivingUnits = (units: UnitState[]) => units.filter((unit) => unit.alive)
const chooseTarget = (units: UnitState[]) => getLivingUnits(units)[0]

const toUnitSnapshot = (unit: UnitState): UnitStateSnapshot => ({
  id: unit.id,
  name: unit.name,
  team: unit.team,
  currentHp: unit.currentHp,
  maxHp: unit.hp,
  attack: unit.attack,
  speed: unit.speed,
  shield: unit.shield,
  alive: unit.alive,
})

const toTeamSnapshot = (team: TeamState): TeamStateSnapshot => ({
  name: team.name,
  units: team.units.map(toUnitSnapshot),
  drawPile: [...team.drawPile],
  hand: team.hand.map((card) => card.id),
  discardPile: team.discardPile.map((card) => card.id),
})

const snapshotBattleState = (state: BattleState): BattleStateSnapshot => ({
  left: toTeamSnapshot(state.left),
  right: toTeamSnapshot(state.right),
  turn: state.turn ? { ...state.turn } : null,
  logs: [...state.logs],
})

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
  discardPile: [],
})

const shuffleCardIds = (cardIds: string[]) => [...cardIds].sort((a, b) => a.localeCompare(b))

const recycleDiscardToDraw = (team: TeamState, logs: string[]) => {
  if (team.discardPile.length === 0) return false

  const recycledIds = shuffleCardIds(team.discardPile.map((card) => card.id))
  team.drawPile.push(...recycledIds)
  team.discardPile = []

  logs.push(`${team.name} 洗牌回收：弃牌堆 -> 牌库（回收 ${recycledIds.length} 张）`)
  return true
}

const drawCard = (team: TeamState, cardsById: Map<string, CardConfig>, logs: string[]) => {
  if (team.drawPile.length === 0) {
    const recycled = recycleDiscardToDraw(team, logs)
    if (!recycled) {
      logs.push(`${team.name} 抽牌失败：牌库与弃牌堆都为空`)
      return
    }
  }

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

const discardCard = (team: TeamState, card: CardConfig, logs: string[]) => {
  team.discardPile.push(card)
  logs.push(`${team.name} 弃牌：${card.name}`)
}

export const runBattle = (config: BattleConfig): BattleResult => {
  const history: BattleStateSnapshot[] = []
  const cardsById = new Map(config.cards.map((card) => [card.id, card]))

  const state: BattleState = {
    left: createTeamState(config.left),
    right: createTeamState(config.right),
    turn: null,
    logs: [],
  }

  const allUnits = [...state.left.units, ...state.right.units]

  state.logs.push(`战斗开始：${state.left.name} vs ${state.right.name}`)
  history.push(snapshotBattleState(state))

  let rounds = 0
  while (getLivingUnits(state.left.units).length > 0 && getLivingUnits(state.right.units).length > 0) {
    rounds += 1
    state.logs.push(`-- 回合 ${rounds} --`)

    const turnOrder = getLivingUnits(allUnits).sort((a, b) => {
      if (b.speed === a.speed) return a.id.localeCompare(b.id)
      return b.speed - a.speed
    })

    for (const actor of turnOrder) {
      if (!actor.alive) continue

      const actorTeam = actor.team === state.left.name ? state.left : state.right
      const enemyTeam = actor.team === state.left.name ? state.right : state.left
      state.turn = {
        round: rounds,
        actorTeam: actor.team,
        actorUnitId: actor.id,
        actorUnitName: actor.name,
      }

      drawCard(actorTeam, cardsById, state.logs)

      const cardToUse = actorTeam.hand[0]
      if (cardToUse) {
        actorTeam.hand.shift()
        state.logs.push(`${actor.team}·${actor.name} 出牌：${cardToUse.name}`)

        if (cardToUse.type === 'damage') {
          const target = chooseTarget(enemyTeam.units)
          if (!target) break

          const { absorbed, hpDamage } = applyDamage(target, cardToUse.value)
          state.logs.push(
            `伤害结算 -> ${target.team}·${target.name} 受到 ${cardToUse.value}（护盾吸收 ${absorbed}，生命扣除 ${hpDamage}，剩余生命 ${Math.max(target.currentHp, 0)}，剩余护盾 ${target.shield}）`,
          )
          if (!target.alive) state.logs.push(`${target.team}·${target.name} 死亡`)
        }

        if (cardToUse.type === 'shield') {
          actor.shield += cardToUse.value
          state.logs.push(
            `护盾结算 -> ${actor.team}·${actor.name} 获得 ${cardToUse.value} 护盾（当前生命 ${actor.currentHp}，当前护盾 ${actor.shield}）`,
          )
        }

        discardCard(actorTeam, cardToUse, state.logs)
      } else {
        const target = chooseTarget(enemyTeam.units)
        if (!target) break

        const { absorbed, hpDamage } = applyDamage(target, actor.attack)
        state.logs.push(
          `${actor.team}·${actor.name} 普通攻击 ${target.team}·${target.name}，伤害 ${actor.attack}（护盾吸收 ${absorbed}，生命扣除 ${hpDamage}，剩余生命 ${Math.max(target.currentHp, 0)}，剩余护盾 ${target.shield}）`,
        )
        if (!target.alive) state.logs.push(`${target.team}·${target.name} 死亡`)
      }

      history.push(snapshotBattleState(state))

      if (getLivingUnits(state.left.units).length === 0 || getLivingUnits(state.right.units).length === 0) {
        break
      }
    }
  }

  state.turn = null
  const winner = getLivingUnits(state.left.units).length > 0 ? state.left.name : state.right.name
  state.logs.push(`战斗结束：胜利方 ${winner}`)
  history.push(snapshotBattleState(state))

  return {
    winner,
    rounds,
    logs: state.logs,
    finalState: snapshotBattleState(state),
    history,
  }
}
