import { BASIN_DEFS, INITIAL_PRICES, START_QUARTER, START_YEAR, STARTING_CASH } from './data.ts'
import type { BasinId, BasinState, GameState } from './types.ts'

function emptyBasin(id: BasinId): BasinState {
  return {
    id,
    owned: false,
    wells: 0,
    takeaway: 0,
    liquefaction: 0,
    fidProgress: 0,
  }
}

export interface NewGameOptions {
  companyName: string
  seed: number
}

/**
 * Start Q4 2015 with cash and one lease option flagged in each of 3 basins
 * (player still pays to acquire — options are available immediately).
 */
export function createGame(opts: NewGameOptions): GameState {
  const seed = opts.seed >>> 0 || 1
  const basins = {
    permian: emptyBasin('permian'),
    haynesville: emptyBasin('haynesville'),
    qatar: emptyBasin('qatar'),
    australia: emptyBasin('australia'),
  }

  // Soft-start: grant a free starter option marker via log; leases still cost cash.
  // Give a tiny starting takeaway on Permian so first wells aren't instantly stranded.
  void BASIN_DEFS

  return {
    companyName: opts.companyName.trim() || 'Northwind Energy',
    seed,
    rngState: seed,
    year: START_YEAR,
    quarter: START_QUARTER,
    cash: STARTING_CASH,
    basins,
    shippingCapacity: 0,
    cargoes: [],
    prices: { ...INITIAL_PRICES },
    cumulativeVolume: 0,
    cumulativeNet: 0,
    volumeScore: 0,
    marginScore: 0,
    bindingConstraint: 'wells',
    lastResult: null,
    log: [
      `Q${START_QUARTER} ${START_YEAR} — ${opts.companyName.trim() || 'Northwind Energy'} formed. Seed ${seed}.`,
      'Lease options open: Permian Gas, Haynesville, Qatar North Field Feed.',
      'Dual mandate: grow volumes/reserves AND realized margin ($/mmbtu). They will conflict.',
    ],
    gameOver: false,
    turn: 0,
  }
}

/** Basins offered as lease options at game start (Australia unlocks later via cash). */
export const STARTER_LEASE_OPTIONS: BasinId[] = ['permian', 'haynesville', 'qatar']
