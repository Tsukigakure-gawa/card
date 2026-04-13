import type {
  BattleConfig,
  BattleEvent,
  BattleEventType,
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
  events: BattleEvent[]
  nextStepIndex: number
}

const LOW_SHIELD_THRESHOLD = 4

const getLivingUnits = (units: UnitState[]) => units.filter((unit) => unit.alive)
const chooseFrontTarget = (units: UnitState[]) => getLivingUnits(units)[0]

const chooseLowestHpTarget = (units: UnitState[]) => {
  const living = getLivingUnits(units)
  return living.sort((a, b) => a.currentHp - b.currentHp || a.id.localeCompare(b.id))[0]
}

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

const formatEventLog = (event: BattleEvent): string => {
  switch (event.type) {
    case 'battle_start':
      return `战斗开始：${event.payload?.leftTeam} vs ${event.payload?.rightTeam}`
    case 'turn_start':
      return `回合 ${event.payload?.round} 行动开始：${event.payload?.actorTeam}·${event.payload?.actorName}`
    case 'draw_card':
      return `${event.payload?.teamName} 抽到卡牌：${event.payload?.cardName}`
    case 'recycle_discard':
      return `${event.payload?.teamName} 洗牌回收：弃牌堆 -> 牌库（回收 ${event.payload?.count} 张）`
    case 'play_card':
      return `${event.payload?.actorTeam}·${event.payload?.actorName} 出牌：${event.payload?.cardName}`
    case 'basic_attack':
      return `${event.payload?.actorTeam}·${event.payload?.actorName} 普通攻击 ${event.payload?.targetTeam}·${event.payload?.targetName}`
    case 'gain_shield':
      return `护盾结算 -> ${event.payload?.targetTeam}·${event.payload?.targetName} +${event.payload?.amount} 护盾（当前护盾 ${event.payload?.shieldAfter}）`
    case 'deal_damage':
      return `伤害结算 -> ${event.payload?.targetTeam}·${event.payload?.targetName} 受到 ${event.payload?.rawDamage}（护盾吸收 ${event.payload?.absorbed}，生命扣除 ${event.payload?.hpDamage}，剩余生命 ${event.payload?.targetHpAfter}）`
    case 'unit_down':
      return `${event.payload?.targetTeam}·${event.payload?.targetName} 死亡`
    case 'battle_end':
      return `战斗结束：胜利方 ${event.payload?.winner}`
    default:
      return `${event.type}`
  }
}

const emitEvent = (
  state: BattleState,
  type: BattleEventType,
  fields: Omit<BattleEvent, 'type' | 'stepIndex'> = {},
) => {
  const event: BattleEvent = {
    type,
    stepIndex: state.nextStepIndex,
    ...fields,
  }
  state.nextStepIndex += 1
  state.events.push(event)
  state.logs.push(formatEventLog(event))
  return event
}

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

const recycleDiscardToDraw = (team: TeamState, state: BattleState, actorId: string) => {
  if (team.discardPile.length === 0) return false

  const recycledIds = shuffleCardIds(team.discardPile.map((card) => card.id))
  team.drawPile.push(...recycledIds)
  team.discardPile = []

  emitEvent(state, 'recycle_discard', {
    actorId,
    payload: { teamName: team.name, count: recycledIds.length },
  })
  return true
}

const drawCard = (
  team: TeamState,
  cardsById: Map<string, CardConfig>,
  state: BattleState,
  actorId: string,
) => {
  if (team.drawPile.length === 0) {
    recycleDiscardToDraw(team, state, actorId)
  }

  const cardId = team.drawPile.shift()
  if (!cardId) {
    return
  }

  const card = cardsById.get(cardId)
  if (!card) {
    return
  }

  team.hand.push(card)
  emitEvent(state, 'draw_card', {
    actorId,
    cardId: card.id,
    payload: { teamName: team.name, cardName: card.name },
  })
}

const chooseCardIndex = (actor: UnitState, hand: CardConfig[]) => {
  if (hand.length === 0) return -1

  const shieldCardIndex = hand.findIndex((card) => card.type === 'shield')
  const damageCardIndex = hand.findIndex((card) => card.type === 'damage')

  if (actor.shield <= LOW_SHIELD_THRESHOLD && shieldCardIndex >= 0) {
    return shieldCardIndex
  }

  if (damageCardIndex >= 0) {
    return damageCardIndex
  }

  return shieldCardIndex
}

const pickTargetByCard = (card: CardConfig, actor: UnitState, enemyUnits: UnitState[]) => {
  if (card.targetType === 'self') return actor
  if (card.targetType === 'enemy_lowest_hp') return chooseLowestHpTarget(enemyUnits)
  return chooseFrontTarget(enemyUnits)
}

const settleCard = (
  card: CardConfig,
  actor: UnitState,
  enemyTeam: TeamState,
  state: BattleState,
) => {
  emitEvent(state, 'play_card', {
    actorId: actor.id,
    cardId: card.id,
    payload: { actorTeam: actor.team, actorName: actor.name, cardName: card.name },
  })

  if (card.type === 'shield') {
    const target = pickTargetByCard(card, actor, enemyTeam.units)
    if (!target) return

    target.shield += card.value
    emitEvent(state, 'gain_shield', {
      actorId: actor.id,
      targetId: target.id,
      cardId: card.id,
      payload: {
        targetTeam: target.team,
        targetName: target.name,
        amount: card.value,
        shieldAfter: target.shield,
      },
    })
    return
  }

  const target = pickTargetByCard(card, actor, enemyTeam.units)
  if (!target) return

  const { absorbed, hpDamage } = applyDamage(target, card.value)
  emitEvent(state, 'deal_damage', {
    actorId: actor.id,
    targetId: target.id,
    cardId: card.id,
    payload: {
      source: 'card',
      targetTeam: target.team,
      targetName: target.name,
      rawDamage: card.value,
      absorbed,
      hpDamage,
      targetHpAfter: Math.max(target.currentHp, 0),
      targetShieldAfter: target.shield,
    },
  })

  if (!target.alive) {
    emitEvent(state, 'unit_down', {
      actorId: actor.id,
      targetId: target.id,
      payload: { targetTeam: target.team, targetName: target.name },
    })
  }

}

const settleBasicAttack = (actor: UnitState, enemyTeam: TeamState, state: BattleState) => {
  const target = chooseFrontTarget(enemyTeam.units)
  if (!target) return

  emitEvent(state, 'basic_attack', {
    actorId: actor.id,
    targetId: target.id,
    payload: {
      actorTeam: actor.team,
      actorName: actor.name,
      targetTeam: target.team,
      targetName: target.name,
    },
  })

  const { absorbed, hpDamage } = applyDamage(target, actor.attack)
  emitEvent(state, 'deal_damage', {
    actorId: actor.id,
    targetId: target.id,
    payload: {
      source: 'basic_attack',
      targetTeam: target.team,
      targetName: target.name,
      rawDamage: actor.attack,
      absorbed,
      hpDamage,
      targetHpAfter: Math.max(target.currentHp, 0),
      targetShieldAfter: target.shield,
    },
  })

  if (!target.alive) {
    emitEvent(state, 'unit_down', {
      actorId: actor.id,
      targetId: target.id,
      payload: { targetTeam: target.team, targetName: target.name },
    })
  }
}

export const runBattle = (config: BattleConfig): BattleResult => {
  const history: BattleStateSnapshot[] = []
  const cardsById = new Map(config.cards.map((card) => [card.id, card]))

  const state: BattleState = {
    left: createTeamState(config.left),
    right: createTeamState(config.right),
    turn: null,
    logs: [],
    events: [],
    nextStepIndex: 1,
  }

  const allUnits = [...state.left.units, ...state.right.units]

  emitEvent(state, 'battle_start', {
    payload: { leftTeam: state.left.name, rightTeam: state.right.name },
  })
  history.push(snapshotBattleState(state))

  let rounds = 0
  while (getLivingUnits(state.left.units).length > 0 && getLivingUnits(state.right.units).length > 0) {
    rounds += 1

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

      emitEvent(state, 'turn_start', {
        actorId: actor.id,
        payload: { round: rounds, actorTeam: actor.team, actorName: actor.name },
      })

      drawCard(actorTeam, cardsById, state, actor.id)

      const cardIndex = chooseCardIndex(actor, actorTeam.hand)
      const chosenCard = cardIndex >= 0 ? actorTeam.hand.splice(cardIndex, 1)[0] : undefined

      if (chosenCard) {
        settleCard(chosenCard, actor, enemyTeam, state)
        actorTeam.discardPile.push(chosenCard)
      } else {
        settleBasicAttack(actor, enemyTeam, state)
      }

      history.push(snapshotBattleState(state))

      if (getLivingUnits(state.left.units).length === 0 || getLivingUnits(state.right.units).length === 0) {
        break
      }
    }
  }

  state.turn = null
  const winner = getLivingUnits(state.left.units).length > 0 ? state.left.name : state.right.name
  emitEvent(state, 'battle_end', { payload: { winner } })
  history.push(snapshotBattleState(state))

  return {
    winner,
    rounds,
    logs: state.logs,
    events: state.events,
    finalState: snapshotBattleState(state),
    history,
  }
}
