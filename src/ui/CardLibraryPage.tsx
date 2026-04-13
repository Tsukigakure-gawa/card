import type { CardConfig, Profession } from '../engine/types'

type CardLibraryPageProps = {
  cards: CardConfig[]
  professionFilter: Profession | 'all'
  onProfessionFilterChange: (value: Profession | 'all') => void
}

export const CardLibraryPage = ({ cards, professionFilter, onProfessionFilterChange }: CardLibraryPageProps) => {
  const pools: Array<CardConfig['cardPool']> = ['common', 'class', 'signature']
  const visible = cards.filter((card) => {
    if (professionFilter === 'all') return true
    return !card.classRestriction || card.classRestriction.includes(professionFilter)
  })

  return (
    <section>
      <h2>牌库页面</h2>
      <label>
        职业过滤：
        <select value={professionFilter} onChange={(e) => onProfessionFilterChange(e.target.value as Profession | 'all')}>
          <option value="all">all</option>
          <option value="warrior">warrior</option>
          <option value="tank">tank</option>
          <option value="mage">mage</option>
          <option value="priest">priest</option>
          <option value="hunter">hunter</option>
          <option value="assassin">assassin</option>
        </select>
      </label>
      {pools.map((pool) => (
        <div key={pool}>
          <h3>{pool}</h3>
          <ul>
            {visible
              .filter((card) => card.cardPool === pool)
              .map((card) => (
                <li key={card.id}>
                  <strong>{card.name}</strong> [{card.costType}:{card.cost}] / {card.range} / {card.description}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
