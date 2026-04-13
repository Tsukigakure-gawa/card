import type {
  BattleConfig,
  BattleEvent,
  BattleEventType,
  BattlePhase,
  BattleReport,
  BattleReportUnitStats,
  BattleResult,
  BattleStateSnapshot,
  CardConfig,
  CardEffect,
  ImmunityEffect,
  StatusEffect,
  StatusEffectType,
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
  statusEffects: StatusEffect[]
  immunities: ImmunityEffect[]
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
  currentPhase: BattlePhase
}

const LOW_SHIELD_THRESHOLD = 4
const MAX_ROUNDS = 50
const NEGATIVE_STATUS: StatusEffectType[] = ['burn', 'poison', 'stun']
const POSITIVE_STATUS: StatusEffectType[] = ['taunt']

const getLivingUnits = (units: UnitState[]) => units.filter((unit) => unit.alive)
const chooseFrontTarget = (units: UnitState[]) => getLivingUnits(units)[0]
const chooseLowestHpTarget = (units: UnitState[]) =>
  getLivingUnits(units).sort((a, b) => a.currentHp - b.currentHp || a.id.localeCompare(b.id))[0]

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
  immunities: unit.immunities.map((immunity) => ({ ...immunity, immuneTo: [...immunity.immuneTo] })),
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
    case 'phase_start':
      return `阶段：${event.payload?.phase}`
    case 'battle_start':
      return `战斗开始：${event.payload?.leftTeam} vs ${event.payload?.rightTeam}`
    case 'turn_start':
      return `回合 ${event.payload?.round} 行动开始：${event.payload?.actorTeam}·${event.payload?.actorName}`
    case 'draw_card':
      return `${event.payload?.teamName} 抽到卡牌：${event.payload?.cardName}`
    case 'recycle_discard':
      return `${event.payload?.teamName} 洗牌回收 ${event.payload?.count} 张`
    case 'play_card':
      return `${event.payload?.actorTeam}·${event.payload?.actorName} 出牌：${event.payload?.cardName}`
    case 'discard_card':
      return `${event.payload?.teamName} 弃牌：${event.payload?.cardName}`
    case 'basic_attack':
      return `${event.payload?.actorTeam}·${event.payload?.actorName} 普通攻击 ${event.payload?.targetTeam}·${event.payload?.targetName}`
    case 'gain_shield':
      return `${event.payload?.targetName} 获得护盾 ${event.payload?.amount}`
    case 'deal_damage':
      return `${event.payload?.targetName} 受到 ${event.payload?.rawDamage} 伤害（生命-${event.payload?.hpDamage}）`
    case 'apply_status':
      return `${event.payload?.targetName} 获得状态 ${event.payload?.statusType}(${event.payload?.mode})`
    case 'tick_status':
      return `${event.payload?.targetName} 的 ${event.payload?.statusType} 触发`
    case 'remove_status':
      return `${event.payload?.targetName} 的 ${event.payload?.statusType} 移除`
    case 'heal':
      return `${event.payload?.targetName} 回复 ${event.payload?.healAmount}`
    case 'skip_turn':
      return `${event.payload?.targetName} 跳过行动`
    case 'cleanse':
      return `${event.payload?.targetName} 被净化，移除 ${event.payload?.removedCount} 个负面状态`
    case 'dispel':
      return `${event.payload?.targetName} 被驱散，移除 ${event.payload?.removedCount} 个正面状态`
    case 'apply_immunity':
      return `${event.payload?.targetName} 获得免疫(${event.payload?.duration})`
    case 'block_status':
      return `${event.payload?.targetName} 免疫了 ${event.payload?.statusType}`
    case 'unit_down':
      return `${event.payload?.targetName} 死亡`
    case 'battle_end':
      return `战斗结束：胜利方 ${event.payload?.winner}`
    default:
      return event.type
  }
}

const emitEvent = (
  state: BattleState,
  type: BattleEventType,
  fields: Omit<BattleEvent, 'type' | 'stepIndex' | 'phase'> = {},
) => {
  const event: BattleEvent = {
    type,
    stepIndex: state.nextStepIndex,
    phase: state.currentPhase,
    ...fields,
  }
  state.nextStepIndex += 1
  state.events.push(event)
  state.logs.push(formatEventLog(event))
}

const setPhase = (state: BattleState, phase: BattlePhase) => {
  state.currentPhase = phase
  emitEvent(state, 'phase_start', { payload: { phase } })
}

const applyDamage = (target: UnitState, damage: number) => {
  const absorbed = Math.min(target.shield, damage)
  target.shield -= absorbed
  const hpDamage = damage - absorbed
  target.currentHp -= hpDamage
  if (target.currentHp <= 0 && target.alive) target.alive = false
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
    immunities: [],
  })),
  drawPile: [...team.deck],
  hand: [],
  discardPile: [],
})

const removeExpiredStatuses = (unit: UnitState, state: BattleState, actorId?: string) => {
  unit.statusEffects = unit.statusEffects.filter((effect) => {
    if (effect.duration > 0) return true
    emitEvent(state, 'remove_status', {
      actorId,
      targetId: unit.id,
      payload: { targetName: unit.name, statusType: effect.type },
    })
    return false
  })
}

const removeExpiredImmunities = (unit: UnitState) => {
  unit.immunities = unit.immunities.filter((immunity) => immunity.duration > 0)
}

const mergeStatusEffect = (unit: UnitState, incoming: StatusEffect) => {
  const existing = unit.statusEffects.find((effect) => effect.type === incoming.type)
  if (!existing) {
    unit.statusEffects.push(incoming)
    return 'new' as const
  }

  if (incoming.type === 'burn' || incoming.type === 'poison') {
    existing.value += incoming.value
    existing.duration = Math.max(existing.duration, incoming.duration)
    existing.sourceUnitId = incoming.sourceUnitId
    return 'stack' as const
  }

  existing.duration = Math.max(existing.duration, incoming.duration)
  existing.sourceUnitId = incoming.sourceUnitId
  return 'refresh' as const
}

const isImmuneTo = (unit: UnitState, statusType: StatusEffectType) =>
  unit.immunities.some((immunity) => immunity.duration > 0 && immunity.immuneTo.includes(statusType))

const applyStatus = (
  state: BattleState,
  actor: UnitState,
  target: UnitState,
  statusType: StatusEffectType,
  value: number,
  duration: number,
  cardId?: string,
) => {
  if (isImmuneTo(target, statusType)) {
    emitEvent(state, 'block_status', {
      actorId: actor.id,
      targetId: target.id,
      cardId,
      payload: { targetName: target.name, statusType },
    })
    return
  }

  const mode = mergeStatusEffect(target, {
    type: statusType,
    value,
    duration,
    sourceUnitId: actor.id,
  })

  emitEvent(state, 'apply_status', {
    actorId: actor.id,
    targetId: target.id,
    cardId,
    payload: { targetName: target.name, statusType, value, duration, mode },
  })
}

const getTauntTargets = (enemyUnits: UnitState[]) => {
  const taunt = getLivingUnits(enemyUnits).filter((unit) => hasStatus(unit, 'taunt'))
  return taunt.length > 0 ? taunt : getLivingUnits(enemyUnits)
}

const chooseCardIndex = (actor: UnitState, hand: CardConfig[]) => {
  if (hand.length === 0) return -1
  const hasKind = (card: CardConfig, kind: CardEffect['kind']) => card.effects.some((effect) => effect.kind === kind)
  const shield = hand.findIndex((card) => hasKind(card, 'shield'))
  const damage = hand.findIndex((card) => hasKind(card, 'damage'))
  if (actor.shield <= LOW_SHIELD_THRESHOLD && shield >= 0) return shield
  if (damage >= 0) return damage
  if (shield >= 0) return shield
  return 0
}

const pickTargetByType = (targetType: 'self' | 'enemy_front' | 'enemy_lowest_hp', actor: UnitState, enemy: UnitState[]) => {
  if (targetType === 'self') return actor
  const pool = getTauntTargets(enemy)
  return targetType === 'enemy_lowest_hp' ? chooseLowestHpTarget(pool) : chooseFrontTarget(pool)
}

const settleDeath = (state: BattleState, actorId: string, target: UnitState) => {
  if (!target.alive) {
    emitEvent(state, 'unit_down', { actorId, targetId: target.id, payload: { targetName: target.name } })
  }
}

const tickBeforeActionStatuses = (state: BattleState, actor: UnitState) => {
  let skip = false
  for (const effect of actor.statusEffects) {
    if (effect.duration <= 0) continue
    if (effect.type === 'burn' || effect.type === 'poison') {
      emitEvent(state, 'tick_status', {
        actorId: actor.id,
        targetId: actor.id,
        payload: { targetName: actor.name, statusType: effect.type },
      })
      const { absorbed, hpDamage } = applyDamage(actor, effect.value)
      emitEvent(state, 'deal_damage', {
        actorId: effect.sourceUnitId,
        targetId: actor.id,
        payload: {
          source: effect.type,
          targetName: actor.name,
          rawDamage: effect.value,
          absorbed,
          hpDamage,
          targetHpAfter: Math.max(actor.currentHp, 0),
        },
      })
      effect.duration -= 1
      settleDeath(state, effect.sourceUnitId ?? actor.id, actor)
    }

    if (effect.type === 'stun') {
      emitEvent(state, 'tick_status', {
        actorId: actor.id,
        targetId: actor.id,
        payload: { targetName: actor.name, statusType: effect.type },
      })
      emitEvent(state, 'skip_turn', { actorId: actor.id, targetId: actor.id, payload: { targetName: actor.name } })
      effect.duration -= 1
      skip = true
    }
  }

  removeExpiredStatuses(actor, state, actor.id)
  return skip
}

const tickTurnEnd = (state: BattleState, actor: UnitState) => {
  for (const effect of actor.statusEffects) {
    if (effect.type === 'taunt' && effect.duration > 0) effect.duration -= 1
  }
  for (const immunity of actor.immunities) {
    if (immunity.duration > 0) immunity.duration -= 1
  }
  removeExpiredStatuses(actor, state, actor.id)
  removeExpiredImmunities(actor)
}

const drawCard = (team: TeamState, cardsById: Map<string, CardConfig>, state: BattleState, actorId: string) => {
  if (team.drawPile.length === 0 && team.discardPile.length > 0) {
    team.drawPile.push(...team.discardPile.map((card) => card.id).sort())
    team.discardPile = []
    emitEvent(state, 'recycle_discard', { actorId, payload: { teamName: team.name, count: team.drawPile.length } })
  }

  const cardId = team.drawPile.shift()
  if (!cardId) return
  const card = cardsById.get(cardId)
  if (!card) return
  team.hand.push(card)
  emitEvent(state, 'draw_card', { actorId, cardId, payload: { teamName: team.name, cardName: card.name } })
}

const settleCardEffect = (state: BattleState, actor: UnitState, enemyTeam: TeamState, card: CardConfig, effect: CardEffect) => {
  const target = pickTargetByType(effect.targetType, actor, enemyTeam.units)
  if (!target) return

  if (effect.kind === 'damage') {
    const { absorbed, hpDamage } = applyDamage(target, effect.value)
    emitEvent(state, 'deal_damage', {
      actorId: actor.id,
      targetId: target.id,
      cardId: card.id,
      payload: { source: 'card', rawDamage: effect.value, absorbed, hpDamage, targetName: target.name, targetHpAfter: Math.max(target.currentHp, 0) },
    })
    settleDeath(state, actor.id, target)
    return
  }

  if (effect.kind === 'shield') {
    target.shield += effect.value
    emitEvent(state, 'gain_shield', { actorId: actor.id, targetId: target.id, cardId: card.id, payload: { targetName: target.name, amount: effect.value, shieldAfter: target.shield } })
    return
  }

  if (effect.kind === 'heal') {
    const before = target.currentHp
    target.currentHp = Math.min(target.hp, target.currentHp + effect.value)
    emitEvent(state, 'heal', {
      actorId: actor.id,
      targetId: target.id,
      cardId: card.id,
      payload: { targetName: target.name, healAmount: target.currentHp - before, targetHpAfter: target.currentHp },
    })
    return
  }

  if (effect.kind === 'apply_status') {
    applyStatus(state, actor, target, effect.statusType, effect.value, effect.duration, card.id)
    return
  }

  if (effect.kind === 'cleanse') {
    const before = target.statusEffects.length
    target.statusEffects = target.statusEffects.filter((status) => !NEGATIVE_STATUS.includes(status.type))
    emitEvent(state, 'cleanse', { actorId: actor.id, targetId: target.id, cardId: card.id, payload: { targetName: target.name, removedCount: before - target.statusEffects.length } })
    return
  }

  if (effect.kind === 'dispel') {
    const before = target.statusEffects.length
    target.statusEffects = target.statusEffects.filter((status) => !POSITIVE_STATUS.includes(status.type))
    emitEvent(state, 'dispel', { actorId: actor.id, targetId: target.id, cardId: card.id, payload: { targetName: target.name, removedCount: before - target.statusEffects.length } })
    return
  }

  if (effect.kind === 'apply_immunity') {
    target.immunities.push({ immuneTo: [...effect.immuneTo], duration: effect.duration, sourceUnitId: actor.id })
    emitEvent(state, 'apply_immunity', { actorId: actor.id, targetId: target.id, cardId: card.id, payload: { targetName: target.name, duration: effect.duration } })
  }
}

const settleBasicAttack = (state: BattleState, actor: UnitState, enemyTeam: TeamState) => {
  const target = chooseFrontTarget(getTauntTargets(enemyTeam.units))
  if (!target) return

  emitEvent(state, 'basic_attack', {
    actorId: actor.id,
    targetId: target.id,
    payload: { actorTeam: actor.team, actorName: actor.name, targetTeam: target.team, targetName: target.name },
  })

  const { absorbed, hpDamage } = applyDamage(target, actor.attack)
  emitEvent(state, 'deal_damage', {
    actorId: actor.id,
    targetId: target.id,
    payload: { source: 'basic_attack', targetName: target.name, rawDamage: actor.attack, absorbed, hpDamage, targetHpAfter: Math.max(target.currentHp, 0) },
  })
  settleDeath(state, actor.id, target)
}

const buildBattleReport = (events: BattleEvent[], unitIds: string[]): BattleReport => {
  const units: Record<string, BattleReportUnitStats> = {}
  for (const id of unitIds) {
    units[id] = { unitId: id, dealtDamage: 0, takenDamage: 0, healingReceived: 0, statusesApplied: 0, statusDamageTriggers: 0 }
  }

  for (const event of events) {
    if (event.type === 'deal_damage') {
      const hpDamage = Number(event.payload?.hpDamage ?? 0)
      if (event.actorId && units[event.actorId]) units[event.actorId].dealtDamage += hpDamage
      if (event.targetId && units[event.targetId]) units[event.targetId].takenDamage += hpDamage
      if ((event.payload?.source === 'burn' || event.payload?.source === 'poison') && event.actorId && units[event.actorId]) {
        units[event.actorId].statusDamageTriggers += 1
      }
    }

    if (event.type === 'heal' && event.targetId && units[event.targetId]) {
      units[event.targetId].healingReceived += Number(event.payload?.healAmount ?? 0)
    }

    if (event.type === 'apply_status' && event.actorId && units[event.actorId]) {
      units[event.actorId].statusesApplied += 1
    }
  }

  return { units }
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
    currentPhase: 'turn_start',
  }

  const allUnits = [...state.left.units, ...state.right.units]
  emitEvent(state, 'battle_start', { payload: { leftTeam: state.left.name, rightTeam: state.right.name } })
  history.push(snapshotBattleState(state))

  let rounds = 0
  while (getLivingUnits(state.left.units).length > 0 && getLivingUnits(state.right.units).length > 0 && rounds < MAX_ROUNDS) {
    rounds += 1

    const turnOrder = getLivingUnits(allUnits).sort((a, b) => (b.speed === a.speed ? a.id.localeCompare(b.id) : b.speed - a.speed))

    for (const actor of turnOrder) {
      if (!actor.alive) continue
      const actorTeam = actor.team === state.left.name ? state.left : state.right
      const enemyTeam = actor.team === state.left.name ? state.right : state.left

      state.turn = { round: rounds, actorTeam: actor.team, actorUnitId: actor.id, actorUnitName: actor.name }

      setPhase(state, 'turn_start')
      emitEvent(state, 'turn_start', { actorId: actor.id, payload: { round: rounds, actorTeam: actor.team, actorName: actor.name } })
      drawCard(actorTeam, cardsById, state, actor.id)

      setPhase(state, 'before_action')
      const skip = tickBeforeActionStatuses(state, actor)
      if (!actor.alive || skip) {
        setPhase(state, 'turn_end')
        tickTurnEnd(state, actor)
        history.push(snapshotBattleState(state))
        if (getLivingUnits(state.left.units).length === 0 || getLivingUnits(state.right.units).length === 0) break
        continue
      }

      setPhase(state, 'action')
      const cardIndex = chooseCardIndex(actor, actorTeam.hand)
      const chosenCard = cardIndex >= 0 ? actorTeam.hand.splice(cardIndex, 1)[0] : undefined
      if (chosenCard) {
        emitEvent(state, 'play_card', { actorId: actor.id, cardId: chosenCard.id, payload: { actorTeam: actor.team, actorName: actor.name, cardName: chosenCard.name } })
        for (const effect of chosenCard.effects) settleCardEffect(state, actor, enemyTeam, chosenCard, effect)
        actorTeam.discardPile.push(chosenCard)
        emitEvent(state, 'discard_card', { actorId: actor.id, cardId: chosenCard.id, payload: { teamName: actorTeam.name, cardName: chosenCard.name } })
      } else {
        settleBasicAttack(state, actor, enemyTeam)
      }

      setPhase(state, 'after_action')
      setPhase(state, 'turn_end')
      tickTurnEnd(state, actor)
      history.push(snapshotBattleState(state))

      if (getLivingUnits(state.left.units).length === 0 || getLivingUnits(state.right.units).length === 0) break
    }
  }

  state.turn = null
  const leftAlive = getLivingUnits(state.left.units).length
  const rightAlive = getLivingUnits(state.right.units).length
  const winner = leftAlive >= rightAlive ? state.left.name : state.right.name
  emitEvent(state, 'battle_end', { payload: { winner } })
  history.push(snapshotBattleState(state))

  const unitIds = [...config.left.units, ...config.right.units].map((unit) => unit.id)
  const battleReport = buildBattleReport(state.events, unitIds)

  return { winner, rounds, logs: state.logs, events: state.events, finalState: snapshotBattleState(state), history, battleReport }
}
