import type { GameState } from '../game/index.ts'
import { GLOSSARY } from '../game/index.ts'
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
  return (
    <div className="space-y-3 p-3">
      <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-cyan)]">
          {state.companyName}
        </h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Seed <span className="num text-[var(--color-text)]">{state.seed}</span>
          {' · '}
          Turn <span className="num text-[var(--color-text)]">{state.turn}</span>
          {' · '}
          Dual mandate:{' '}
          <Tip label="Grow cumulative sold volume / reserves proxy.">volumes</Tip>
          {' vs '}
          <Tip label={GLOSSARY.mmbtu}>realized $/mmbtu margin</Tip>.
        </p>
        <button
          type="button"
          disabled={state.gameOver}
          onClick={onEndQuarter}
          className="w-full bg-[var(--color-cyan)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40 hover:brightness-110"
        >
          END QUARTER → RESOLVE
        </button>
        {error && (
          <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>
        )}
        {state.gameOver && (
          <p className="mt-2 text-xs text-[var(--color-amber)]">
            Horizon reached or insolvent. Scores final.
          </p>
        )}
      </section>

      {r && (
        <section className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Last resolution — Q{r.quarter} {r.year}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <Stat label="Sold" value={`${vol(r.sold)} mmbtu`} />
            <Stat label="Stranded" value={`${vol(r.stranded)} mmbtu`} warn={r.stranded > 0} />
            <Stat label="Revenue" value={money(r.revenue)} />
            <Stat label="Net" value={money(r.netCash)} warn={r.netCash < 0} />
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Bound by{' '}
            <span className="font-mono text-[var(--color-danger)]">{r.bindingConstraint}</span>
            {' · '}
            <Tip label={GLOSSARY.basis}>basis / hub</Tip> HH {r.prices.HH.toFixed(2)} · TTF{' '}
            {r.prices.TTF.toFixed(2)} · JKM {r.prices.JKM.toFixed(2)}
          </p>
          {r.notes.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-[var(--color-amber)]">
              {r.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          )}
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
