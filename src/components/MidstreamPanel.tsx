import { useState, type ReactNode } from 'react'
import {
  BASIN_DEFS,
  GLOSSARY,
  previewAction,
  type BasinId,
  type GameState,
} from '../game/index.ts'
import { Tip } from './Tooltip.tsx'
import { PurchasePreviewCard } from './PurchasePreviewCard.tsx'
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
  const learnLocked = state.mode === 'learn'
  const [fidPreviewId, setFidPreviewId] = useState<BasinId | null>(null)

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-[var(--color-muted)]">
        Midstream unlocks the LNG chain:{' '}
        <Tip label={GLOSSARY.FID}>approve the investment (FID)</Tip> starts multi-quarter
        construction → then{' '}
        <Tip label={GLOSSARY.liquefaction}>reserve space at an LNG plant</Tip> →{' '}
        <Tip label={GLOSSARY.cargo}>shipping</Tip>. Domestic basins sell to Henry Hub without LNG.
      </p>

      {learnLocked && (
        <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-ink)] p-3 text-xs text-[var(--color-muted)]">
          <strong className="text-[var(--color-amber)]">LNG branch locked in Learn 1–2.</strong>{' '}
          {GLOSSARY.LNG} Finish domestic pipeline chapters first; Sandbox unlocks FID construction
          and exports. Remember: <Tip label={GLOSSARY.netback}>netback</Tip> = price minus costs to
          reach the market — a higher hub price is not always better.
        </div>
      )}

      <section
        className={`border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3 ${learnLocked ? 'opacity-50' : ''}`}
      >
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          Global shipping
        </h3>
        <p className="mb-2 text-sm">
          Capacity:{' '}
          <span className="num text-[var(--color-amber)]">
            {vol(state.shippingCapacity)} MMBtu/q
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn disabled={learnLocked} onClick={() => onShipping(1_000_000)}>
            +1M shipping
          </Btn>
          <Btn disabled={learnLocked} onClick={() => onShipping(3_000_000)}>
            +3M shipping
          </Btn>
        </div>
        {!learnLocked && (
          <PurchasePreviewCard
            preview={
              previewAction(state, { type: 'BUY_SHIPPING', capacity: 1_000_000 })!
            }
          />
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {owned.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">Acquire a lease in Field first.</p>
        )}
        {owned.map((id) => {
          const def = BASIN_DEFS[id]
          const b = state.basins[id]
          const fidPrev = previewAction(state, { type: 'PROGRESS_FID', basinId: id })
          const fidProject = state.projects.find((p) => p.basinId === id && p.kind === 'fid')
          const liqProjects = state.projects.filter(
            (p) => p.basinId === id && p.kind === 'liquefaction',
          )
          return (
            <article
              key={id}
              className={`border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3 ${learnLocked ? 'opacity-50' : ''}`}
            >
              <h3 className="text-sm font-semibold text-[var(--color-amber)]">{def.name}</h3>
              <div className="mb-3 mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[9px] uppercase text-[var(--color-muted)]">FID</div>
                  <div className="num">
                    {b.fidProgress >= 100
                      ? 'Complete'
                      : b.fidApproved
                        ? `Building (${fidProject?.quartersRemaining ?? '?'}q)`
                        : 'Not approved'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-[var(--color-muted)]">Liquefaction</div>
                  <div className="num">{vol(b.liquefaction)}/q online</div>
                </div>
              </div>
              {liqProjects.map((p) => (
                <p key={p.id} className="mb-1 text-[10px] text-[var(--color-amber)]">
                  {p.label}: {p.quartersRemaining}q left
                </p>
              ))}
              <div className="flex flex-wrap gap-2">
                {b.fidProgress < 100 ? (
                  <Btn
                    disabled={learnLocked}
                    onClick={() => onFid(id)}
                    onMouseEnter={() => setFidPreviewId(id)}
                    onMouseLeave={() => setFidPreviewId(null)}
                  >
                    Approve investment (FID) · {money(Math.round(def.liquefactionUnitCost * 500_000))}
                  </Btn>
                ) : (
                  <>
                    <Btn
                      disabled={learnLocked}
                      onClick={() => onLiquefaction(id, 500_000)}
                    >
                      Reserve 0.5M plant space ·{' '}
                      {money(def.liquefactionUnitCost * 500_000)}
                    </Btn>
                    <Btn
                      disabled={learnLocked}
                      onClick={() => onLiquefaction(id, 2_000_000)}
                    >
                      Reserve 2M plant space ·{' '}
                      {money(def.liquefactionUnitCost * 2_000_000)}
                    </Btn>
                  </>
                )}
              </div>
              {fidPreviewId === id && fidPrev && <PurchasePreviewCard preview={fidPrev} />}
              {!learnLocked && b.fidProgress >= 100 && (
                <PurchasePreviewCard
                  preview={
                    previewAction(state, {
                      type: 'BOOK_LIQUEFACTION',
                      basinId: id,
                      capacity: 500_000,
                    })!
                  }
                />
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Btn({
  onClick,
  children,
  disabled,
  onMouseEnter,
  onMouseLeave,
}: {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="border border-[var(--color-line)] px-2 py-1 text-[11px] hover:border-[var(--color-cyan)] hover:text-[var(--color-cyan)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
