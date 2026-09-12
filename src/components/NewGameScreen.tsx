import { useState } from 'react'
import { randomSeed, type GameMode } from '../game/index.ts'

export function NewGameScreen({
  onStart,
  onContinue,
  hasSave,
}: {
  onStart: (companyName: string, seed: number, mode: GameMode) => void
  onContinue: () => void
  hasSave: boolean
}) {
  const [name, setName] = useState('Northwind Energy')
  const [seedText, setSeedText] = useState('')
  const [mode, setMode] = useState<GameMode | null>(null)

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--color-ink)] p-6">
      <div className="w-full max-w-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-2xl">
        <div className="mb-1 font-mono text-xs tracking-[0.25em] text-[var(--color-cyan)]">
          GAS LEARNING GAME
        </div>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-[var(--color-amber)]">
          TAKEAWAY
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-[var(--color-muted)]">
          Run a natural gas producer. Connect wells to buyers, watch the binding constraint move,
          and learn why revenue, operating profit, and cash are not the same — and why a higher
          export price is not always a better <em>netback</em>.
        </p>

        {mode === null ? (
          <div className="space-y-3">
            <button
              type="button"
              className="w-full border-2 border-[var(--color-cyan)] bg-[var(--color-cyan)]/10 px-4 py-3 text-left hover:bg-[var(--color-cyan)]/20"
              onClick={() => setMode('learn')}
            >
              <div className="text-sm font-semibold text-[var(--color-cyan)]">
                LEARN <span className="text-[10px] font-normal uppercase">(recommended)</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Two guided chapters: first sale, then the takeaway bottleneck. One basin, clear
                objectives, hints.
              </p>
            </button>
            <button
              type="button"
              className="w-full border border-[var(--color-line)] px-4 py-3 text-left hover:border-[var(--color-amber)]"
              onClick={() => setMode('sandbox')}
            >
              <div className="text-sm font-semibold text-[var(--color-amber)]">SANDBOX</div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Full map ~2015–2035 simulated scenario. FID construction, LNG, cargo diversion.
              </p>
            </button>
            {hasSave && (
              <button
                type="button"
                className="w-full border border-[var(--color-line)] px-4 py-2.5 text-sm text-[var(--color-cyan)] hover:border-[var(--color-cyan)]"
                onClick={onContinue}
              >
                CONTINUE SAVE
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              className="mb-3 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)]"
              onClick={() => setMode(null)}
            >
              ← Back to mode select
            </button>
            <div className="mb-3 text-xs text-[var(--color-cyan)]">
              Mode: <strong className="uppercase">{mode}</strong>
            </div>

            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Company name
            </label>
            <input
              className="mb-4 w-full border border-[var(--color-line)] bg-[var(--color-ink)] px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
            />

            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Seed (blank = random) — reproducibility
            </label>
            <div className="mb-6 flex gap-2">
              <input
                className="num w-full border border-[var(--color-line)] bg-[var(--color-ink)] px-3 py-2 text-sm outline-none focus:border-[var(--color-cyan)]"
                value={seedText}
                onChange={(e) => setSeedText(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="e.g. 20151201"
              />
              <button
                type="button"
                className="shrink-0 border border-[var(--color-line)] px-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-cyan)] hover:text-[var(--color-text)]"
                onClick={() => setSeedText(String(randomSeed()))}
              >
                ROLL
              </button>
            </div>

            <button
              type="button"
              className="w-full bg-[var(--color-amber)] px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110"
              onClick={() => {
                const seed = seedText ? Number(seedText) >>> 0 || 1 : randomSeed()
                onStart(name.trim() || 'Northwind Energy', seed, mode)
              }}
            >
              {mode === 'learn' ? 'START LEARN — CHAPTER 1' : 'NEW SANDBOX — Q4 2015'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
