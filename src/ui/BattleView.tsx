import type { BattleEvent, BattleStateSnapshot } from '../engine/types'

type BattleViewProps = {
  snapshot: BattleStateSnapshot
  currentEvent?: BattleEvent
  step: number
  totalSteps: number
  winner?: string
}

const TeamPanel = ({ team }: { team: BattleStateSnapshot['left'] }) => (
  <div className="team-panel">
    <h3>{team.name}</h3>
    <p>
      牌库 {team.drawPile.length} | 手牌 {team.hand.length} | 弃牌堆 {team.discardPile.length}
    </p>
    <p>手牌: {team.hand.join(', ') || '-'}</p>
    {team.units.map((unit) => (
      <div key={unit.id} className="unit-card">
        <strong>
          [{unit.position}] {unit.name}
        </strong>{' '}
        ({unit.profession})
        <div>
          HP {Math.max(unit.currentHp, 0)}/{unit.maxHp} | Shield {unit.shield} | AP {unit.actionPoints}/{unit.maxActionPoints}
        </div>
        <div>
          资源 {unit.classResourceType ?? '-'}: {unit.classResource}/{unit.maxClassResource}
        </div>
        <div>状态: {unit.statusEffects.length > 0 ? unit.statusEffects.map((s) => `${s.type}:${s.duration}`).join('、') : '无'}</div>
      </div>
    ))}
  </div>
)

export const BattleView = ({ snapshot, currentEvent, step, totalSteps, winner }: BattleViewProps) => (
  <section>
    <h2>战斗页面</h2>
    <p>
      Step {step + 1}/{totalSteps} | 回合 {snapshot.turn?.round ?? '-'} | phase {currentEvent?.phase ?? '-'} | 行动者{' '}
      {snapshot.turn ? `${snapshot.turn.actorTeam}-${snapshot.turn.actorUnitName}` : '-'} | 胜者 {winner ?? '未结束'}
    </p>
    <div className="teams-grid">
      <TeamPanel team={snapshot.left} />
      <TeamPanel team={snapshot.right} />
    </div>
    <p>当前事件: {currentEvent ? `${currentEvent.type} #${currentEvent.stepIndex}` : '无'}</p>
  </section>
)
