import { useState } from 'react'
import { randomSeed } from '../game/index.ts'

export function NewGameScreen({
  onStart,
  onContinue,
  hasSave,
}: {
  onStart: (companyName: string, seed: number) => void
  onContinue: () => void
  hasSave: boolean
}) {
  const [name, setName] = useState('Northwind Energy')
  const [seedText, setSeedText] = useState('')

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--color-ink)] p-6">
      <div className="w-full max-w-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-2xl">
        <div className="mb-1 font-mono text-xs tracking-[0.25em] text-[var(--color-cyan)]">
          E&P / LNG SIM
        </div>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-[var(--color-amber)]">
          TAKEAWAY
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-[var(--color-muted)]">
          Run a gas & LNG explorer-producer from ~2015–2035. Dual wins conflict:{' '}
          <span className="text-[var(--color-text)]">volumes</span> vs{' '}
          <span className="text-[var(--color-text)]">realized margin</span>. Binding
          constraints migrate: wells → takeaway → liquefaction → shipping → hub price.
        </p>

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
          Seed (blank = random)
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

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="bg-[var(--color-amber)] px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110"
            onClick={() => {
              const seed = seedText ? Number(seedText) >>> 0 || 1 : randomSeed()
              onStart(name.trim() || 'Northwind Energy', seed)
            }}
          >
            NEW GAME — Q4 2015
          </button>
          {hasSave && (
            <button
              type="button"
              className="border border-[var(--color-line)] px-4 py-2.5 text-sm text-[var(--color-cyan)] hover:border-[var(--color-cyan)]"
              onClick={onContinue}
            >
              CONTINUE SAVE
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
