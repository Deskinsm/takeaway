import { BASIN_DEFS, END_YEAR, OPEX, SEASONALITY } from './data.ts'
import {
  basinWellPotential,
  globalBindingConstraint,
  maxSellable,
} from './constraints.ts'
import { nextRngState } from './rng.ts'
import { refreshScores } from './scores.ts'
import type { BasinId, GameState, HubId, HubPrices, QuarterResult } from './types.ts'

function clampPrice(p: number): number {
  return Math.round(Math.max(0.5, Math.min(45, p)) * 100) / 100
}

function evolvePrices(
  prices: HubPrices,
  quarter: 1 | 2 | 3 | 4,
  rngState: number,
): { prices: HubPrices; rngState: number } {
  const seasonal = SEASONALITY[quarter]
  let s = rngState
  const noise = (scale: number) => {
    const r = nextRngState(s)
    s = r.nextState
    return (r.value - 0.5) * 2 * scale
  }

  // Mild mean reversion toward anchors
  const anchors: HubPrices = { HH: 2.8, TTF: 6.5, JKM: 7.0 }
  const next: HubPrices = {
    HH: clampPrice(prices.HH + seasonal.HH + noise(0.35) + (anchors.HH - prices.HH) * 0.08),
    TTF: clampPrice(prices.TTF + seasonal.TTF + noise(0.9) + (anchors.TTF - prices.TTF) * 0.06),
    JKM: clampPrice(prices.JKM + seasonal.JKM + noise(0.85) + (anchors.JKM - prices.JKM) * 0.06),
  }
  return { prices: next, rngState: s }
}

function advanceCalendar(year: number, quarter: 1 | 2 | 3 | 4): {
  year: number
  quarter: 1 | 2 | 3 | 4
  gameOver: boolean
} {
  if (quarter === 4) {
    const y = year + 1
    return { year: y, quarter: 1, gameOver: y > END_YEAR }
  }
  return { year, quarter: (quarter + 1) as 1 | 2 | 3 | 4, gameOver: false }
}

export function resolveQuarter(state: GameState): GameState {
  if (state.gameOver) return state

  const notes: string[] = []
  let revenue = 0
  let opex = 0
  let sold = 0
  let produced = 0
  let stranded = 0

  const basinIds = Object.keys(state.basins) as BasinId[]

  // Allocate cargo sales first (LNG), then domestic remainder
  const shippingUsed = { n: 0 }

  for (const basinId of basinIds) {
    const basin = state.basins[basinId]
    if (!basin.owned) continue

    const potential = basinWellPotential(state, basinId)
    produced += potential
    const sell = maxSellable(state, basinId)

    // LNG cargoes at scheduled hubs
    const cargoes = state.cargoes.filter((c) => c.basinId === basinId)
    let lngSold = 0
    for (const cargo of cargoes) {
      const room = Math.min(cargo.volume, sell.lng - lngSold, state.shippingCapacity - shippingUsed.n)
      if (room <= 0) continue
      const price = state.prices[cargo.hub as HubId]
      const unitOpex =
        OPEX.production + OPEX.takeaway + OPEX.liquefaction + OPEX.shipping
      revenue += room * price
      opex += room * unitOpex
      lngSold += room
      shippingUsed.n += room
      sold += room
    }

    // Domestic HH sales
    const domesticVol = sell.domestic
    if (domesticVol > 0) {
      const price = state.prices.HH
      const unitOpex = OPEX.production + OPEX.takeaway
      revenue += domesticVol * price
      opex += domesticVol * unitOpex
      sold += domesticVol
    }

    const soldHere = lngSold + domesticVol
    const strandedHere = Math.max(0, potential - soldHere)
    stranded += strandedHere
    if (strandedHere > 0) {
      // Stranded gas still incurs a small shut-in / lease opex drag
      opex += strandedHere * 0.15
      notes.push(
        `${BASIN_DEFS[basinId].name}: stranded ${Math.round(strandedHere / 1e6)}M mmbtu (constraint-bound)`,
      )
    }
  }

  const netCash = revenue - opex
  const binding = globalBindingConstraint(state)

  // Aggregate breakdown from owned basins
  const breakdown = { wells: 0, takeaway: 0, liquefaction: 0, shipping: state.shippingCapacity }
  for (const id of basinIds) {
    if (!state.basins[id].owned) continue
    const m = maxSellable(state, id)
    breakdown.wells += m.breakdown.wells
    breakdown.takeaway += m.breakdown.takeaway
    breakdown.liquefaction += m.breakdown.liquefaction
  }

  const result: QuarterResult = {
    year: state.year,
    quarter: state.quarter,
    produced,
    sold,
    stranded,
    revenue,
    opex,
    netCash,
    bindingConstraint: binding,
    constraintBreakdown: breakdown,
    prices: { ...state.prices },
    notes,
  }

  const { prices, rngState } = evolvePrices(state.prices, state.quarter, state.rngState)
  const cal = advanceCalendar(state.year, state.quarter)

  let next: GameState = {
    ...state,
    cash: state.cash + netCash,
    cumulativeVolume: state.cumulativeVolume + sold,
    cumulativeNet: state.cumulativeNet + netCash,
    prices,
    rngState,
    year: cal.year,
    quarter: cal.quarter,
    gameOver: cal.gameOver || state.cash + netCash < 0,
    bindingConstraint: binding,
    lastResult: result,
    cargoes: [], // cargoes are quarterly nominations
    turn: state.turn + 1,
    log: [
      ...state.log,
      `Resolved Q${state.quarter} ${state.year}: sold ${fmtVol(sold)} mmbtu | net $${fmtMoney(netCash)} | bound by ${binding}`,
      ...notes,
    ].slice(-80),
  }

  next = refreshScores(next)

  if (next.gameOver) {
    next = {
      ...next,
      log: [
        ...next.log,
        next.cash < 0
          ? 'Insolvent — game over.'
          : `Horizon reached (${END_YEAR}). Final dual scores locked.`,
      ].slice(-80),
    }
  }

  // Winter spike teaching note
  if (state.quarter === 4 || state.quarter === 1) {
    next = {
      ...next,
      log: [
        ...next.log,
        'Winter seasonality: TTF/JKM typically spike — cargo diversion matters.',
      ].slice(-80),
    }
  }

  return next
}

function fmtVol(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  return n.toFixed(0)
}

function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}M`
  return `${sign}${a.toFixed(0)}`
}
