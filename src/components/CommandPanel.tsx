import { useState } from 'react'
import {
  GLOSSARY,
  previewQuarter,
  type GameState,
} from '../game/index.ts'
import { Tip } from './Tooltip.tsx'
import { money, vol } from './format.ts'

export function CommandPanel({
  state,
  onEndQuarter,
  error,
}: {
  state: GameState
  onEndQuarter: () => void
  error: string | null
}) {
  const r = state.lastResult
  const [showPreview, setShowPreview] = useState(true)
  const preview = previewQuarter(state)

  return (
    <div className="space-y-3 p-3">
      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          {state.companyName}
          {state.mode === 'learn' ? ' · LEARN' : ' · SANDBOX'}
        </h2>
        <p className="mb-2 text-sm text-[var(--color-muted)]">
          Seed <span className="num text-[var(--color-text)]">{state.seed}</span>
          {' · '}
          Turn <span className="num text-[var(--color-text)]">{state.turn}</span>
        </p>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          <Tip label={GLOSSARY.revenue}>Revenue</Tip>,{' '}
          <Tip label={GLOSSARY.operating_profit}>operating profit</Tip>, and{' '}
          <Tip label={GLOSSARY.cash}>cash</Tip> are different. Cumulative sold volume is{' '}
          <strong className="text-[var(--color-text)]">not reserves</strong>.{' '}
          <Tip label={GLOSSARY.mmbtu}>MMBtu</Tip> defined in glossary.
        </p>
        <p className="mb-3 text-[10px] text-[var(--color-muted)]">{state.priceModelLabel}</p>

        {showPreview && !state.gameOver && (
          <div className="mb-3 border border-[var(--color-line)] bg-[var(--color-ink)] p-2 text-xs">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-[var(--color-cyan)]">Quarter preview (known prices)</span>
              <button
                type="button"
                className="text-[10px] text-[var(--color-muted)]"
                onClick={() => setShowPreview(false)}
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
              <span>Expected sales</span>
              <span className="num md:col-span-2">{vol(preview.expectedSales)} MMBtu</span>
              <span>Unused well potential</span>
              <span className="num md:col-span-2">{vol(preview.unusedWellCapacity)}</span>
              <span>Unused takeaway</span>
              <span className="num md:col-span-2">{vol(preview.unusedTakeaway)}</span>
              <span>Revenue</span>
              <span className="num md:col-span-2">{money(preview.expectedRevenue)}</span>
              <span>Opex</span>
              <span className="num md:col-span-2">{money(preview.expectedOpex)}</span>
              <span>Operating profit</span>
              <span className="num md:col-span-2">{money(preview.expectedOperatingProfit)}</span>
              <span>Investment spend (this q)</span>
              <span className="num md:col-span-2">{money(preview.investmentSpend)}</span>
              <span>Closing cash (forecast)</span>
              <span className="num md:col-span-2">{money(preview.closingCash)}</span>
              <span>Binding</span>
              <span className="font-mono text-[var(--color-danger)] md:col-span-2">
                {preview.bindingConstraint}
              </span>
            </div>
            {preview.notes.slice(0, 3).map((n) => (
              <p key={n} className="mt-1 text-[var(--color-amber)]">
                • {n}
              </p>
            ))}
          </div>
        )}
        {!showPreview && (
          <button
            type="button"
            className="mb-2 text-[11px] text-[var(--color-cyan)]"
            onClick={() => setShowPreview(true)}
          >
            Show quarter preview
          </button>
        )}

        <button
          type="button"
          disabled={state.gameOver}
          onClick={onEndQuarter}
          className="w-full bg-[var(--color-cyan)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40 hover:brightness-110"
        >
          END QUARTER → RESOLVE
        </button>
        {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}
        {state.gameOver && (
          <p className="mt-2 text-xs text-[var(--color-amber)]">
            Horizon reached or insolvent. Scores final.
          </p>
        )}
      </section>

      {r && (
        <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            What happened — Q{r.quarter} {r.year}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <Stat label="Sold" value={`${vol(r.sold)} MMBtu`} />
            <Stat
              label="Left in ground"
              value={`${vol(r.unmarketed)} MMBtu`}
              warn={r.unmarketed > 0}
            />
            <Stat label="Revenue" value={money(r.revenue)} />
            <Stat
              label="Op. profit"
              value={money(r.operatingProfit)}
              warn={r.operatingProfit < 0}
            />
            <Stat label="Opex" value={money(r.opex)} />
            <Stat label="Capex (spent)" value={money(r.investmentSpend)} />
            <Stat label="Closing cash" value={money(r.closingCash)} />
            <Stat label="Potential" value={`${vol(r.potentialOutput)} MMBtu`} />
          </div>
          <div className="mt-3 space-y-1 text-xs text-[var(--color-muted)]">
            <p>
              <span className="text-[var(--color-text)]">Decision: </span>
              {r.feedback.decisionMatters}
            </p>
            <p>
              <span className="text-[var(--color-text)]">External: </span>
              {r.feedback.externalChange}
            </p>
            <p>
              <span className="text-[var(--color-text)]">Reconsider: </span>
              {r.feedback.reconsider}
            </p>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Bound by{' '}
            <span className="font-mono text-[var(--color-danger)]">{r.bindingConstraint}</span>
            {' · '}
            HH {r.prices.HH.toFixed(2)} · TTF {r.prices.TTF.toFixed(2)} · JKM{' '}
            {r.prices.JKM.toFixed(2)}
          </p>
          {r.notes.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-[var(--color-amber)]">
              {r.notes.slice(0, 6).map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {state.projects.length > 0 && (
        <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Construction (FID ≠ instant)
          </h3>
          <ul className="space-y-1 text-xs">
            {state.projects.map((p) => (
              <li key={p.id} className="text-[var(--color-text)]">
                {p.label}:{' '}
                <span className="num text-[var(--color-amber)]">
                  {p.quartersRemaining}/{p.totalQuarters} q left
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Ops log
        </h3>
        <div className="max-h-64 space-y-1 overflow-y-auto font-mono text-[11px] text-[var(--color-muted)]">
          {[...state.log].reverse().map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`} className="leading-snug">
              {line}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] uppercase text-[var(--color-muted)]">{label}</div>
      <div className={`num ${warn ? 'text-[var(--color-danger)]' : ''}`}>{value}</div>
    </div>
  )
}
