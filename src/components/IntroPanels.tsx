/** Short illustrated intro — CSS/SVG panels, no art assets. */

const PANELS = [
  {
    title: 'You run a natural gas producer',
    body: 'Pay for access (leases), drill wells, arrange transport, and sell. You earn only when gas reaches a buyer.',
    svg: (
      <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
        <rect x="8" y="28" width="28" height="28" fill="#2a3340" stroke="#3dd6c6" />
        <text x="22" y="46" fill="#3dd6c6" fontSize="8" textAnchor="middle">
          WELL
        </text>
        <path d="M36 42 H72" stroke="#f5a524" strokeWidth="3" />
        <rect x="72" y="28" width="40" height="28" fill="#181e25" stroke="#f5a524" />
        <text x="92" y="46" fill="#f5a524" fontSize="8" textAnchor="middle">
          BUYER
        </text>
      </svg>
    ),
  },
  {
    title: 'Upstream · Midstream · Downstream',
    body: 'Upstream = produce (wells you own). Midstream = move/process (often purchased pipeline or plant capacity). Downstream = sell to customers. Owned assets vs purchased services both appear in TAKEAWAY.',
    svg: (
      <svg viewBox="0 0 200 48" className="h-14 w-full" aria-hidden>
        <rect x="4" y="12" width="56" height="24" fill="#12171c" stroke="#8b97a8" />
        <text x="32" y="28" fill="#8b97a8" fontSize="7" textAnchor="middle">
          UPSTREAM
        </text>
        <rect x="72" y="12" width="56" height="24" fill="#12171c" stroke="#3dd6c6" />
        <text x="100" y="28" fill="#3dd6c6" fontSize="7" textAnchor="middle">
          MIDSTREAM
        </text>
        <rect x="140" y="12" width="56" height="24" fill="#12171c" stroke="#f5a524" />
        <text x="168" y="28" fill="#f5a524" fontSize="7" textAnchor="middle">
          DOWNSTREAM
        </text>
      </svg>
    ),
  },
  {
    title: 'Natural gas first — then LNG',
    body: 'Chapters 1–2 sell domestic pipeline gas to US buyers (Henry Hub). LNG is gas cooled into a liquid for ships — destinations are customer regions (Europe / Asia), not just ticker abbreviations.',
    svg: (
      <svg viewBox="0 0 160 56" className="h-14 w-full" aria-hidden>
        <circle cx="30" cy="28" r="14" fill="#181e25" stroke="#3dd6c6" />
        <text x="30" y="31" fill="#3dd6c6" fontSize="7" textAnchor="middle">
          GAS
        </text>
        <path d="M44 28 H70" stroke="#8b97a8" strokeDasharray="3 2" />
        <rect x="70" y="14" width="36" height="28" rx="4" fill="#181e25" stroke="#f5a524" />
        <text x="88" y="31" fill="#f5a524" fontSize="7" textAnchor="middle">
          LNG
        </text>
        <path d="M106 28 H130" stroke="#8b97a8" />
        <text x="148" y="31" fill="#8b97a8" fontSize="7" textAnchor="middle">
          SHIP
        </text>
      </svg>
    ),
  },
  {
    title: 'More production only helps if you can sell',
    body: 'Extra wells do nothing for sales if the pipeline (takeaway) is full. Unsold potential is left in the ground. Watch revenue vs operating profit vs cash — they are different.',
    svg: (
      <svg viewBox="0 0 140 56" className="h-14 w-full" aria-hidden>
        <rect x="10" y="8" width="20" height="40" fill="#2a3340" />
        <rect x="34" y="8" width="20" height="40" fill="#2a3340" />
        <rect x="70" y="20" width="16" height="28" fill="#f07178" />
        <text x="78" y="14" fill="#f07178" fontSize="7" textAnchor="middle">
          PIPE
        </text>
        <text x="120" y="36" fill="#8b97a8" fontSize="7" textAnchor="middle">
          LIMIT
        </text>
      </svg>
    ),
  },
]

export function IntroPanels({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-2xl">
        <div className="mb-1 font-mono text-[10px] tracking-[0.2em] text-[var(--color-cyan)]">
          ORIENTATION
        </div>
        <h2 className="mb-4 text-xl font-bold text-[var(--color-amber)]">Before you start</h2>
        <div className="space-y-4">
          {PANELS.map((p) => (
            <section
              key={p.title}
              className="border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3"
            >
              <div className="mb-2 border-b border-[var(--color-line)] pb-2">{p.svg}</div>
              <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">{p.title}</h3>
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">{p.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--color-muted)]">
          MMBtu = one million British Thermal Units — the energy unit for gas prices ($/MMBtu).
        </p>
        <button
          type="button"
          className="mt-4 w-full bg-[var(--color-cyan)] px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110"
          onClick={onDone}
        >
          GOT IT — START LEARNING
        </button>
      </div>
    </div>
  )
}
