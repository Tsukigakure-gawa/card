import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { allBattleCards } from './data/cards'
import { characterCatalog } from './data/characters'
import { battlePresets, buildBattleConfigFromPreset } from './data/presets'
import { runBattle } from './engine/simulator'
import type { BattleResult, Profession, UnitConfig } from './engine/types'
import { BattleControls } from './ui/BattleControls'
import { BattleLogPanel } from './ui/BattleLogPanel'
import { BattleReportPanel } from './ui/BattleReportPanel'
import { BattleView } from './ui/BattleView'
import { CardLibraryPage } from './ui/CardLibraryPage'
import { CharacterPage } from './ui/CharacterPage'

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function App() {
  const [tab, setTab] = useState<'library' | 'characters' | 'battle'>('library')
  const [professionFilter, setProfessionFilter] = useState<Profession | 'all'>('all')
  const [selectedPresetId, setSelectedPresetId] = useState(battlePresets[0].id)
  const [leftCharacters, setLeftCharacters] = useState<UnitConfig[]>(clone(battlePresets[0].leftTeam))
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)
  const [step, setStep] = useState(0)
  const [isAutoplay, setIsAutoplay] = useState(false)

  const selectedPreset = useMemo(() => battlePresets.find((p) => p.id === selectedPresetId) ?? battlePresets[0], [selectedPresetId])

  useEffect(() => {
    setLeftCharacters(clone(selectedPreset.leftTeam))
    setBattleResult(null)
    setStep(0)
    setIsAutoplay(false)
  }, [selectedPresetId])

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
    const config = buildBattleConfigFromPreset({ ...selectedPreset, leftTeam: leftCharacters })
    setBattleResult(runBattle(config))
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
  const currentEvent = battleResult?.events[Math.min(step, Math.max(0, battleResult.events.length - 1))]
  const isEnded = battleResult ? step >= maxStep : false

  return (
    <main>
      <h1>3v3 职业卡牌战斗原型</h1>

      <div className="tab-bar">
        <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>牌库页</button>
        <button className={tab === 'characters' ? 'active' : ''} onClick={() => setTab('characters')}>角色页</button>
        <button className={tab === 'battle' ? 'active' : ''} onClick={() => setTab('battle')}>战斗页</button>
      </div>

      {tab === 'library' ? <CardLibraryPage cards={allBattleCards} professionFilter={professionFilter} onProfessionFilterChange={setProfessionFilter} /> : null}

      {tab === 'characters' ? (
        <CharacterPage
          characters={leftCharacters}
          allCards={allBattleCards}
          onUpdateCharacter={(next) => setLeftCharacters((list) => list.map((c) => (c.id === next.id ? next : c)))}
        />
      ) : null}

      {tab === 'battle' ? (
        <>
          <section className="panel">
            <h2>战前配置确认</h2>
            <label>
              预设：
              <select value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
                {battlePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <p>{selectedPreset.description}</p>
            <div className="config-grid">
              <div>
                <h3>左队（当前可编辑）</h3>
                {leftCharacters.map((c) => (
                  <p key={c.id}>
                    {c.name} [{c.profession}/{c.position}] sig:{c.loadout.signatureSkill} | C:{c.loadout.commonCards.join(', ') || '-'} | K:{c.loadout.classCards.join(', ') || '-'}
                  </p>
                ))}
              </div>
              <div>
                <h3>右队（预设）</h3>
                {selectedPreset.rightTeam.map((c) => (
                  <p key={c.id}>
                    {c.name} [{c.profession}/{c.position}] sig:{c.loadout.signatureSkill} | C:{c.loadout.commonCards.join(', ') || '-'} | K:{c.loadout.classCards.join(', ') || '-'}
                  </p>
                ))}
              </div>
            </div>
          </section>

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
            <div className="battle-layout">
              <BattleView snapshot={currentSnapshot} currentEvent={currentEvent} step={step} totalSteps={battleResult.history.length} winner={isEnded ? battleResult.winner : undefined} />
              <BattleLogPanel logs={battleResult.logs} events={battleResult.events} step={step} />
              {isEnded ? <BattleReportPanel winner={battleResult.winner} rounds={battleResult.rounds} report={battleResult.battleReport} /> : null}
            </div>
          ) : (
            <p>请先开始战斗。</p>
          )}
        </>
      ) : null}

      <section className="panel">
        <h2>角色目录</h2>
        <ul>
          {characterCatalog.map((c) => (
            <li key={c.id}>
              {c.name} / {c.profession} / {c.position}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
