import type { BattleEvent } from '../engine/types'

type BattleLogPanelProps = {
  logs: string[]
  events: BattleEvent[]
  step: number
}

export const BattleLogPanel = ({ logs, events, step }: BattleLogPanelProps) => {
  const visibleLogs = logs.slice(0, step + 1)
  const visibleEvents = events.slice(0, step + 1)

  return (
    <section>
      <h2>日志 / 事件</h2>
      <p>当前日志条目：{visibleLogs.length}</p>
      <ul>
        {visibleEvents.slice(-5).map((event) => (
          <li key={event.stepIndex}>
            #{event.stepIndex} {event.type}
          </li>
        ))}
      </ul>
      <ol>
        {visibleLogs.slice(-20).map((log, index) => (
          <li key={`${index}-${log}`}>{log}</li>
        ))}
      </ol>
    </section>
  )
}
