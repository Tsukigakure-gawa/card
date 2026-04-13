import type { BattleEvent } from '../engine/types'

type BattleLogPanelProps = {
  logs: string[]
  events: BattleEvent[]
  step: number
}

export const BattleLogPanel = ({ logs, events, step }: BattleLogPanelProps) => {
  const event = events[Math.min(step, Math.max(0, events.length - 1))]
  const visibleLogs = logs.slice(0, step + 1)

  return (
    <section className="panel battle-log-layout">
      <div className="current-event-panel">
        <h3>当前事件</h3>
        {event ? (
          <ul>
            <li>type: {event.type}</li>
            <li>phase: {event.phase ?? '-'}</li>
            <li>actor: {event.actorId ?? '-'}</li>
            <li>target: {event.targetId ?? '-'}</li>
            <li>card: {event.cardId ?? '-'}</li>
          </ul>
        ) : (
          <p>无事件</p>
        )}
      </div>

      <div className="history-log-panel">
        <h3>历史日志</h3>
        <ol>
          {visibleLogs.slice(-25).map((log, index) => (
            <li key={`${index}-${log}`}>{log}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
