import { useMemo } from 'react'
import { sampleBattleConfig } from './data/units'
import { runBattle } from './engine/simulator'
import { BattleLogPanel } from './ui/BattleLogPanel'
import './App.css'

function App() {
  const battleResult = useMemo(() => runBattle(sampleBattleConfig), [])

  console.log('Battle Logs:\n' + battleResult.logs.join('\n'))

  return <BattleLogPanel result={battleResult} />
}

export default App
