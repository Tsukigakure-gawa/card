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
  CostType,
  ImmunityEffect,
  Position,
  Profession,
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
  actionPoints: number
  maxActionPoints: number
  classResourceType?: CostType
  classResource: number
  maxClassResource: number
  statusEffects: StatusEffect[]
  immunities: ImmunityEffect[]
}

type TeamState = { name: string; units: UnitState[]; drawPile: string[]; hand: CardConfig[]; discardPile: CardConfig[] }
type BattleState = {
  left: TeamState
  right: TeamState
  turn: TurnInfo | null
  logs: string[]
  events: BattleEvent[]
  nextStepIndex: number
  currentPhase: BattlePhase
}

const MAX_ROUNDS = 60
const NEGATIVE_STATUS: StatusEffectType[] = ['burn', 'poison', 'stun']
const POSITIVE_STATUS: StatusEffectType[] = ['taunt']

const getLivingUnits = (units: UnitState[]) => units.filter((u) => u.alive)
const byPosition = (units: UnitState[], p: Position) => getLivingUnits(units).find((u) => u.position === p)
const nearestEnemy = (units: UnitState[]) => byPosition(units, 'front') ?? byPosition(units, 'middle') ?? byPosition(units, 'back')

const resourceRules: Record<Profession, { baseAP: number; apRegen: number; classType?: CostType; classBase?: number; manaScale?: boolean }> = {
  warrior: { baseAP: 2, apRegen: 2, classType: 'fightingSpirit', classBase: 3 },
  tank: { baseAP: 2, apRegen: 2, classType: 'fightingSpirit', classBase: 3 },
  mage: { baseAP: 1, apRegen: 1, classType: 'mana', classBase: 3, manaScale: true },
  priest: { baseAP: 1, apRegen: 1, classType: 'mana', classBase: 3, manaScale: true },
  hunter: { baseAP: 4, apRegen: 2, classType: 'actionPoints', classBase: 0 },
  assassin: { baseAP: 4, apRegen: 2, classType: 'actionPoints', classBase: 0 },
}

const toUnitSnapshot = (u: UnitState): UnitStateSnapshot => ({
  id: u.id,
  name: u.name,
  profession: u.profession,
  position: u.position,
  team: u.team,
  currentHp: u.currentHp,
  maxHp: u.maxHp,
  attack: u.attack,
  speed: u.speed,
  shield: u.shield,
  alive: u.alive,
  actionPoints: u.actionPoints,
  maxActionPoints: u.maxActionPoints,
  classResourceType: u.classResourceType,
  classResource: u.classResource,
  maxClassResource: u.maxClassResource,
  statusEffects: u.statusEffects.map((s) => ({ ...s })),
  immunities: u.immunities.map((i) => ({ ...i, immuneTo: [...i.immuneTo] })),
})

const toTeamSnapshot = (t: TeamState): TeamStateSnapshot => ({
  name: t.name,
  units: t.units.map(toUnitSnapshot),
  drawPile: [...t.drawPile],
  hand: t.hand.map((c) => c.id),
  discardPile: t.discardPile.map((c) => c.id),
})

const snapshot = (s: BattleState): BattleStateSnapshot => ({ left: toTeamSnapshot(s.left), right: toTeamSnapshot(s.right), turn: s.turn ? { ...s.turn } : null, logs: [...s.logs] })

const logFromEvent = (e: BattleEvent) => `${e.stepIndex}.${e.type}`

const emit = (s: BattleState, type: BattleEventType, fields: Omit<BattleEvent, 'type' | 'stepIndex' | 'phase'> = {}) => {
  const event: BattleEvent = { type, stepIndex: s.nextStepIndex, phase: s.currentPhase, ...fields }
  s.nextStepIndex += 1
  s.events.push(event)
  s.logs.push(logFromEvent(event))
}

const setPhase = (s: BattleState, phase: BattlePhase) => {
  s.currentPhase = phase
  emit(s, 'phase_start', { payload: { phase } })
}

const applyDamage = (t: UnitState, damage: number) => {
  const absorbed = Math.min(t.shield, damage)
  t.shield -= absorbed
  const hpDamage = damage - absorbed
  t.currentHp -= hpDamage
  if (t.currentHp <= 0) t.alive = false
  return { absorbed, hpDamage }
}

const removeExpiredStatus = (s: BattleState, u: UnitState) => {
  u.statusEffects = u.statusEffects.filter((st) => {
    if (st.duration > 0) return true
    emit(s, 'remove_status', { targetId: u.id, payload: { statusType: st.type } })
    return false
  })
  u.immunities = u.immunities.filter((im) => im.duration > 0)
}

const mergeStatus = (u: UnitState, inc: StatusEffect) => {
  const ex = u.statusEffects.find((x) => x.type === inc.type)
  if (!ex) {
    u.statusEffects.push(inc)
    return 'new'
  }
  if (inc.type === 'burn' || inc.type === 'poison') {
    ex.value += inc.value
    ex.duration = Math.max(ex.duration, inc.duration)
    return 'stack'
  }
  ex.duration = Math.max(ex.duration, inc.duration)
  return 'refresh'
}

const isImmune = (u: UnitState, st: StatusEffectType) => u.immunities.some((i) => i.duration > 0 && i.immuneTo.includes(st))

const canPay = (u: UnitState, c: CardConfig) => {
  if (c.costType === 'actionPoints') return u.actionPoints >= c.cost
  return u.classResourceType === c.costType && u.classResource >= c.cost
}

const payCost = (s: BattleState, u: UnitState, c: CardConfig) => {
  if (c.costType === 'actionPoints') {
    u.actionPoints -= c.cost
    emit(s, 'resource_change', { actorId: u.id, payload: { actionPoints: u.actionPoints } })
  } else if (u.classResourceType === c.costType) {
    u.classResource -= c.cost
    emit(s, 'resource_change', { actorId: u.id, payload: { classResource: u.classResource, classResourceType: u.classResourceType } })
  }
}

const createTeam = (team: TeamConfig, cards: Map<string, CardConfig>): TeamState => {
  const units: UnitState[] = team.units.map((u) => {
    const rule = resourceRules[u.profession]
    const maxClass = rule.classType === 'mana' ? 10 : rule.classBase ?? 0
    return {
      ...u,
      team: team.name,
      currentHp: u.maxHp,
      shield: 0,
      alive: true,
      actionPoints: rule.baseAP,
      maxActionPoints: rule.baseAP,
      classResourceType: rule.classType === 'actionPoints' ? undefined : rule.classType,
      classResource: rule.classType && rule.classType !== 'actionPoints' ? (rule.classBase ?? 0) : 0,
      maxClassResource: maxClass,
      statusEffects: [],
      immunities: [],
    }
  })

  const deckIds = units.flatMap((u) => [u.loadout.signatureSkill, ...u.loadout.commonCards, ...u.loadout.classCards])
  const drawPile = deckIds.filter((id) => cards.has(id))
  return { name: team.name, units, drawPile, hand: [], discardPile: [] }
}

const pickTargets = (actor: UnitState, enemyTeam: TeamState, allyTeam: TeamState, targetType: CardEffect['targetType']): UnitState[] => {
  const enemyPool = getLivingUnits(enemyTeam.units)
  const allyPool = getLivingUnits(allyTeam.units)
  const tauntEnemies = enemyPool.filter((u) => u.statusEffects.some((st) => st.type === 'taunt' && st.duration > 0))
  const enemy = tauntEnemies.length > 0 ? tauntEnemies : enemyPool

  let raw: Array<UnitState | undefined> = []
  switch (targetType) {
    case 'self':
      raw = [actor]
      break
    case 'ally_single':
      raw = [allyPool[0]]
      break
    case 'ally_front':
      raw = [allyPool.find((u) => u.position === 'front')]
      break
    case 'ally_back':
      raw = [allyPool.find((u) => u.position === 'back')]
      break
    case 'enemy_front':
      raw = [byPosition(enemy, 'front') ?? nearestEnemy(enemy)]
      break
    case 'enemy_middle':
      raw = [byPosition(enemy, 'middle') ?? nearestEnemy(enemy)]
      break
    case 'enemy_back':
      raw = [byPosition(enemy, 'back') ?? nearestEnemy(enemy)]
      break
    case 'enemy_single':
      raw = [nearestEnemy(enemy)]
      break
    case 'enemy_lowest_hp':
      raw = [enemy.slice().sort((a, b) => a.currentHp - b.currentHp)[0]]
      break
    case 'all_allies':
      raw = allyPool
      break
    case 'all_enemies':
      raw = enemy
      break
    default:
      raw = []
  }

  return raw.filter((v): v is UnitState => Boolean(v))
}

const applyCardEffect = (s: BattleState, actor: UnitState, actorTeam: TeamState, enemyTeam: TeamState, card: CardConfig, effect: CardEffect) => {
  const targets = pickTargets(actor, enemyTeam, actorTeam, effect.targetType)
  for (const target of targets) {
    if (effect.kind === 'damage') {
      const { absorbed, hpDamage } = applyDamage(target, effect.value)
      emit(s, 'deal_damage', { actorId: actor.id, targetId: target.id, cardId: card.id, payload: { rawDamage: effect.value, absorbed, hpDamage } })
      if (!target.alive) emit(s, 'unit_down', { actorId: actor.id, targetId: target.id })
    } else if (effect.kind === 'shield') {
      target.shield += effect.value
      emit(s, 'gain_shield', { actorId: actor.id, targetId: target.id, payload: { amount: effect.value } })
    } else if (effect.kind === 'heal') {
      const before = target.currentHp
      target.currentHp = Math.min(target.maxHp, target.currentHp + effect.value)
      emit(s, 'heal', { actorId: actor.id, targetId: target.id, payload: { healAmount: target.currentHp - before } })
    } else if (effect.kind === 'apply_status') {
      if (isImmune(target, effect.statusType)) {
        emit(s, 'block_status', { actorId: actor.id, targetId: target.id, payload: { statusType: effect.statusType } })
      } else {
        const mode = mergeStatus(target, { type: effect.statusType, value: effect.value, duration: effect.duration, sourceUnitId: actor.id })
        emit(s, 'apply_status', { actorId: actor.id, targetId: target.id, payload: { statusType: effect.statusType, mode } })
      }
    } else if (effect.kind === 'cleanse') {
      const before = target.statusEffects.length
      target.statusEffects = target.statusEffects.filter((st) => !NEGATIVE_STATUS.includes(st.type))
      emit(s, 'cleanse', { actorId: actor.id, targetId: target.id, payload: { removedCount: before - target.statusEffects.length } })
    } else if (effect.kind === 'dispel') {
      const before = target.statusEffects.length
      target.statusEffects = target.statusEffects.filter((st) => !POSITIVE_STATUS.includes(st.type))
      emit(s, 'dispel', { actorId: actor.id, targetId: target.id, payload: { removedCount: before - target.statusEffects.length } })
    } else if (effect.kind === 'apply_immunity') {
      target.immunities.push({ immuneTo: effect.immuneTo, duration: effect.duration, sourceUnitId: actor.id })
      emit(s, 'apply_immunity', { actorId: actor.id, targetId: target.id, payload: { duration: effect.duration } })
    }
  }
}

const tickStatusesBeforeAction = (s: BattleState, u: UnitState) => {
  let skip = false
  for (const st of u.statusEffects) {
    if (st.duration <= 0) continue
    if (st.type === 'burn' || st.type === 'poison') {
      emit(s, 'tick_status', { targetId: u.id, payload: { statusType: st.type } })
      const { hpDamage } = applyDamage(u, st.value)
      emit(s, 'deal_damage', { actorId: st.sourceUnitId, targetId: u.id, payload: { rawDamage: st.value, hpDamage, source: st.type } })
      st.duration -= 1
    }
    if (st.type === 'stun') {
      emit(s, 'skip_turn', { targetId: u.id })
      st.duration -= 1
      skip = true
    }
  }
  removeExpiredStatus(s, u)
  return skip
}

const recoverResourcesTurnEnd = (s: BattleState, u: UnitState, round: number) => {
  const rule = resourceRules[u.profession]
  u.actionPoints = Math.min(u.maxActionPoints, u.actionPoints + rule.apRegen)
  if (u.classResourceType === 'fightingSpirit') {
    u.classResource = 3
  }
  if (u.classResourceType === 'mana') {
    u.classResource = Math.min(u.maxClassResource, u.classResource + 3 + round)
  }
  for (const im of u.immunities) im.duration -= 1
  for (const st of u.statusEffects) if (st.type === 'taunt') st.duration -= 1
  removeExpiredStatus(s, u)
  emit(s, 'resource_change', { actorId: u.id, payload: { actionPoints: u.actionPoints, classResource: u.classResource } })
}

const chooseCardIndex = (u: UnitState, hand: CardConfig[]) => {
  const affordable = hand.map((c, idx) => ({ c, idx })).filter(({ c }) => canPay(u, c))
  if (affordable.length === 0) return -1
  const shield = affordable.find((x) => x.c.effects.some((e) => e.kind === 'shield'))
  if (u.shield <= 2 && shield) return shield.idx
  const dmg = affordable.find((x) => x.c.effects.some((e) => e.kind === 'damage'))
  return (dmg ?? affordable[0]).idx
}

const draw = (s: BattleState, team: TeamState, cards: Map<string, CardConfig>, actorId: string) => {
  if (team.drawPile.length === 0 && team.discardPile.length > 0) {
    team.drawPile.push(...team.discardPile.map((c) => c.id))
    team.discardPile = []
    emit(s, 'recycle_discard', { actorId })
  }
  const cardId = team.drawPile.shift()
  if (!cardId) return
  const card = cards.get(cardId)
  if (!card) return
  team.hand.push(card)
  emit(s, 'draw_card', { actorId, cardId })
}

const basicAttackTarget = (u: UnitState, enemy: TeamState) => {
  if (u.profession === 'warrior' || u.profession === 'tank') return byPosition(enemy.units, 'front') ?? nearestEnemy(enemy.units)
  return nearestEnemy(enemy.units)
}

const buildBattleReport = (events: BattleEvent[], ids: string[]): BattleReport => {
  const units: Record<string, BattleReportUnitStats> = {}
  for (const id of ids) units[id] = { unitId: id, dealtDamage: 0, takenDamage: 0, healingReceived: 0, statusesApplied: 0, statusDamageTriggers: 0 }
  for (const e of events) {
    if (e.type === 'deal_damage') {
      const d = Number(e.payload?.hpDamage ?? 0)
      if (e.actorId && units[e.actorId]) units[e.actorId].dealtDamage += d
      if (e.targetId && units[e.targetId]) units[e.targetId].takenDamage += d
      if ((e.payload?.source === 'burn' || e.payload?.source === 'poison') && e.actorId && units[e.actorId]) units[e.actorId].statusDamageTriggers += 1
    }
    if (e.type === 'heal' && e.targetId && units[e.targetId]) units[e.targetId].healingReceived += Number(e.payload?.healAmount ?? 0)
    if (e.type === 'apply_status' && e.actorId && units[e.actorId]) units[e.actorId].statusesApplied += 1
  }
  return { units }
}

export const runBattle = (config: BattleConfig): BattleResult => {
  const cardsMap = new Map(config.cards.map((c) => [c.id, c]))
  const state: BattleState = {
    left: createTeam(config.left, cardsMap),
    right: createTeam(config.right, cardsMap),
    turn: null,
    logs: [],
    events: [],
    nextStepIndex: 1,
    currentPhase: 'turn_start',
  }
  const history: BattleStateSnapshot[] = []
  emit(state, 'battle_start', { payload: { leftTeam: state.left.name, rightTeam: state.right.name } })
  history.push(snapshot(state))

  let rounds = 0
  while (getLivingUnits(state.left.units).length > 0 && getLivingUnits(state.right.units).length > 0 && rounds < MAX_ROUNDS) {
    rounds += 1
    const order = [...getLivingUnits(state.left.units), ...getLivingUnits(state.right.units)].sort((a, b) => (b.speed === a.speed ? a.id.localeCompare(b.id) : b.speed - a.speed))

    for (const actor of order) {
      if (!actor.alive) continue
      const actorTeam = actor.team === state.left.name ? state.left : state.right
      const enemyTeam = actor.team === state.left.name ? state.right : state.left
      state.turn = { round: rounds, actorTeam: actor.team, actorUnitId: actor.id, actorUnitName: actor.name }

      setPhase(state, 'turn_start')
      emit(state, 'turn_start', { actorId: actor.id })
      draw(state, actorTeam, cardsMap, actor.id)

      setPhase(state, 'before_action')
      const skip = tickStatusesBeforeAction(state, actor)
      if (!actor.alive || skip) {
        setPhase(state, 'turn_end')
        recoverResourcesTurnEnd(state, actor, rounds)
        history.push(snapshot(state))
        continue
      }

      setPhase(state, 'action')
      const cardIndex = chooseCardIndex(actor, actorTeam.hand)
      const card = cardIndex >= 0 ? actorTeam.hand.splice(cardIndex, 1)[0] : undefined
      if (card) {
        payCost(state, actor, card)
        emit(state, 'play_card', { actorId: actor.id, cardId: card.id })
        for (const effect of card.effects) applyCardEffect(state, actor, actorTeam, enemyTeam, card, effect)
        actorTeam.discardPile.push(card)
        emit(state, 'discard_card', { actorId: actor.id, cardId: card.id })
      } else {
        const target = basicAttackTarget(actor, enemyTeam)
        if (target) {
          emit(state, 'basic_attack', { actorId: actor.id, targetId: target.id })
          const { hpDamage } = applyDamage(target, actor.attack)
          emit(state, 'deal_damage', { actorId: actor.id, targetId: target.id, payload: { rawDamage: actor.attack, hpDamage, source: 'basic_attack' } })
          if (!target.alive) emit(state, 'unit_down', { actorId: actor.id, targetId: target.id })
        }
      }

      setPhase(state, 'after_action')
      setPhase(state, 'turn_end')
      recoverResourcesTurnEnd(state, actor, rounds)
      history.push(snapshot(state))

      if (getLivingUnits(state.left.units).length === 0 || getLivingUnits(state.right.units).length === 0) break
    }
  }

  const winner = getLivingUnits(state.left.units).length >= getLivingUnits(state.right.units).length ? state.left.name : state.right.name
  emit(state, 'battle_end', { payload: { winner } })
  history.push(snapshot(state))
  const ids = [...config.left.units, ...config.right.units].map((u) => u.id)
  const battleReport = buildBattleReport(state.events, ids)
  return { winner, rounds, logs: state.logs, events: state.events, finalState: snapshot(state), history, battleReport }
}
