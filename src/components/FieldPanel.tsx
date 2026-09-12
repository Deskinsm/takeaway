import type { ReactNode } from 'react'
import { BASIN_DEFS, STARTER_LEASE_OPTIONS, type BasinId, type GameState } from '../game/index.ts'
import { basinWellPotential, getBasinCapacities } from '../game/index.ts'
import { Tip } from './Tooltip.tsx'
import { money, vol } from './format.ts'

export function FieldPanel({
  state,
  onAcquire,
  onDrill,
  onBuyTakeaway,
}: {
  state: GameState
  onAcquire: (id: BasinId) => void
  onDrill: (id: BasinId, count: number) => void
  onBuyTakeaway: (id: BasinId, capacity: number) => void
}) {
  const ids = Object.keys(BASIN_DEFS) as BasinId[]

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-[var(--color-muted)]">
        Field ops: acquire leases, drill/complete wells, buy{' '}
        <Tip label="Pipeline capacity out of basin. Without it, wells strand gas.">takeaway</Tip>.
        Starter options: {STARTER_LEASE_OPTIONS.map((id) => BASIN_DEFS[id].name).join(', ')}.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {ids.map((id) => {
          const def = BASIN_DEFS[id]
          const b = state.basins[id]
          const caps = getBasinCapacities(state, id)
          const potential = basinWellPotential(state, id)
          return (
            <article
              key={id}
              className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-amber)]">{def.name}</h3>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    {def.region}
                    {def.lngFeed ? ' · LNG feed' : ' · pipeline / HH'}
                  </div>
                </div>
                <span
                  className={`num text-[10px] ${b.owned ? 'text-[var(--color-ok)]' : 'text-[var(--color-muted)]'}`}
                >
                  {b.owned ? 'OWNED' : 'OPTION'}
                </span>
              </div>
              <p className="mb-3 text-xs text-[var(--color-muted)]">{def.blurb}</p>

              <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                <Metric label="Wells" value={String(b.wells)} />
                <Metric label="Potential" value={`${vol(potential)}/q`} />
                <Metric label="Takeaway" value={`${vol(b.takeaway)}/q`} />
                <Metric label="Well cap" value={vol(caps.wells)} />
                <Metric label="Pipe cap" value={vol(caps.takeaway)} />
                <Metric
                  label="FID"
                  value={`${b.fidProgress}%`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {!b.owned && (
                  <Btn onClick={() => onAcquire(id)}>
                    Acquire · {money(def.leaseCost)}
                  </Btn>
                )}
                {b.owned && (
                  <>
                    <Btn onClick={() => onDrill(id, 1)}>Drill 1 · {money(def.wellCost)}</Btn>
                    <Btn onClick={() => onDrill(id, 3)}>Drill 3 · {money(def.wellCost * 3)}</Btn>
                    <Btn onClick={() => onBuyTakeaway(id, 500_000)}>
                      +0.5M takeaway · {money(def.takeawayUnitCost * 500_000)}
                    </Btn>
                    <Btn onClick={() => onBuyTakeaway(id, 2_000_000)}>
                      +2M takeaway · {money(def.takeawayUnitCost * 2_000_000)}
                    </Btn>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase text-[var(--color-muted)]">{label}</div>
      <div className="num text-[var(--color-text)]">{value}</div>
    </div>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-[var(--color-line)] px-2 py-1 text-[11px] text-[var(--color-text)] hover:border-[var(--color-cyan)] hover:text-[var(--color-cyan)]"
    >
      {children}
    </button>
  )
}
