import type { ReactNode } from 'react'
import {
  BASIN_DEFS,
  GLOSSARY,
  type BasinId,
  type GameState,
  type HubId,
} from '../game/index.ts'
import { Tip } from './Tooltip.tsx'
import { price, vol } from './format.ts'

export function MarketPanel({
  state,
  onSchedule,
  onClear,
}: {
  state: GameState
  onSchedule: (basinId: BasinId, hub: HubId, volume: number) => void
  onClear: () => void
}) {
  const lngBasins = (Object.keys(state.basins) as BasinId[]).filter((id) => {
    const b = state.basins[id]
    return b.owned && b.fidProgress >= 100 && b.liquefaction > 0
  })

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-[var(--color-muted)]">
        Schedule LNG{' '}
        <Tip label={GLOSSARY.cargo}>cargoes</Tip> to{' '}
        <Tip label={GLOSSARY.TTF}>TTF</Tip> or <Tip label={GLOSSARY.JKM}>JKM</Tip>. Diversion is the
        lesson: winter spikes and basis flips reward flexible shipping. Domestic volumes auto-sell
        to <Tip label={GLOSSARY.HH}>Henry Hub</Tip> after takeaway.
      </p>

      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          Hub strip
        </h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <HubCard name="HH" value={state.prices.HH} tip={GLOSSARY.HH} />
          <HubCard name="TTF" value={state.prices.TTF} tip={GLOSSARY.JKM} />
          <HubCard name="JKM" value={state.prices.JKM} tip={GLOSSARY.JKM} />
        </div>
      </section>

      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
            Cargo schedule (this quarter)
          </h3>
          {state.cargoes.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-[var(--color-danger)] hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        {state.cargoes.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">No cargoes nominated.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {state.cargoes.map((c) => (
              <li key={c.id}>
                {vol(c.volume)} → {c.hub} from {BASIN_DEFS[c.basinId].name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          Nominate cargo
        </h3>
        {lngBasins.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">
            Complete FID + book liquefaction (and shipping) in Midstream first.
          </p>
        ) : (
          <div className="space-y-3">
            {lngBasins.map((id) => (
              <div key={id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="min-w-40 text-[var(--color-amber)]">{BASIN_DEFS[id].name}</span>
                <Btn onClick={() => onSchedule(id, 'TTF', 500_000)}>0.5M → TTF</Btn>
                <Btn onClick={() => onSchedule(id, 'JKM', 500_000)}>0.5M → JKM</Btn>
                <Btn onClick={() => onSchedule(id, 'TTF', 1_000_000)}>1M → TTF</Btn>
                <Btn onClick={() => onSchedule(id, 'JKM', 1_000_000)}>1M → JKM</Btn>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function HubCard({ name, value, tip }: { name: string; value: number; tip: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-[var(--color-muted)]">
        <Tip label={tip}>{name}</Tip>
      </div>
      <div className="num text-lg text-[var(--color-text)]">{price(value)}</div>
      <div className="text-[10px] text-[var(--color-muted)]">$/mmbtu</div>
    </div>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-[var(--color-line)] px-2 py-1 hover:border-[var(--color-cyan)] hover:text-[var(--color-cyan)]"
    >
      {children}
    </button>
  )
}
