import { BASIN_DEFS } from './data.ts'
import { createLearnChapter2, createLearnGame } from './createGame.ts'
import type { GameState, LearnChapterId } from './types.ts'

export const CHAPTER_META: Record<
  Exclude<LearnChapterId, 'done'>,
  { title: string; decision: string; lesson: string }
> = {
  first_sale: {
    title: 'Chapter 1 — First sale',
    decision: 'Connect an existing well to a buyer via pipeline takeaway',
    lesson: 'Production → transportation → revenue & opex. You earn only when gas reaches a buyer.',
  },
  bottleneck: {
    title: 'Chapter 2 — The bottleneck',
    decision: 'Buy pipeline capacity OR drill another well',
    lesson: 'More production capacity ≠ more sales when takeaway binds.',
  },
}

export function chapterHint(state: GameState): string {
  const ch = state.learn?.chapter
  if (ch === 'first_sale') {
    return 'Open Field (or Flow): buy pipeline capacity (takeaway) on Permian, then End Quarter on Command. Domestic gas auto-sells to Henry Hub (US buyers) once the pipe has room.'
  }
  if (ch === 'bottleneck') {
    return 'Try drilling another well and ending the quarter — sales stay flat. Restart or undo by restarting the chapter, then buy takeaway instead and watch sales rise.'
  }
  return 'More chapters coming — continue in Sandbox to explore LNG and exports.'
}

/** Evaluate objective completion after state changes. */
export function syncLearnProgress(state: GameState): GameState {
  if (!state.learn || state.mode !== 'learn') return state
  const learn = { ...state.learn, completedObjectives: [...state.learn.completedObjectives] }
  const b = state.basins.permian

  if (learn.chapter === 'first_sale') {
    if (b.takeaway > 0) mark(learn, learn.objectives[0])
    if (state.lastResult && state.lastResult.sold > 0) {
      mark(learn, learn.objectives[1])
      mark(learn, learn.objectives[2])
      learn.chapterComplete = true
    }
  }

  if (learn.chapter === 'bottleneck') {
    mark(learn, learn.objectives[0])
    const drilledExtra = b.wells > 1
    const boughtPipe = b.takeaway > (learn.salesBeforeDecision ?? 0)
    if (drilledExtra || boughtPipe) mark(learn, learn.objectives[1])
    if (state.lastResult && state.turn > 0) {
      mark(learn, learn.objectives[2])
      // Complete once they've seen a resolution after the decision
      if (drilledExtra || boughtPipe) learn.chapterComplete = true
    }
  }

  if (learn.chapter === 'done') {
    learn.chapterComplete = true
  }

  return { ...state, learn }
}

function mark(
  learn: NonNullable<GameState['learn']>,
  objective: string | undefined,
): void {
  if (!objective) return
  if (!learn.completedObjectives.includes(objective)) {
    learn.completedObjectives.push(objective)
  }
}

export function restartChapter(state: GameState): GameState {
  if (!state.learn) return state
  const opts = { companyName: state.companyName, seed: state.learn.chapterSeed }
  if (state.learn.chapter === 'bottleneck') return createLearnChapter2(opts)
  if (state.learn.chapter === 'first_sale') return createLearnGame(opts)
  return state
}

export function startNextChapter(state: GameState): GameState {
  if (!state.learn) return state
  if (state.learn.chapter === 'first_sale' && state.learn.chapterComplete) {
    return createLearnChapter2({
      companyName: state.companyName,
      seed: (state.seed + 17) >>> 0 || 1,
    })
  }
  if (state.learn.chapter === 'bottleneck' && state.learn.chapterComplete) {
    return {
      ...state,
      learn: {
        ...state.learn,
        chapter: 'done',
        chapterComplete: true,
        objectives: ['Chapters 1–2 complete. More chapters coming.'],
        completedObjectives: ['Chapters 1–2 complete. More chapters coming.'],
        prediction: null,
      },
      log: [
        ...state.log,
        'Learn chapters 1–2 complete. Continue in Sandbox, or wait for more campaign chapters.',
      ].slice(-80),
    }
  }
  return state
}

export function answerPrediction(
  state: GameState,
  choice: 'yes' | 'no',
): GameState {
  if (!state.learn?.prediction) return state
  const correct = choice === 'no'
  return {
    ...state,
    learn: {
      ...state.learn,
      prediction: {
        ...state.learn.prediction,
        answered: true,
        choice,
        correct,
      },
    },
    log: [
      ...state.log,
      correct
        ? 'Prediction correct: another well will not raise sales while takeaway binds.'
        : 'Not quite — while the pipe is full, extra wells leave gas in the ground.',
    ].slice(-80),
  }
}

export function wellOutputLabel(basinId: 'permian' | 'haynesville' | 'qatar' | 'australia'): string {
  const m = BASIN_DEFS[basinId].mmbtuPerWell
  return `${(m / 1e6).toFixed(1)} million MMBtu per quarter (fixed output — simplification until decline exists)`
}
