import { PRICE_MODEL_LABEL, SAVE_VERSION } from './data.ts'
import type { BasinId, BasinState, GameState } from './types.ts'

const KEY = 'takeaway.save.v2'
const LEGACY_KEY = 'takeaway.save.v1'

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

/** Migrate v1 or partial saves into v2 shape. */
export function migrateState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<GameState> & { basins?: Record<string, Partial<BasinState>> }
  if (typeof s.seed !== 'number' || !s.basins) return null

  const basins = {
    permian: emptyBasin('permian'),
    haynesville: emptyBasin('haynesville'),
    qatar: emptyBasin('qatar'),
    australia: emptyBasin('australia'),
  }
  for (const id of Object.keys(basins) as BasinId[]) {
    const b = s.basins[id]
    if (!b) continue
    basins[id] = {
      ...basins[id],
      owned: !!b.owned,
      wells: Number(b.wells) || 0,
      takeaway: Number(b.takeaway) || 0,
      liquefaction: Number(b.liquefaction) || 0,
      fidProgress: Number(b.fidProgress) || 0,
      fidApproved: !!b.fidApproved || (Number(b.fidProgress) || 0) >= 100,
    }
  }

  return {
    saveVersion: SAVE_VERSION,
    mode: s.mode === 'learn' ? 'learn' : 'sandbox',
    companyName: String(s.companyName || 'Northwind Energy'),
    seed: s.seed >>> 0 || 1,
    rngState: typeof s.rngState === 'number' ? s.rngState : s.seed >>> 0 || 1,
    year: typeof s.year === 'number' ? s.year : 2015,
    quarter: (s.quarter === 1 || s.quarter === 2 || s.quarter === 3 || s.quarter === 4
      ? s.quarter
      : 4) as 1 | 2 | 3 | 4,
    cash: typeof s.cash === 'number' ? s.cash : 0,
    basins,
    shippingCapacity: Number(s.shippingCapacity) || 0,
    cargoes: Array.isArray(s.cargoes) ? s.cargoes : [],
    prices: s.prices ?? { HH: 2.65, TTF: 5.4, JKM: 6.1 },
    cumulativeVolume: Number(s.cumulativeVolume) || 0,
    cumulativeNet: Number(s.cumulativeNet) || 0,
    volumeScore: Number(s.volumeScore) || 0,
    marginScore: Number(s.marginScore) || 0,
    bindingConstraint: s.bindingConstraint ?? 'wells',
    lastResult: s.lastResult ?? null,
    log: Array.isArray(s.log) ? s.log : [],
    gameOver: !!s.gameOver,
    turn: Number(s.turn) || 0,
    quarterCapex: Number(s.quarterCapex) || 0,
    projects: Array.isArray(s.projects) ? s.projects : [],
    learn: s.learn ?? null,
    unmarketedPolicy: 'left_in_ground',
    priceModelLabel: s.priceModelLabel ?? PRICE_MODEL_LABEL,
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota / private mode — ignore
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    return migrateState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // ignore
  }
}
