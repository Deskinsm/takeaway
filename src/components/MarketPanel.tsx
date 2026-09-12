import type { ReactNode } from 'react'
import {
  BASIN_DEFS,
  GLOSSARY,
  netback,
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
  const learnLocked = state.mode === 'learn'
  const lngBasins = (Object.keys(state.basins) as BasinId[]).filter((id) => {
    const b = state.basins[id]
    return b.owned && b.fidProgress >= 100 && b.liquefaction > 0
  })

  const nbHH = netback(state.prices.HH, 'HH')
  const nbTTF = netback(state.prices.TTF, 'TTF')
  const nbJKM = netback(state.prices.JKM, 'JKM')

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-[var(--color-muted)]">
        Domestic pipeline volumes auto-sell to{' '}
        <Tip label={GLOSSARY.HH}>Henry Hub (US buyers)</Tip> after takeaway. LNG:{' '}
        <Tip label={GLOSSARY.cargo}>schedule a shipment (nominate cargo)</Tip> to{' '}
        <Tip label={GLOSSARY.TTF}>Northwest Europe</Tip> or{' '}
        <Tip label={GLOSSARY.JKM}>Northeast Asia</Tip>.{' '}
        <Tip label={GLOSSARY.netback}>Netback</Tip> = price − costs to reach that market — export
        headlines are not always better.
      </p>

      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          Hub strip · simulated scenario
        </h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <HubCard
            name="US (HH)"
            value={state.prices.HH}
            nb={nbHH}
            tip={GLOSSARY.HH}
          />
          <HubCard
            name="Europe (TTF)"
            value={state.prices.TTF}
            nb={nbTTF}
            tip={GLOSSARY.TTF}
            dim={learnLocked}
          />
          <HubCard
            name="Asia (JKM)"
            value={state.prices.JKM}
            nb={nbJKM}
            tip={GLOSSARY.JKM}
            dim={learnLocked}
          />
        </div>
        <p className="mt-2 text-[10px] text-[var(--color-muted)]">
          JKM path includes a longer-haul cost premium vs TTF so netbacks can diverge even when
          JKM&apos;s headline price looks higher. {state.priceModelLabel}
        </p>
      </section>

      {learnLocked && (
        <div className="border border-dashed border-[var(--color-line)] p-3 text-xs text-[var(--color-muted)]">
          Export / LNG nominations locked until later chapters. Focus on connecting Permian wells to
          US buyers via pipeline takeaway.
        </div>
      )}

      <section
        className={`border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3 ${learnLocked ? 'opacity-50' : ''}`}
      >
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
                {vol(c.volume)} → {c.hub === 'TTF' ? 'Europe (TTF)' : 'Asia (JKM)'} from{' '}
                {BASIN_DEFS[c.basinId].name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={`border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3 ${learnLocked ? 'opacity-50' : ''}`}
      >
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          Nominate cargo
        </h3>
        {learnLocked ? (
          <p className="text-xs text-[var(--color-muted)]">Locked in Learn chapters 1–2.</p>
        ) : lngBasins.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">
            Complete FID construction + online liquefaction (and shipping) in Midstream first.
          </p>
        ) : (
          <div className="space-y-3">
            {lngBasins.map((id) => (
              <div key={id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="min-w-40 text-[var(--color-amber)]">{BASIN_DEFS[id].name}</span>
                <Btn onClick={() => onSchedule(id, 'TTF', 500_000)}>0.5M → Europe</Btn>
                <Btn onClick={() => onSchedule(id, 'JKM', 500_000)}>0.5M → Asia</Btn>
                <Btn onClick={() => onSchedule(id, 'TTF', 1_000_000)}>1M → Europe</Btn>
                <Btn onClick={() => onSchedule(id, 'JKM', 1_000_000)}>1M → Asia</Btn>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function HubCard({
  name,
  value,
  nb,
  tip,
  dim,
}: {
  name: string
  value: number
  nb: number
  tip: string
  dim?: boolean
}) {
  return (
    <div className={dim ? 'opacity-50' : ''}>
      <div className="text-[10px] uppercase text-[var(--color-muted)]">
        <Tip label={tip}>{name}</Tip>
      </div>
      <div className="num text-lg text-[var(--color-text)]">{price(value)}</div>
      <div className="text-[10px] text-[var(--color-muted)]">$/MMBtu price</div>
      <div className="num text-xs text-[var(--color-cyan)]">netback {price(nb)}</div>
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
