import type { ReactNode } from 'react'
import {
  BASIN_DEFS,
  GLOSSARY,
  type BasinId,
  type GameState,
} from '../game/index.ts'
import { Tip } from './Tooltip.tsx'
import { money, vol } from './format.ts'

export function MidstreamPanel({
  state,
  onFid,
  onLiquefaction,
  onShipping,
}: {
  state: GameState
  onFid: (id: BasinId) => void
  onLiquefaction: (id: BasinId, capacity: number) => void
  onShipping: (capacity: number) => void
}) {
  const owned = (Object.keys(state.basins) as BasinId[]).filter((id) => state.basins[id].owned)

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-[var(--color-muted)]">
        Midstream unlocks the LNG chain:{' '}
        <Tip label={GLOSSARY.FID}>FID</Tip> → liquefaction slots →{' '}
        <Tip label={GLOSSARY.cargo}>shipping</Tip>. Domestic basins can sell to HH without LNG,
        but export needs the full stack.
      </p>

      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          Global shipping
        </h3>
        <p className="mb-2 text-sm">
          Capacity:{' '}
          <span className="num text-[var(--color-amber)]">{vol(state.shippingCapacity)} mmbtu/q</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => onShipping(1_000_000)}>+1M shipping</Btn>
          <Btn onClick={() => onShipping(3_000_000)}>+3M shipping</Btn>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {owned.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">Acquire a lease in Field first.</p>
        )}
        {owned.map((id) => {
          const def = BASIN_DEFS[id]
          const b = state.basins[id]
          const fidCost = Math.round(def.liquefactionUnitCost * 500_000)
          return (
            <article
              key={id}
              className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3"
            >
              <h3 className="text-sm font-semibold text-[var(--color-amber)]">{def.name}</h3>
              <div className="mb-3 mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[9px] uppercase text-[var(--color-muted)]">FID</div>
                  <div className="num">{b.fidProgress}%</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-[var(--color-muted)]">Liquefaction</div>
                  <div className="num">{vol(b.liquefaction)}/q</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {b.fidProgress < 100 ? (
                  <Btn onClick={() => onFid(id)}>
                    Progress FID +{def.fidProgressPerAction}% · {money(fidCost)}
                  </Btn>
                ) : (
                  <>
                    <Btn onClick={() => onLiquefaction(id, 500_000)}>
                      +0.5M liq · {money(def.liquefactionUnitCost * 500_000)}
                    </Btn>
                    <Btn onClick={() => onLiquefaction(id, 2_000_000)}>
                      +2M liq · {money(def.liquefactionUnitCost * 2_000_000)}
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

function Btn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-[var(--color-line)] px-2 py-1 text-[11px] hover:border-[var(--color-cyan)] hover:text-[var(--color-cyan)]"
    >
      {children}
    </button>
  )
}
