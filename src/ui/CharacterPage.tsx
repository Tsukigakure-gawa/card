import type { CardConfig, UnitConfig } from '../engine/types'

type CharacterPageProps = {
  characters: UnitConfig[]
  allCards: CardConfig[]
  onUpdateCharacter: (next: UnitConfig) => void
}

const cardOptions = (cards: CardConfig[], ids: string[]) => cards.filter((c) => ids.includes(c.id))

export const CharacterPage = ({ characters, allCards, onUpdateCharacter }: CharacterPageProps) => {
  return (
    <section>
      <h2>角色页面</h2>
      <div className="character-scroll">
        {characters.map((hero) => {
          const selectableCommon = cardOptions(allCards, hero.selectableCommonCards)
          const selectableClass = cardOptions(allCards, hero.selectableClassCards)

          return (
            <article key={hero.id} className="character-card">
              <h3>
                {hero.name} ({hero.profession})
              </h3>
              <p>tags: {hero.tags.join(', ')}</p>
              <p>
                属性: HP {hero.maxHp} / ATK {hero.attack} / SPD {hero.speed} / 站位 {hero.position}
              </p>
              <p>专属技能: {hero.signatureSkill}</p>
              <p>{hero.backstory}</p>

              <label>
                通用槽1：
                <select
                  value={hero.loadout.commonCards[0] ?? ''}
                  onChange={(e) =>
                    onUpdateCharacter({
                      ...hero,
                      loadout: { ...hero.loadout, commonCards: [e.target.value, hero.loadout.commonCards[1]].filter(Boolean) },
                    })
                  }
                >
                  <option value="">--</option>
                  {selectableCommon.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                职业槽1：
                <select
                  value={hero.loadout.classCards[0] ?? ''}
                  onChange={(e) =>
                    onUpdateCharacter({
                      ...hero,
                      loadout: { ...hero.loadout, classCards: [e.target.value].filter(Boolean) },
                    })
                  }
                >
                  <option value="">--</option>
                  {selectableClass.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <p>当前携带: common[{hero.loadout.commonCards.join(', ')}] class[{hero.loadout.classCards.join(', ')}]</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
