import { useState } from 'react'
import { buildFlowPaths, type FlowNode, type GameState } from '../game/index.ts'
import { vol } from './format.ts'

export function FlowPanel({ state }: { state: GameState }) {
  const paths = buildFlowPaths(state)
  const [selected, setSelected] = useState<FlowNode | null>(null)

  if (paths.length === 0) {
    return (
      <div className="p-3 text-sm text-[var(--color-muted)]">
        Acquire an operating lease to see the flow from wells → pipe → buyer. Empty options do not
        hide the bottleneck on your producing field.
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-[var(--color-muted)]">
        Persistent flow: <strong className="text-[var(--color-text)]">origin → transport → buyer</strong>.
        Click a node for what it is, why it matters, and what expansion does. Binding constraint is
        highlighted. Unmarketed gas is <em>left in the ground</em>.
      </p>

      {paths.map((path) => (
        <section
          key={path.basinId}
          className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-amber)]">{path.basinName}</h3>
            <div className="text-[11px] text-[var(--color-muted)]">
              Potential {vol(path.potentialOutput)}/q · Actual flow {vol(path.actualFlow)}/q · Bound
              by{' '}
              <span className="font-mono text-[var(--color-danger)]">{path.binding}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-2">
            {path.nodes.map((node, i) => (
              <div key={node.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(node)}
                  className={`min-w-[7.5rem] border px-2 py-2 text-left transition ${
                    node.locked
                      ? 'border-dashed border-[var(--color-line)] opacity-50'
                      : node.binding
                        ? 'border-[var(--color-danger)] bg-[var(--color-danger)]/10'
                        : 'border-[var(--color-line)] hover:border-[var(--color-cyan)]'
                  }`}
                >
                  <div className="text-[9px] uppercase tracking-wider text-[var(--color-muted)]">
                    {node.plainLabel}
                  </div>
                  <div className="text-xs font-semibold text-[var(--color-text)]">{node.label}</div>
                  <div className="num mt-1 text-[10px] text-[var(--color-muted)]">
                    {node.locked
                      ? 'LOCKED'
                      : `cap ${vol(node.capacity)} · flow ${vol(node.flow)} · ${Math.round(node.utilization * 100)}%`}
                  </div>
                </button>
                {i < path.nodes.length - 1 && (
                  <span className="text-[var(--color-muted)]" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <aside className="border border-[var(--color-cyan)]/40 bg-[var(--color-panel)] p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="font-semibold text-[var(--color-cyan)]">
              {selected.label}
              {selected.binding ? ' · BINDING' : ''}
            </h4>
            <button
              type="button"
              className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          {selected.locked && selected.lockedReason && (
            <p className="mb-2 text-[var(--color-amber)]">{selected.lockedReason}</p>
          )}
          <p className="mb-1">
            <span className="text-[var(--color-muted)]">What: </span>
            {selected.explain.what}
          </p>
          <p className="mb-1">
            <span className="text-[var(--color-muted)]">Why it matters: </span>
            {selected.explain.why}
          </p>
          <p>
            <span className="text-[var(--color-muted)]">Expansion: </span>
            {selected.explain.expansion}
          </p>
        </aside>
      )}
    </div>
  )
}
