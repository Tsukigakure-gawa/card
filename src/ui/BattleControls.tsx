type BattleControlsProps = {
  started: boolean
  canPrev: boolean
  canNext: boolean
  isAutoplay: boolean
  onStart: () => void
  onPrev: () => void
  onNext: () => void
  onToggleAutoplay: () => void
  onReset: () => void
  onJumpEnd: () => void
}

export const BattleControls = ({
  started,
  canPrev,
  canNext,
  isAutoplay,
  onStart,
  onPrev,
  onNext,
  onToggleAutoplay,
  onReset,
  onJumpEnd,
}: BattleControlsProps) => {
  return (
    <section>
      <h2>播放控制</h2>
      <div className="controls">
        <button onClick={onStart} disabled={started}>
          开始战斗
        </button>
        <button onClick={onPrev} disabled={!started || !canPrev}>
          上一步
        </button>
        <button onClick={onNext} disabled={!started || !canNext}>
          下一步
        </button>
        <button onClick={onToggleAutoplay} disabled={!started}>
          {isAutoplay ? '暂停' : '自动播放'}
        </button>
        <button onClick={onJumpEnd} disabled={!started}>
          跳到最后
        </button>
        <button onClick={onReset}>重置</button>
      </div>
    </section>
  )
}
