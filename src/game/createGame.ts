import {
  BASIN_DEFS,
  INITIAL_PRICES,
  LEARN_STARTING_CASH,
  PRICE_MODEL_LABEL,
  SAVE_VERSION,
  START_QUARTER,
  START_YEAR,
  STARTING_CASH,
} from './data.ts'
import type { BasinId, BasinState, GameMode, GameState, LearnState } from './types.ts'

function emptyBasin(id: BasinId): BasinState {
  return {
    id,
    owned: false,
    wells: 0,
    takeaway: 0,
    liquefaction: 0,
    fidProgress: 0,
    fidApproved: false,
  }
}

function allBasins(): Record<BasinId, BasinState> {
  return {
    permian: emptyBasin('permian'),
    haynesville: emptyBasin('haynesville'),
    qatar: emptyBasin('qatar'),
    australia: emptyBasin('australia'),
  }
}

export interface NewGameOptions {
  companyName: string
  seed: number
  mode?: GameMode
}

function baseState(opts: NewGameOptions, cash: number): GameState {
  const seed = opts.seed >>> 0 || 1
  const mode = opts.mode ?? 'sandbox'
  return {
    saveVersion: SAVE_VERSION,
    mode,
    companyName: opts.companyName.trim() || 'Northwind Energy',
    seed,
    rngState: seed,
    year: START_YEAR,
    quarter: START_QUARTER,
    cash,
    basins: allBasins(),
    shippingCapacity: 0,
    cargoes: [],
    prices: { ...INITIAL_PRICES },
    cumulativeVolume: 0,
    cumulativeNet: 0,
    volumeScore: 0,
    marginScore: 0,
    bindingConstraint: 'wells',
    lastResult: null,
    log: [],
    gameOver: false,
    turn: 0,
    quarterCapex: 0,
    projects: [],
    learn: null,
    unmarketedPolicy: 'left_in_ground',
    priceModelLabel: PRICE_MODEL_LABEL,
  }
}

export function chapter1LearnState(seed: number): LearnState {
  return {
    chapter: 'first_sale',
    chapterSeed: seed,
    hintRevealed: false,
    objectives: [
      'Buy pipeline capacity (takeaway) so your well can reach US buyers at Henry Hub',
      'End the quarter to complete your first sale',
      'Notice revenue, operating profit, and cash — they are different',
    ],
    completedObjectives: [],
    chapterComplete: false,
    prediction: null,
    introSeen: false,
    salesBeforeDecision: null,
  }
}

export function chapter2LearnState(seed: number): LearnState {
  return {
    chapter: 'bottleneck',
    chapterSeed: seed,
    hintRevealed: false,
    objectives: [
      'You are takeaway-bound: wells could produce more than the pipe can move',
      'Choose: buy more pipeline capacity OR drill another well',
      'End the quarter and compare sales — more wells ≠ more sales if the pipe is full',
    ],
    completedObjectives: [],
    chapterComplete: false,
    prediction: {
      question: 'If you drill another well right now, will quarterly sales increase?',
      answered: false,
      choice: null,
      correct: null,
      explanation:
        'No — the binding constraint is pipeline takeaway. Extra well potential is left in the ground until you expand takeaway.',
    },
    introSeen: true,
    salesBeforeDecision: null,
  }
}

/** Sandbox: full map, all basins available to acquire. */
export function createSandboxGame(opts: NewGameOptions): GameState {
  const s = baseState({ ...opts, mode: 'sandbox' }, STARTING_CASH)
  return {
    ...s,
    log: [
      `Q${START_QUARTER} ${START_YEAR} — ${s.companyName} formed (Sandbox). Seed ${s.seed}.`,
      'You sell natural gas. Earn only when gas reaches a buyer.',
      'Lease options: Permian Gas, Haynesville, Qatar North Field Feed. Australia available too.',
      'Scores: cumulative sold volume (not reserves) vs realized operating profit $/MMBtu.',
      PRICE_MODEL_LABEL,
    ],
  }
}

/**
 * Learn chapter 1: one basin, one completed well, no takeaway.
 * Immediate objective — connect to a buyer via pipeline capacity.
 */
export function createLearnGame(opts: NewGameOptions): GameState {
  const s = baseState({ ...opts, mode: 'learn' }, LEARN_STARTING_CASH)
  const permian = {
    ...emptyBasin('permian'),
    owned: true,
    wells: 1,
    takeaway: 0,
  }
  const learn = chapter1LearnState(s.seed)
  return {
    ...s,
    basins: { ...s.basins, permian },
    bindingConstraint: 'takeaway',
    learn,
    log: [
      `Q${START_QUARTER} ${START_YEAR} — Learn mode: First sale. Seed ${s.seed}.`,
      'You already hold a Permian lease with one completed well (intentional fixed output until decline exists).',
      'Gas is left in the ground until you buy pipeline takeaway to reach Henry Hub buyers.',
      `Well potential: ${(BASIN_DEFS.permian.mmbtuPerWell / 1e6).toFixed(1)} million MMBtu per quarter.`,
    ],
  }
}

/** Chapter 2 setup: well + tight takeaway so the pipe binds. */
export function createLearnChapter2(opts: NewGameOptions): GameState {
  const s = baseState({ ...opts, mode: 'learn' }, LEARN_STARTING_CASH)
  const wellPot = BASIN_DEFS.permian.mmbtuPerWell
  const takeaway = Math.floor(wellPot * 0.5) // 0.6M — clearly binding
  const permian = {
    ...emptyBasin('permian'),
    owned: true,
    wells: 1,
    takeaway,
  }
  const learn = chapter2LearnState(s.seed)
  return {
    ...s,
    basins: { ...s.basins, permian },
    bindingConstraint: 'takeaway',
    learn: {
      ...learn,
      salesBeforeDecision: takeaway,
    },
    cash: LEARN_STARTING_CASH,
    log: [
      `Q${START_QUARTER} ${START_YEAR} — Learn mode: The bottleneck. Seed ${s.seed}.`,
      `One well can produce ${(wellPot / 1e6).toFixed(1)}M MMBtu/q but takeaway is only ${(takeaway / 1e6).toFixed(2)}M MMBtu/q.`,
      'Decide: expand the pipe, or drill another well?',
    ],
  }
}

export function createGame(opts: NewGameOptions): GameState {
  if (opts.mode === 'learn') return createLearnGame(opts)
  return createSandboxGame(opts)
}

/** Basins offered as lease options at sandbox start. */
export const STARTER_LEASE_OPTIONS: BasinId[] = ['permian', 'haynesville', 'qatar']

/** Visible basins in learn mode (others locked). */
export function visibleBasins(state: GameState): BasinId[] {
  if (state.mode === 'learn') return ['permian']
  return Object.keys(BASIN_DEFS) as BasinId[]
}
