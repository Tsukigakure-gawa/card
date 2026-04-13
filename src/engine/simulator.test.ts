import { describe, expect, it } from 'vitest'
import { sampleBattleConfig } from '../data/units'
import { runBattle } from './simulator'

describe('runBattle', () => {
  it('should finish and return logs with winner', () => {
    const result = runBattle(sampleBattleConfig)

    expect(result.rounds).toBeGreaterThan(0)
    expect(result.winner.length).toBeGreaterThan(0)
    expect(result.logs[0]).toContain('战斗开始')
    expect(result.logs[result.logs.length - 1]).toContain('战斗结束')
  })
})
