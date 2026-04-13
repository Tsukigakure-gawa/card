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
    <section className="panel">
      <h2>牌库页面</h2>
      <div className="filter-row">
        <label>职业过滤</label>
        <select value={professionFilter} onChange={(e) => onProfessionFilterChange(e.target.value as Profession | 'all')}>
          <option value="all">all</option>
          <option value="warrior">warrior</option>
          <option value="tank">tank</option>
          <option value="mage">mage</option>
          <option value="priest">priest</option>
          <option value="hunter">hunter</option>
          <option value="assassin">assassin</option>
        </select>
      </div>

      {pools.map((pool) => (
        <div key={pool} className="pool-section">
          <h3>{pool.toUpperCase()}</h3>
          <div className="card-grid">
            {visible
              .filter((card) => card.cardPool === pool)
              .map((card) => (
                <article key={card.id} className="card-item">
                  <header>
                    <strong>{card.name}</strong>
                    <span>
                      {card.costType}:{card.cost}
                    </span>
                  </header>
                  <p>restriction: {card.classRestriction?.join(', ') ?? 'none'}</p>
                  <p>target/range: {card.effects[0]?.targetType ?? '-'} / {card.range}</p>
                  <p>{card.description}</p>
                </article>
              ))}
          </div>
        </div>
      ))}
    </section>
  )
}
