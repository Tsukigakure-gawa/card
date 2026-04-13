import type { CardConfig, UnitConfig } from '../engine/types'

type CharacterPageProps = {
  characters: UnitConfig[]
  allCards: CardConfig[]
  onUpdateCharacter: (next: UnitConfig) => void
}

const EMPTY_SLOT = ''
const SLOT_COUNT = 4

const normalizeSlots = (slots: string[]) => Array.from({ length: SLOT_COUNT }, (_, i) => slots[i] ?? EMPTY_SLOT)

export const CharacterPage = ({ characters, allCards, onUpdateCharacter }: CharacterPageProps) => {
  return (
    <section className="panel">
      <h2>角色页面</h2>
      <div className="character-scroll">
        {characters.map((hero) => {
          const commonSlots = normalizeSlots(hero.loadout.commonCards)
          const classSlots = normalizeSlots(hero.loadout.classCards)
          const selectableCommon = allCards.filter((card) => hero.selectableCommonCards.includes(card.id))
          const selectableClass = allCards.filter((card) => hero.selectableClassCards.includes(card.id))

          const updateCommonSlot = (index: number, value: string) => {
            const next = [...commonSlots]
            next[index] = value
            onUpdateCharacter({ ...hero, loadout: { ...hero.loadout, commonCards: next.filter(Boolean) } })
          }

          const updateClassSlot = (index: number, value: string) => {
            const next = [...classSlots]
            next[index] = value
            onUpdateCharacter({ ...hero, loadout: { ...hero.loadout, classCards: next.filter(Boolean) } })
          }

          return (
            <article key={hero.id} className="character-card">
              <header>
                <h3>
                  {hero.name} <span>({hero.profession})</span>
                </h3>
                <p>
                  站位 {hero.position} | HP {hero.maxHp} | ATK {hero.attack} | SPD {hero.speed}
                </p>
              </header>

              <div className="story-card">
                <strong>角色背景</strong>
                <p>{hero.backstory}</p>
                <p>Tags: {hero.tags.join(', ')}</p>
              </div>

              <div className="slot-block">
                <h4>专属技能槽（只读）</h4>
                <div className="slot fixed">{hero.loadout.signatureSkill}</div>
              </div>

              <div className="slot-block">
                <h4>通用技能槽（4）</h4>
                <div className="slot-grid">
                  {commonSlots.map((slot, index) => (
                    <div className="slot" key={`common-${hero.id}-${index}`}>
                      <span>槽位 {index + 1}</span>
                      <select value={slot} onChange={(e) => updateCommonSlot(index, e.target.value)}>
                        <option value="">空槽</option>
                        {selectableCommon.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => updateCommonSlot(index, EMPTY_SLOT)}>
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="slot-block">
                <h4>职业技能槽（4）</h4>
                <div className="slot-grid">
                  {classSlots.map((slot, index) => (
                    <div className="slot" key={`class-${hero.id}-${index}`}>
                      <span>槽位 {index + 1}</span>
                      <select value={slot} onChange={(e) => updateClassSlot(index, e.target.value)}>
                        <option value="">空槽</option>
                        {selectableClass.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => updateClassSlot(index, EMPTY_SLOT)}>
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
