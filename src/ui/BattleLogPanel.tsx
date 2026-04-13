import type { BattleEvent } from '../engine/types'

type BattleLogPanelProps = {
  logs: string[]
  events: BattleEvent[]
  step: number
}

const eventColorClass = (type: BattleEvent['type']) => {
  if (['deal_damage', 'basic_attack', 'unit_down'].includes(type)) return 'event-damage'
  if (['heal', 'gain_shield'].includes(type)) return 'event-heal'
  if (['apply_status', 'tick_status', 'remove_status', 'skip_turn', 'cleanse', 'dispel', 'apply_immunity', 'block_status'].includes(type)) return 'event-status'
  if (type === 'resource_change') return 'event-resource'
  return 'event-neutral'
}

const getResourceHint = (event: BattleEvent | undefined, events: BattleEvent[], currentIndex: number) => {
  if (!event || event.type !== 'resource_change' || !event.actorId) return null

  const prev = events
    .slice(0, currentIndex)
    .reverse()
    .find((e) => e.type === 'resource_change' && e.actorId === event.actorId)

  const ap = Number(event.payload?.actionPoints ?? NaN)
  const apPrev = Number(prev?.payload?.actionPoints ?? NaN)
  const classRes = Number(event.payload?.classResource ?? NaN)
  const classPrev = Number(prev?.payload?.classResource ?? NaN)

  const apDelta = Number.isNaN(ap) || Number.isNaN(apPrev) ? null : ap - apPrev
  const classDelta = Number.isNaN(classRes) || Number.isNaN(classPrev) ? null : classRes - classPrev
  const className = String(event.payload?.classResourceType ?? 'Resource')

  const parts: string[] = []
  if (apDelta !== null && apDelta !== 0) parts.push(`AP ${apDelta > 0 ? '+' : ''}${apDelta}`)
  if (classDelta !== null && classDelta !== 0) parts.push(`${className} ${classDelta > 0 ? '+' : ''}${classDelta}`)

  return parts.length > 0 ? parts.join(' | ') : `AP ${Number.isNaN(ap) ? '-' : ap}, ${className} ${Number.isNaN(classRes) ? '-' : classRes}`
}

export const BattleLogPanel = ({ logs, events, step }: BattleLogPanelProps) => {
  const clamped = Math.min(step, Math.max(0, events.length - 1))
  const event = events[clamped]
  const visibleLogs = logs.slice(0, step + 1)
  const visibleEvents = events.slice(0, clamped + 1)
  const resourceHint = getResourceHint(event, events, clamped)

  return (
    <section className="panel battle-log-layout">
      <div className="current-event-panel">
        <h3>当前事件</h3>
        {event ? (
          <>
            <p>
              <span className={`event-tag ${eventColorClass(event.type)}`}>{event.type}</span>
            </p>
            <ul>
              <li>phase: {event.phase ?? '-'}</li>
              <li>actor: {event.actorId ?? '-'}</li>
              <li>target: {event.targetId ?? '-'}</li>
              <li>card: {event.cardId ?? '-'}</li>
            </ul>
            {resourceHint ? <p className="resource-hint">{resourceHint}</p> : null}
          </>
        ) : (
          <p>无事件</p>
        )}
      </div>

      <div className="history-log-panel">
        <h3>历史日志</h3>
        <ul className="event-list">
          {visibleEvents.slice(-12).map((evt) => (
            <li key={evt.stepIndex}>
              <span className={`event-tag ${eventColorClass(evt.type)}`}>{evt.type}</span>
              <span className="muted">#{evt.stepIndex}</span>
            </li>
          ))}
        </ul>
        <ol>
          {visibleLogs.slice(-20).map((log, index) => (
            <li key={`${index}-${log}`}>{log}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
