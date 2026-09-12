import { useCallback, useEffect, useState } from 'react'
import {
  applyAction,
  clearSave,
  createGame,
  loadGame,
  saveGame,
  type Action,
  type BasinId,
  type GameState,
  type HubId,
  type TabId,
} from '../game/index.ts'
import { CommandPanel } from './CommandPanel.tsx'
import { FieldPanel } from './FieldPanel.tsx'
import { Hud } from './Hud.tsx'
import { MarketPanel } from './MarketPanel.tsx'
import { MidstreamPanel } from './MidstreamPanel.tsx'
import { NewGameScreen } from './NewGameScreen.tsx'

const TABS: { id: TabId; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'field', label: 'Field' },
  { id: 'midstream', label: 'Midstream' },
  { id: 'market', label: 'Market' },
]

export function GameApp() {
  const [state, setState] = useState<GameState | null>(null)
  const [tab, setTab] = useState<TabId>('command')
  const [error, setError] = useState<string | null>(null)
  const [hasSave, setHasSave] = useState(false)

  useEffect(() => {
    setHasSave(loadGame() !== null)
  }, [])

  useEffect(() => {
    if (state) saveGame(state)
  }, [state])

  const dispatch = useCallback((action: Action) => {
    setState((prev) => {
      if (!prev) return prev
      const result = applyAction(prev, action)
      if (!result.ok) {
        setError(result.error ?? 'Action failed')
        return prev
      }
      setError(null)
      return result.state
    })
  }, [])

  if (!state) {
    return (
      <NewGameScreen
        hasSave={hasSave}
        onStart={(companyName, seed) => {
          clearSave()
          setState(createGame({ companyName, seed }))
          setTab('command')
          setError(null)
        }}
        onContinue={() => {
          const s = loadGame()
          if (s) {
            setState(s)
            setError(null)
          }
        }}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-ink)]">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-1.5">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-bold tracking-[0.2em] text-[var(--color-amber)]">
            TAKEAWAY
          </span>
          <span className="hidden text-xs text-[var(--color-muted)] sm:inline">
            {state.companyName}
          </span>
        </div>
        <button
          type="button"
          className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          onClick={() => {
            if (confirm('Abandon current game and return to title?')) {
              clearSave()
              setState(null)
              setHasSave(false)
            }
          }}
        >
          ABANDON
        </button>
      </div>

      <Hud state={state} />

      <nav className="flex gap-0 border-b border-[var(--color-line)] bg-[var(--color-panel)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
              tab === t.id
                ? 'border-b-2 border-[var(--color-cyan)] text-[var(--color-cyan)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="border-b border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-1.5 text-xs text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'command' && (
          <CommandPanel
            state={state}
            error={error}
            onEndQuarter={() => dispatch({ type: 'END_QUARTER' })}
          />
        )}
        {tab === 'field' && (
          <FieldPanel
            state={state}
            onAcquire={(id) => dispatch({ type: 'ACQUIRE_LEASE', basinId: id })}
            onDrill={(id, count) => dispatch({ type: 'DRILL_WELLS', basinId: id, count })}
            onBuyTakeaway={(id, capacity) =>
              dispatch({ type: 'BUY_TAKEAWAY', basinId: id, capacity })
            }
          />
        )}
        {tab === 'midstream' && (
          <MidstreamPanel
            state={state}
            onFid={(id) => dispatch({ type: 'PROGRESS_FID', basinId: id })}
            onLiquefaction={(id, capacity) =>
              dispatch({ type: 'BOOK_LIQUEFACTION', basinId: id, capacity })
            }
            onShipping={(capacity) => dispatch({ type: 'BUY_SHIPPING', capacity })}
          />
        )}
        {tab === 'market' && (
          <MarketPanel
            state={state}
            onSchedule={(basinId: BasinId, hub: HubId, volume: number) =>
              dispatch({ type: 'SCHEDULE_CARGO', basinId, hub, volume })
            }
            onClear={() => dispatch({ type: 'CLEAR_CARGOES' })}
          />
        )}
      </main>
    </div>
  )
}
