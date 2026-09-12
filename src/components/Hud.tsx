import type { ReactNode } from 'react'
import { GLOSSARY } from '../game/index.ts'
import type { GameState } from '../game/index.ts'
import { Tip } from './Tooltip.tsx'
import { money, price } from './format.ts'

const CONSTRAINT_LABEL: Record<string, string> = {
  wells: 'WELLS',
  takeaway: 'TAKEAWAY',
  liquefaction: 'LIQUEFACTION',
  shipping: 'SHIPPING',
  hub_price: 'HUB PRICE',
  none: '—',
}

export function Hud({ state }: { state: GameState }) {
  return (
    <header className="grid grid-cols-2 gap-2 border-b border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 md:grid-cols-7">
      <HudCell label="PERIOD">
        <span className="num text-[var(--color-amber)]">
          Q{state.quarter} {state.year}
        </span>
      </HudCell>
      <HudCell label="CASH">
        <span className={`num ${state.cash < 0 ? 'text-[var(--color-danger)]' : ''}`}>
          {money(state.cash)}
        </span>
      </HudCell>
      <HudCell
        label={
          <Tip label="Cumulative sold volume index (mmbtu-based). Chase this and you may ignore margin.">
            VOLUME Δ
          </Tip>
        }
      >
        <span className="num text-[var(--color-cyan)]">{state.volumeScore.toFixed(1)}</span>
      </HudCell>
      <HudCell
        label={
          <Tip label="Realized average net $/mmbtu after costs. Price crashes and stranded gas pull this down.">
            MARGIN $/mmbtu
          </Tip>
        }
      >
        <span className="num text-[var(--color-amber)]">{state.marginScore.toFixed(2)}</span>
      </HudCell>
      <HudCell
        label={
          <Tip label={GLOSSARY.takeaway}>
            BINDING
          </Tip>
        }
      >
        <span className="num tracking-wide text-[var(--color-danger)]">
          {CONSTRAINT_LABEL[state.bindingConstraint] ?? state.bindingConstraint}
        </span>
      </HudCell>
      <HudCell label={<Tip label={GLOSSARY.HH}>HH</Tip>}>
        <span className="num">{price(state.prices.HH)}</span>
      </HudCell>
      <HudCell
        label={
          <>
            <Tip label={GLOSSARY.TTF}>TTF</Tip>
            {' / '}
            <Tip label={GLOSSARY.JKM}>JKM</Tip>
          </>
        }
      >
        <span className="num">
          {price(state.prices.TTF)} / {price(state.prices.JKM)}
        </span>
      </HudCell>
    </header>
  )
}

function HudCell({
  label,
  children,
}: {
  label: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className="truncate text-sm font-semibold">{children}</div>
    </div>
  )
}
