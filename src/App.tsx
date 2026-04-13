import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { battlePresets } from './data/presets'
import { runBattle } from './engine/simulator'
import type { BattleResult } from './engine/types'
import { BattleControls } from './ui/BattleControls'
import { BattleLogPanel } from './ui/BattleLogPanel'
import { BattleReportPanel } from './ui/BattleReportPanel'
import { BattleView } from './ui/BattleView'
import { PresetSelector } from './ui/PresetSelector'

function App() {
  const [selectedPresetId, setSelectedPresetId] = useState(battlePresets[0].id)
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)
  const [step, setStep] = useState(0)
  const [isAutoplay, setIsAutoplay] = useState(false)

  const selectedPreset = useMemo(
    () => battlePresets.find((preset) => preset.id === selectedPresetId) ?? battlePresets[0],
    [selectedPresetId],
  )

  useEffect(() => {
    if (!isAutoplay || !battleResult) return
    const timer = window.setInterval(() => {
      setStep((current) => {
        const max = battleResult.history.length - 1
        if (current >= max) {
          setIsAutoplay(false)
          return current
        }
        return current + 1
      })
    }, 600)

    return () => window.clearInterval(timer)
  }, [isAutoplay, battleResult])

  const startBattle = () => {
    const result = runBattle(selectedPreset.config)
    setBattleResult(result)
    setStep(0)
    setIsAutoplay(false)
  }

  const resetBattle = () => {
    setBattleResult(null)
    setStep(0)
    setIsAutoplay(false)
  }

  const maxStep = battleResult ? battleResult.history.length - 1 : 0
  const currentSnapshot = battleResult?.history[Math.min(step, maxStep)]
  const currentEvent = battleResult?.events[Math.min(step, battleResult.events.length - 1)]
  const isEnded = battleResult ? step >= maxStep : false

  return (
    <main>
      <h1>自动对战卡牌 MVP</h1>

      <PresetSelector
        presets={battlePresets}
        selectedId={selectedPresetId}
        onChange={setSelectedPresetId}
        disabled={Boolean(battleResult)}
      />

      <BattleControls
        started={Boolean(battleResult)}
        canPrev={step > 0}
        canNext={Boolean(battleResult) && step < maxStep}
        isAutoplay={isAutoplay}
        onStart={startBattle}
        onPrev={() => setStep((v) => Math.max(v - 1, 0))}
        onNext={() => setStep((v) => Math.min(v + 1, maxStep))}
        onToggleAutoplay={() => setIsAutoplay((v) => !v)}
        onReset={resetBattle}
        onJumpEnd={() => setStep(maxStep)}
      />

      {battleResult && currentSnapshot ? (
        <>
          <BattleView
            snapshot={currentSnapshot}
            currentEvent={currentEvent}
            step={step}
            totalSteps={battleResult.history.length}
            winner={isEnded ? battleResult.winner : undefined}
          />
          <BattleLogPanel logs={battleResult.logs} events={battleResult.events} step={step} />
          {isEnded ? (
            <BattleReportPanel
              winner={battleResult.winner}
              rounds={battleResult.rounds}
              report={battleResult.battleReport}
            />
          ) : null}
        </>
      ) : (
        <p>请选择预设并点击“开始战斗”。</p>
      )}
    </main>
  )
}

export default App
