import type { BattleEvent, BattleStateSnapshot } from '../engine/types'

type BattleViewProps = {
  snapshot: BattleStateSnapshot
  currentEvent?: BattleEvent
  step: number
  totalSteps: number
  winner?: string
}

const TeamPanel = ({ team }: { team: BattleStateSnapshot['left'] }) => {
  return (
    <div className="team-panel">
      <h3>{team.name}</h3>
      <p>
        牌库 {team.drawPile.length} | 手牌 {team.hand.length} | 弃牌堆 {team.discardPile.length}
      </p>
      <p>手牌: {team.hand.join(', ') || '-'}</p>
      {team.units.map((unit) => (
        <div key={unit.id} className="unit-card">
          <strong>{unit.name}</strong>（{unit.alive ? '存活' : '阵亡'}）
          <div>
            HP: {Math.max(unit.currentHp, 0)} / {unit.maxHp} | Shield: {unit.shield}
          </div>
          <div>
            状态: {unit.statusEffects.length > 0 ? unit.statusEffects.map((s) => `${s.type}(v${s.value},d${s.duration})`).join('、') : '无'}
          </div>
        </div>
      ))}
    </div>
  )
}

export const BattleView = ({ snapshot, currentEvent, step, totalSteps, winner }: BattleViewProps) => {
  return (
    <section>
      <h2>战场</h2>
      <p>
        Step {step + 1}/{totalSteps} | 回合 {snapshot.turn?.round ?? '-'} | Phase {currentEvent?.phase ?? '-'} | 当前行动{' '}
        {snapshot.turn ? `${snapshot.turn.actorTeam}·${snapshot.turn.actorUnitName}` : '-'} | 胜者 {winner ?? '未结束'}
      </p>
      <div className="teams-grid">
        <TeamPanel team={snapshot.left} />
        <TeamPanel team={snapshot.right} />
      </div>
      <p>
        当前事件: {currentEvent ? `${currentEvent.type} (step:${currentEvent.stepIndex})` : '无'}
      </p>
    </section>
  )
}
