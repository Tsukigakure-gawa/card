import type { BattleEvent, BattleStateSnapshot } from '../engine/types'

type BattleViewProps = {
  snapshot: BattleStateSnapshot
  currentEvent?: BattleEvent
  step: number
  totalSteps: number
  winner?: string
}

const statusIcon: Record<string, string> = {
  burn: '🔥',
  poison: '☠️',
  stun: '💫',
  taunt: '🛡️',
}

const UnitCard = ({ unit, actorId, targetId }: { unit: BattleStateSnapshot['left']['units'][number]; actorId?: string; targetId?: string }) => {
  const className = ['unit-card', unit.alive ? '' : 'dead', actorId === unit.id ? 'active-actor' : '', targetId === unit.id ? 'active-target' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <strong>
        [{unit.position}] {unit.name}
      </strong>{' '}
      <span className="muted">({unit.profession})</span>
      <div>HP: {Math.max(unit.currentHp, 0)}/{unit.maxHp}</div>
      <div>Shield: {unit.shield}</div>
      <div>AP: {unit.actionPoints}/{unit.maxActionPoints}</div>
      <div>{unit.classResourceType ? `${unit.classResourceType === 'mana' ? 'Mana' : 'Spirit'}: ${unit.classResource}/${unit.maxClassResource}` : 'Class: -'}</div>
      <div className="status-row">
        {unit.statusEffects.length > 0 ? (
          unit.statusEffects.map((status, idx) => (
            <span
              key={`${status.type}-${idx}`}
              className={`status-badge status-${status.type}`}
              title={`${status.type} 持续 ${status.duration} 回合, 强度 ${status.value}`}
            >
              {statusIcon[status.type] ?? '•'} {status.duration}
            </span>
          ))
        ) : (
          <span className="muted">无状态</span>
        )}
      </div>
    </div>
  )
}

const TeamPanel = ({ team, actorId, targetId }: { team: BattleStateSnapshot['left']; actorId?: string; targetId?: string }) => (
  <div className="team-panel">
    <h3>{team.name}</h3>
    <p>
      牌库 {team.drawPile.length} | 手牌 {team.hand.length} | 弃牌堆 {team.discardPile.length}
    </p>
    <p className="muted">手牌: {team.hand.join(', ') || '-'}</p>
    {team.units.map((unit) => (
      <UnitCard key={unit.id} unit={unit} actorId={actorId} targetId={targetId} />
    ))}
  </div>
)

export const BattleView = ({ snapshot, currentEvent, step, totalSteps, winner }: BattleViewProps) => (
  <section className="panel">
    <h2>战斗页面</h2>
    <p>
      Step {step + 1}/{totalSteps} | 回合 {snapshot.turn?.round ?? '-'} | phase {currentEvent?.phase ?? '-'} | 行动者{' '}
      {snapshot.turn ? `${snapshot.turn.actorTeam}-${snapshot.turn.actorUnitName}` : '-'} | 胜者 {winner ?? '未结束'}
    </p>
    <div className="teams-grid">
      <TeamPanel team={snapshot.left} actorId={currentEvent?.actorId} targetId={currentEvent?.targetId} />
      <TeamPanel team={snapshot.right} actorId={currentEvent?.actorId} targetId={currentEvent?.targetId} />
    </div>
  </section>
)
