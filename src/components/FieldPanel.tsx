import { useState, type ReactNode } from 'react'
import {
  BASIN_DEFS,
  previewAction,
  visibleBasins,
  wellOutputLabel,
  type BasinId,
  type GameState,
} from '../game/index.ts'
import { basinWellPotential, getBasinCapacities } from '../game/index.ts'
import { Tip } from './Tooltip.tsx'
import { PurchasePreviewCard } from './PurchasePreviewCard.tsx'
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
  const ids = visibleBasins(state)
  const [hover, setHover] = useState<{ basinId: BasinId; kind: string } | null>(null)

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-[var(--color-muted)]">
        Field ops (upstream): acquire leases, drill wells, buy{' '}
        <Tip label="Increase pipeline capacity — takeaway. Without it, gas is left in the ground.">
          pipeline capacity (takeaway)
        </Tip>
        . Well output is a fixed simplification until decline exists.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {ids.map((id) => {
          const def = BASIN_DEFS[id]
          const b = state.basins[id]
          const caps = getBasinCapacities(state, id)
          const potential = basinWellPotential(state, id)
          const takePreview = previewAction(state, {
            type: 'BUY_TAKEAWAY',
            basinId: id,
            capacity: 500_000,
          })
          const drillPreview = previewAction(state, {
            type: 'DRILL_WELLS',
            basinId: id,
            count: 1,
          })
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
                    {def.lngFeed ? ' · LNG feed' : ' · pipeline → US buyers (Henry Hub)'}
                  </div>
                </div>
                <span
                  className={`num text-[10px] ${b.owned ? 'text-[var(--color-ok)]' : 'text-[var(--color-muted)]'}`}
                >
                  {b.owned ? 'OWNED' : 'OPTION'}
                </span>
              </div>
              <p className="mb-2 text-xs text-[var(--color-muted)]">{def.blurb}</p>
              {b.owned && b.wells > 0 && (
                <p className="mb-2 text-[10px] text-[var(--color-cyan)]">
                  Per well: {wellOutputLabel(id)}
                </p>
              )}

              <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                <Metric label="Wells" value={String(b.wells)} />
                <Metric label="Potential" value={`${vol(potential)}/q`} />
                <Metric label="Takeaway" value={`${vol(b.takeaway)}/q`} />
                <Metric label="Well cap" value={vol(caps.wells)} />
                <Metric label="Pipe cap" value={vol(caps.takeaway)} />
                <Metric
                  label="Utilized"
                  value={
                    caps.takeaway > 0
                      ? `${Math.min(100, Math.round((Math.min(caps.wells, caps.takeaway) / caps.takeaway) * 100))}%`
                      : '—'
                  }
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
                    <Btn
                      onClick={() => onDrill(id, 1)}
                      onMouseEnter={() => setHover({ basinId: id, kind: 'drill1' })}
                      onMouseLeave={() => setHover(null)}
                    >
                      Drill 1 · {money(def.wellCost)}
                    </Btn>
                    {state.mode === 'sandbox' && (
                      <Btn onClick={() => onDrill(id, 3)}>
                        Drill 3 · {money(def.wellCost * 3)}
                      </Btn>
                    )}
                    <Btn
                      onClick={() => onBuyTakeaway(id, 500_000)}
                      onMouseEnter={() => setHover({ basinId: id, kind: 'pipe05' })}
                      onMouseLeave={() => setHover(null)}
                    >
                      +0.5M pipeline capacity · {money(def.takeawayUnitCost * 500_000)}
                    </Btn>
                    <Btn
                      onClick={() => onBuyTakeaway(id, 1_200_000)}
                      onMouseEnter={() => setHover({ basinId: id, kind: 'pipe12' })}
                      onMouseLeave={() => setHover(null)}
                    >
                      +1.2M pipeline capacity · {money(def.takeawayUnitCost * 1_200_000)}
                    </Btn>
                  </>
                )}
              </div>

              {hover?.basinId === id && hover.kind.startsWith('drill') && drillPreview && (
                <PurchasePreviewCard preview={drillPreview} />
              )}
              {hover?.basinId === id && hover.kind.startsWith('pipe') && takePreview && (
                <PurchasePreviewCard
                  preview={
                    hover.kind === 'pipe12'
                      ? previewAction(state, {
                          type: 'BUY_TAKEAWAY',
                          basinId: id,
                          capacity: 1_200_000,
                        })!
                      : takePreview
                  }
                />
              )}
              {b.owned && !hover && takePreview && state.mode === 'learn' && (
                <PurchasePreviewCard preview={takePreview} />
              )}
            </article>
          )
        })}
      </div>

      {state.mode === 'learn' && (
        <p className="text-[11px] text-[var(--color-muted)]">
          Other basins are locked in Learn chapters 1–2. Sandbox unlocks the full map and LNG later.
        </p>
      )}
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

function Btn({
  onClick,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  onClick: () => void
  children: ReactNode
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="border border-[var(--color-line)] px-2 py-1 text-[11px] text-[var(--color-text)] hover:border-[var(--color-cyan)] hover:text-[var(--color-cyan)]"
    >
      {children}
    </button>
  )
}
