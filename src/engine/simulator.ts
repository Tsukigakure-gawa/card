import type {
  BattleConfig,
  BattleEvent,
  BattleEventType,
  BattleResult,
  BattleStateSnapshot,
  CardConfig,
  CardEffect,
  TeamConfig,
  TeamStateSnapshot,
  TurnInfo,
  UnitConfig,
  UnitStateSnapshot,
  StatusEffect,
  StatusEffectType,
} from './types'

type UnitState = UnitConfig & {
  team: string
  currentHp: number
  shield: number
  alive: boolean
  statusEffects: StatusEffect[]
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
const MAX_ROUNDS = 50

const getLivingUnits = (units: UnitState[]) => units.filter((unit) => unit.alive)
const chooseFrontTarget = (units: UnitState[]) => getLivingUnits(units)[0]

const chooseLowestHpTarget = (units: UnitState[]) => {
  const living = getLivingUnits(units)
  return living.sort((a, b) => a.currentHp - b.currentHp || a.id.localeCompare(b.id))[0]
}

const hasStatus = (unit: UnitState, type: StatusEffectType) =>
  unit.statusEffects.some((effect) => effect.type === type && effect.duration > 0)

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
  statusEffects: unit.statusEffects.map((effect) => ({ ...effect })),
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
    case 'discard_card':
      return `${event.payload?.teamName} 弃牌：${event.payload?.cardName}`
    case 'basic_attack':
      return `${event.payload?.actorTeam}·${event.payload?.actorName} 普通攻击 ${event.payload?.targetTeam}·${event.payload?.targetName}`
    case 'gain_shield':
      return `护盾结算 -> ${event.payload?.targetTeam}·${event.payload?.targetName} +${event.payload?.amount} 护盾（当前护盾 ${event.payload?.shieldAfter}）`
    case 'deal_damage':
      return `伤害结算 -> ${event.payload?.targetTeam}·${event.payload?.targetName} 受到 ${event.payload?.rawDamage}（护盾吸收 ${event.payload?.absorbed}，生命扣除 ${event.payload?.hpDamage}，剩余生命 ${event.payload?.targetHpAfter}）`
    case 'apply_status':
      return `状态施加 -> ${event.payload?.targetTeam}·${event.payload?.targetName} 获得 ${event.payload?.statusType}(${event.payload?.duration})`
    case 'tick_status':
      return `状态结算 -> ${event.payload?.targetTeam}·${event.payload?.targetName} 的 ${event.payload?.statusType} 触发`
    case 'remove_status':
      return `状态移除 -> ${event.payload?.targetTeam}·${event.payload?.targetName} 的 ${event.payload?.statusType} 结束`
    case 'heal':
      return `治疗结算 -> ${event.payload?.targetTeam}·${event.payload?.targetName} 回复 ${event.payload?.healAmount}（当前生命 ${event.payload?.targetHpAfter}）`
    case 'skip_turn':
      return `${event.payload?.targetTeam}·${event.payload?.targetName} 由于眩晕跳过行动`
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
    statusEffects: [],
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
  if (!cardId) return

  const card = cardsById.get(cardId)
  if (!card) return

  team.hand.push(card)
  emitEvent(state, 'draw_card', {
    actorId,
    cardId: card.id,
    payload: { teamName: team.name, cardName: card.name },
  })
}

const removeExpiredStatuses = (unit: UnitState, state: BattleState, actorId?: string) => {
  const remaining: StatusEffect[] = []
  for (const effect of unit.statusEffects) {
    if (effect.duration <= 0) {
      emitEvent(state, 'remove_status', {
        actorId,
        targetId: unit.id,
        payload: { targetTeam: unit.team, targetName: unit.name, statusType: effect.type },
      })
      continue
    }
    remaining.push(effect)
  }
  unit.statusEffects = remaining
}

const applyStatus = (
  state: BattleState,
  actor: UnitState,
  target: UnitState,
  statusType: StatusEffectType,
  value: number,
  duration: number,
  cardId?: string,
) => {
  target.statusEffects.push({
    type: statusType,
    value,
    duration,
    sourceUnitId: actor.id,
  })

  emitEvent(state, 'apply_status', {
    actorId: actor.id,
    targetId: target.id,
    cardId,
    payload: {
      targetTeam: target.team,
      targetName: target.name,
      statusType,
      value,
      duration,
    },
  })
}

const getTauntTargets = (enemyUnits: UnitState[]) => {
  const tauntUnits = getLivingUnits(enemyUnits).filter((unit) => hasStatus(unit, 'taunt'))
  return tauntUnits.length > 0 ? tauntUnits : getLivingUnits(enemyUnits)
}

const chooseCardIndex = (actor: UnitState, hand: CardConfig[]) => {
  if (hand.length === 0) return -1

  const hasKind = (card: CardConfig, kind: CardEffect['kind']) => card.effects.some((effect) => effect.kind === kind)
  const shieldCardIndex = hand.findIndex((card) => hasKind(card, 'shield'))
  const damageCardIndex = hand.findIndex((card) => hasKind(card, 'damage'))

  if (actor.shield <= LOW_SHIELD_THRESHOLD && shieldCardIndex >= 0) {
    return shieldCardIndex
  }

  if (damageCardIndex >= 0) {
    return damageCardIndex
  }

  if (shieldCardIndex >= 0) return shieldCardIndex

  return 0
}

const pickTargetByType = (targetType: 'self' | 'enemy_front' | 'enemy_lowest_hp', actor: UnitState, enemyUnits: UnitState[]) => {
  if (targetType === 'self') return actor

  const pool = getTauntTargets(enemyUnits)
  if (targetType === 'enemy_lowest_hp') {
    return chooseLowestHpTarget(pool)
  }
  return chooseFrontTarget(pool)
}

const settleDeath = (state: BattleState, actorId: string, target: UnitState) => {
  if (!target.alive) {
    emitEvent(state, 'unit_down', {
      actorId,
      targetId: target.id,
      payload: { targetTeam: target.team, targetName: target.name },
    })
  }
}

const tickStartStatuses = (state: BattleState, actor: UnitState) => {
  let skipAction = false

  for (const effect of actor.statusEffects) {
    if (effect.duration <= 0) continue

    if (effect.type === 'burn' || effect.type === 'poison') {
      emitEvent(state, 'tick_status', {
        actorId: actor.id,
        targetId: actor.id,
        payload: { targetTeam: actor.team, targetName: actor.name, statusType: effect.type },
      })

      const { absorbed, hpDamage } = applyDamage(actor, effect.value)
      emitEvent(state, 'deal_damage', {
        actorId: effect.sourceUnitId,
        targetId: actor.id,
        payload: {
          source: effect.type,
          targetTeam: actor.team,
          targetName: actor.name,
          rawDamage: effect.value,
          absorbed,
          hpDamage,
          targetHpAfter: Math.max(actor.currentHp, 0),
          targetShieldAfter: actor.shield,
        },
      })
      effect.duration -= 1
      settleDeath(state, effect.sourceUnitId ?? actor.id, actor)
    }

    if (effect.type === 'stun') {
      emitEvent(state, 'tick_status', {
        actorId: actor.id,
        targetId: actor.id,
        payload: { targetTeam: actor.team, targetName: actor.name, statusType: 'stun' },
      })
      emitEvent(state, 'skip_turn', {
        actorId: actor.id,
        targetId: actor.id,
        payload: { targetTeam: actor.team, targetName: actor.name },
      })
      effect.duration -= 1
      skipAction = true
    }
  }

  removeExpiredStatuses(actor, state, actor.id)
  return skipAction
}

const tickEndStatuses = (state: BattleState, actor: UnitState) => {
  for (const effect of actor.statusEffects) {
    if (effect.type === 'taunt' && effect.duration > 0) {
      effect.duration -= 1
    }
  }

  removeExpiredStatuses(actor, state, actor.id)
}

const settleCardEffect = (
  state: BattleState,
  actor: UnitState,
  enemyTeam: TeamState,
  card: CardConfig,
  effect: CardEffect,
) => {
  const target = pickTargetByType(effect.targetType, actor, enemyTeam.units)
  if (!target) return

  if (effect.kind === 'damage') {
    const { absorbed, hpDamage } = applyDamage(target, effect.value)
    emitEvent(state, 'deal_damage', {
      actorId: actor.id,
      targetId: target.id,
      cardId: card.id,
      payload: {
        source: 'card',
        targetTeam: target.team,
        targetName: target.name,
        rawDamage: effect.value,
        absorbed,
        hpDamage,
        targetHpAfter: Math.max(target.currentHp, 0),
        targetShieldAfter: target.shield,
      },
    })
    settleDeath(state, actor.id, target)
    return
  }

  if (effect.kind === 'shield') {
    target.shield += effect.value
    emitEvent(state, 'gain_shield', {
      actorId: actor.id,
      targetId: target.id,
      cardId: card.id,
      payload: {
        targetTeam: target.team,
        targetName: target.name,
        amount: effect.value,
        shieldAfter: target.shield,
      },
    })
    return
  }

  if (effect.kind === 'heal') {
    const before = target.currentHp
    target.currentHp = Math.min(target.hp, target.currentHp + effect.value)
    const healed = target.currentHp - before
    emitEvent(state, 'heal', {
      actorId: actor.id,
      targetId: target.id,
      cardId: card.id,
      payload: {
        targetTeam: target.team,
        targetName: target.name,
        healAmount: healed,
        targetHpAfter: target.currentHp,
      },
    })
    return
  }

  if (effect.kind === 'apply_status') {
    applyStatus(state, actor, target, effect.statusType, effect.value, effect.duration, card.id)
  }
}

const settleBasicAttack = (actor: UnitState, enemyTeam: TeamState, state: BattleState) => {
  const target = chooseFrontTarget(getTauntTargets(enemyTeam.units))
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

  settleDeath(state, actor.id, target)
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
  while (
    getLivingUnits(state.left.units).length > 0 &&
    getLivingUnits(state.right.units).length > 0 &&
    rounds < MAX_ROUNDS
  ) {
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
      const skipped = tickStartStatuses(state, actor)

      if (!actor.alive || skipped) {
        history.push(snapshotBattleState(state))
        if (getLivingUnits(state.left.units).length === 0 || getLivingUnits(state.right.units).length === 0) {
          break
        }
        continue
      }

      const cardIndex = chooseCardIndex(actor, actorTeam.hand)
      const chosenCard = cardIndex >= 0 ? actorTeam.hand.splice(cardIndex, 1)[0] : undefined

      if (chosenCard) {
        emitEvent(state, 'play_card', {
          actorId: actor.id,
          cardId: chosenCard.id,
          payload: { actorTeam: actor.team, actorName: actor.name, cardName: chosenCard.name },
        })

        for (const effect of chosenCard.effects) {
          settleCardEffect(state, actor, enemyTeam, chosenCard, effect)
        }

        actorTeam.discardPile.push(chosenCard)
        emitEvent(state, 'discard_card', {
          actorId: actor.id,
          cardId: chosenCard.id,
          payload: { teamName: actorTeam.name, cardName: chosenCard.name },
        })
      } else {
        settleBasicAttack(actor, enemyTeam, state)
      }

      tickEndStatuses(state, actor)
      history.push(snapshotBattleState(state))

      if (getLivingUnits(state.left.units).length === 0 || getLivingUnits(state.right.units).length === 0) {
        break
      }
    }
  }

  state.turn = null
  const leftAlive = getLivingUnits(state.left.units).length
  const rightAlive = getLivingUnits(state.right.units).length
  const leftHp = state.left.units.reduce((sum, unit) => sum + Math.max(unit.currentHp, 0), 0)
  const rightHp = state.right.units.reduce((sum, unit) => sum + Math.max(unit.currentHp, 0), 0)

  const winner =
    leftAlive > rightAlive
      ? state.left.name
      : rightAlive > leftAlive
        ? state.right.name
        : leftHp >= rightHp
          ? state.left.name
          : state.right.name

  emitEvent(state, 'battle_end', { payload: { winner, reason: rounds >= MAX_ROUNDS ? 'max_rounds' : 'all_down' } })
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
