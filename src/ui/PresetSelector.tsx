import type { BattlePreset } from '../data/presets'

type PresetSelectorProps = {
  presets: BattlePreset[]
  selectedId: string
  onChange: (id: string) => void
  disabled?: boolean
}

export const PresetSelector = ({ presets, selectedId, onChange, disabled }: PresetSelectorProps) => {
  const selected = presets.find((preset) => preset.id === selectedId)

  return (
    <section>
      <h2>预设对战配置</h2>
      <select value={selectedId} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      <p>{selected?.description}</p>
    </section>
  )
}
