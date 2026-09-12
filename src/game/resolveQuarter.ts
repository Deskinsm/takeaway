import { BASIN_DEFS, END_YEAR, SEASONALITY, unitOpexForHub } from './data.ts'
import {
  basinWellPotential,
  globalBindingConstraint,
  maxSellable,
} from './constraints.ts'
import { nextRngState } from './rng.ts'
import { refreshScores } from './scores.ts'
import type {
  BasinId,
  BasinState,
  ConstructionProject,
  GameState,
  HubId,
  HubPrices,
  QuarterResult,
} from './types.ts'

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

/** Advance construction one quarter. FID completion sets fidProgress=100. */
export function tickProjects(state: GameState): {
  basins: Record<BasinId, BasinState>
  projects: ConstructionProject[]
  notes: string[]
} {
  const notes: string[] = []
  const basins: Record<BasinId, BasinState> = { ...state.basins }
  // shallow copy basin objects we mutate
  for (const id of Object.keys(basins) as BasinId[]) {
    basins[id] = { ...basins[id] }
  }

  const remaining: ConstructionProject[] = []
  for (const p of state.projects) {
    const nextQ = p.quartersRemaining - 1
    if (nextQ > 0) {
      remaining.push({ ...p, quartersRemaining: nextQ })
      notes.push(`${p.label}: ${nextQ} quarter(s) remaining`)
      continue
    }
    if (p.kind === 'fid') {
      basins[p.basinId] = {
        ...basins[p.basinId],
        fidProgress: 100,
        fidApproved: true,
      }
      notes.push(
        `${BASIN_DEFS[p.basinId].name}: FID construction complete — you may now reserve liquefaction capacity.`,
      )
    } else if (p.kind === 'liquefaction') {
      basins[p.basinId] = {
        ...basins[p.basinId],
        liquefaction: basins[p.basinId].liquefaction + p.capacity,
      }
      notes.push(
        `${BASIN_DEFS[p.basinId].name}: liquefaction +${fmtVol(p.capacity)} MMBtu/q now online.`,
      )
    }
  }
  return { basins, projects: remaining, notes }
}

export function resolveQuarter(state: GameState): GameState {
  if (state.gameOver) return state

  const notes: string[] = []
  let revenue = 0
  let opex = 0
  let sold = 0
  let potentialOutput = 0
  let unmarketed = 0
  const investmentSpend = state.quarterCapex

  const basinIds = Object.keys(state.basins) as BasinId[]
  const shippingUsed = { n: 0 }

  for (const basinId of basinIds) {
    const basin = state.basins[basinId]
    if (!basin.owned) continue

    const potential = basinWellPotential(state, basinId)
    potentialOutput += potential
    const sell = maxSellable(state, basinId)

    const cargoes = state.cargoes.filter((c) => c.basinId === basinId)
    let lngSold = 0
    for (const cargo of cargoes) {
      const room = Math.min(
        cargo.volume,
        sell.lng - lngSold,
        state.shippingCapacity - shippingUsed.n,
      )
      if (room <= 0) continue
      const price = state.prices[cargo.hub as HubId]
      const unitOpex = unitOpexForHub(cargo.hub)
      revenue += room * price
      opex += room * unitOpex
      lngSold += room
      shippingUsed.n += room
      sold += room
    }

    const domesticVol = sell.domestic
    if (domesticVol > 0) {
      const price = state.prices.HH
      const unitOpex = unitOpexForHub('HH')
      revenue += domesticVol * price
      opex += domesticVol * unitOpex
      sold += domesticVol
    }

    const soldHere = lngSold + domesticVol
    const leftInGround = Math.max(0, potential - soldHere)
    unmarketed += leftInGround
    if (leftInGround > 0) {
      // Small lease / shut-in drag; gas is left in the ground (not flared in this model)
      opex += leftInGround * 0.15
      notes.push(
        `${BASIN_DEFS[basinId].name}: ${Math.round(leftInGround / 1e6 * 100) / 100}M MMBtu left in the ground (unmarketed — binding constraint).`,
      )
    }
  }

  const operatingProfit = revenue - opex
  const binding = globalBindingConstraint(state)

  const breakdown = { wells: 0, takeaway: 0, liquefaction: 0, shipping: state.shippingCapacity }
  for (const id of basinIds) {
    if (!state.basins[id].owned) continue
    const m = maxSellable(state, id)
    breakdown.wells += m.breakdown.wells
    breakdown.takeaway += m.breakdown.takeaway
    breakdown.liquefaction += m.breakdown.liquefaction
  }

  const closingCash = state.cash + operatingProfit

  const decisionMatters = describeDecision(state, sold, unmarketed, binding)
  const externalChange =
    state.quarter === 4 || state.quarter === 1
      ? 'Winter seasonality in the simulated scenario often lifts TTF/JKM — netback still depends on path costs.'
      : 'Hub prices evolve each quarter in the simulated 2015–2035 scenario (not historical quotes).'
  const reconsider =
    binding === 'takeaway'
      ? 'Reconsider: expanding wells without takeaway leaves more gas in the ground.'
      : binding === 'wells'
        ? 'Reconsider: pipe may be idle — drilling could raise sales if takeaway has room.'
        : 'Reconsider: check Flow view for the binding link before the next capital spend.'

  const result: QuarterResult = {
    year: state.year,
    quarter: state.quarter,
    potentialOutput,
    produced: potentialOutput,
    sold,
    unmarketed,
    stranded: unmarketed,
    revenue,
    opex,
    operatingProfit,
    investmentSpend,
    netCash: operatingProfit,
    closingCash,
    bindingConstraint: binding,
    constraintBreakdown: breakdown,
    prices: { ...state.prices },
    notes,
    feedback: {
      decisionMatters,
      externalChange,
      reconsider,
    },
  }

  // Tick construction AFTER this quarter's sales (builds finish at end of quarter)
  const ticked = tickProjects(state)
  notes.push(...ticked.notes.filter((n) => !notes.includes(n)))
  result.notes = [...notes]

  const { prices, rngState } = evolvePrices(state.prices, state.quarter, state.rngState)
  const cal = advanceCalendar(state.year, state.quarter)

  let next: GameState = {
    ...state,
    basins: ticked.basins,
    projects: ticked.projects,
    cash: closingCash,
    cumulativeVolume: state.cumulativeVolume + sold,
    cumulativeNet: state.cumulativeNet + operatingProfit,
    prices,
    rngState,
    year: cal.year,
    quarter: cal.quarter,
    gameOver: cal.gameOver || closingCash < 0,
    bindingConstraint: binding,
    lastResult: result,
    cargoes: [],
    turn: state.turn + 1,
    quarterCapex: 0,
    log: [
      ...state.log,
      `Resolved Q${state.quarter} ${state.year}: sold ${fmtVol(sold)} MMBtu | operating profit $${fmtMoney(operatingProfit)} | cash $${fmtMoney(closingCash)} | bound by ${binding}`,
      `Unmarketed (left in ground): ${fmtVol(unmarketed)} MMBtu. Investment spend this quarter: $${fmtMoney(investmentSpend)}.`,
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
          : `Horizon reached (${END_YEAR}). Final scores locked (volume sold ≠ reserves).`,
      ].slice(-80),
    }
  }

  if (state.quarter === 4 || state.quarter === 1) {
    next = {
      ...next,
      log: [
        ...next.log,
        'Winter seasonality (simulated): TTF/JKM often spike — compare netbacks, not headline prices.',
      ].slice(-80),
    }
  }

  return next
}

function describeDecision(
  state: GameState,
  sold: number,
  unmarketed: number,
  binding: string,
): string {
  if (state.quarterCapex > 0 && sold > 0) {
    return `Your investments this quarter ($${fmtMoney(state.quarterCapex)}) and the ${binding} constraint shaped sales of ${fmtVol(sold)} MMBtu.`
  }
  if (unmarketed > 0 && binding === 'takeaway') {
    return `Takeaway bound sales at ${fmtVol(sold)} MMBtu; ${fmtVol(unmarketed)} MMBtu stayed in the ground.`
  }
  if (sold === 0) {
    return 'No gas reached a buyer — without takeaway (or an export path), wells do not create revenue.'
  }
  return `Marketed ${fmtVol(sold)} MMBtu; binding constraint was ${binding}.`
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
