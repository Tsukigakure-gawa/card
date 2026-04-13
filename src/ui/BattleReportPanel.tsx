import type { BattleReport } from '../engine/types'

type BattleReportPanelProps = {
  winner: string
  rounds: number
  report: BattleReport
}

export const BattleReportPanel = ({ winner, rounds, report }: BattleReportPanelProps) => {
  return (
    <section>
      <h2>结算</h2>
      <p>
        胜者：{winner} | 总回合：{rounds}
      </p>
      <table>
        <thead>
          <tr>
            <th>单位</th>
            <th>造成伤害</th>
            <th>承受伤害</th>
            <th>获得治疗</th>
            <th>施加状态次数</th>
            <th>状态伤害触发</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(report.units).map((stat) => (
            <tr key={stat.unitId}>
              <td>{stat.unitId}</td>
              <td>{stat.dealtDamage}</td>
              <td>{stat.takenDamage}</td>
              <td>{stat.healingReceived}</td>
              <td>{stat.statusesApplied}</td>
              <td>{stat.statusDamageTriggers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
