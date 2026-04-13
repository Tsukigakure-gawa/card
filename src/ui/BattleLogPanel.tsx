import type { BattleResult } from '../engine/types'

type BattleLogPanelProps = {
  result: BattleResult
}

export const BattleLogPanel = ({ result }: BattleLogPanelProps) => {
  return (
    <section>
      <h1>自动对战卡牌原型</h1>
      <p>
        胜利方：<strong>{result.winner}</strong>（{result.rounds} 回合）
      </p>
      <ol>
        {result.logs.map((log, index) => (
          <li key={`${index}-${log}`}>{log}</li>
        ))}
      </ol>
    </section>
  )
}
