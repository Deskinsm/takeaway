import {
  CHAPTER_META,
  chapterHint,
  type GameState,
} from '../game/index.ts'

export function LearnChrome({
  state,
  onHint,
  onRestart,
  onNext,
  onSandbox,
  onAnswer,
}: {
  state: GameState
  onHint: () => void
  onRestart: () => void
  onNext: () => void
  onSandbox: () => void
  onAnswer: (choice: 'yes' | 'no') => void
}) {
  const learn = state.learn
  if (!learn || state.mode !== 'learn') return null

  if (learn.chapter === 'done') {
    return (
      <div className="border-b border-[var(--color-ok)]/30 bg-[var(--color-ok)]/10 px-3 py-2">
        <div className="text-sm font-semibold text-[var(--color-ok)]">
          Chapters 1–2 complete
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          More campaign chapters coming. Continue in Sandbox to explore FID, LNG, and export
          netbacks — or keep this save.
        </p>
        <button
          type="button"
          onClick={onSandbox}
          className="mt-2 bg-[var(--color-amber)] px-3 py-1.5 text-xs font-semibold text-black"
        >
          CONTINUE IN SANDBOX
        </button>
      </div>
    )
  }

  const meta = CHAPTER_META[learn.chapter]
  return (
    <div className="border-b border-[var(--color-cyan)]/30 bg-[var(--color-panel)] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-cyan)]">
            Learn · {meta.title}
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Decision: {meta.decision}. Lesson: {meta.lesson}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onHint}
            className="border border-[var(--color-line)] px-2 py-1 text-[11px] hover:border-[var(--color-cyan)]"
          >
            Hint
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="border border-[var(--color-line)] px-2 py-1 text-[11px] hover:border-[var(--color-amber)]"
          >
            Restart chapter
          </button>
        </div>
      </div>

      <ul className="mt-2 space-y-1 text-xs">
        {learn.objectives.map((obj) => {
          const done = learn.completedObjectives.includes(obj)
          return (
            <li
              key={obj}
              className={done ? 'text-[var(--color-ok)]' : 'text-[var(--color-text)]'}
            >
              {done ? '✓' : '○'} {obj}
            </li>
          )
        })}
      </ul>

      {learn.hintRevealed && (
        <p className="mt-2 text-xs text-[var(--color-amber)]">{chapterHint(state)}</p>
      )}

      {learn.prediction && !learn.prediction.answered && (
        <div className="mt-2 border border-[var(--color-line)] bg-[var(--color-panel-2)] p-2">
          <p className="text-xs text-[var(--color-text)]">{learn.prediction.question}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onAnswer('yes')}
              className="border border-[var(--color-line)] px-3 py-1 text-[11px] hover:border-[var(--color-cyan)]"
            >
              Yes — sales rise
            </button>
            <button
              type="button"
              onClick={() => onAnswer('no')}
              className="border border-[var(--color-line)] px-3 py-1 text-[11px] hover:border-[var(--color-cyan)]"
            >
              No — sales stay flat
            </button>
          </div>
        </div>
      )}

      {learn.prediction?.answered && (
        <p
          className={`mt-2 text-xs ${
            learn.prediction.correct ? 'text-[var(--color-ok)]' : 'text-[var(--color-amber)]'
          }`}
        >
          {learn.prediction.explanation}
        </p>
      )}

      {learn.chapterComplete && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNext}
            className="bg-[var(--color-cyan)] px-3 py-1.5 text-xs font-semibold text-black"
          >
            {learn.chapter === 'first_sale' ? 'NEXT: THE BOTTLENECK' : 'FINISH LEARN (1–2)'}
          </button>
          {learn.chapter === 'bottleneck' && (
            <button
              type="button"
              onClick={onSandbox}
              className="border border-[var(--color-amber)] px-3 py-1.5 text-xs text-[var(--color-amber)]"
            >
              Skip to Sandbox
            </button>
          )}
        </div>
      )}
    </div>
  )
}
