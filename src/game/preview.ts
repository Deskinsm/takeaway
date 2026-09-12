import { BASIN_DEFS, OPEX, SHIPPING_UNIT_COST, unitOpexForHub } from './data.ts'
import {
  basinWellPotential,
  getBasinCapacities,
  globalBindingConstraint,
  maxSellable,
} from './constraints.ts'
import type {
  Action,
  BasinId,
  GameState,
  PurchasePreview,
  QuarterPreview,
} from './types.ts'

function fmtVol(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M MMBtu`
  return `${n.toFixed(0)} MMBtu`
}

/**
 * Purchase / spend preview from real state.
 * Every spend should surface purpose, price, recurring cost, timing, expected effect.
 */
export function previewAction(state: GameState, action: Action): PurchasePreview | null {
  switch (action.type) {
    case 'ACQUIRE_LEASE': {
      const def = BASIN_DEFS[action.basinId]
      const blocked = state.basins[action.basinId].owned
        ? 'Already owned'
        : state.cash < def.leaseCost
          ? 'Insufficient cash'
          : null
      return {
        purpose: `Pay for mineral access in ${def.name}`,
        plainLabel: 'Acquire lease access',
        jargon: 'lease bonus / acreage',
        price: def.leaseCost,
        recurringCostPerMmbtu: 0,
        recurringNote: 'No direct per-MMBtu opex; enables drilling.',
        completionTime: 'Immediate',
        expectedSalesDelta: 0,
        expectedCashDelta: -def.leaseCost,
        effectSummary: 'Owns the right to drill. No sales until wells + takeaway exist.',
        blockedReason: blocked,
      }
    }
    case 'DRILL_WELLS': {
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      const count = Math.floor(action.count)
      const cost = def.wellCost * count
      const addPot = def.mmbtuPerWell * count
      const caps = getBasinCapacities(state, action.basinId)
      const currentSell = maxSellable(state, action.basinId).total
      // After drill, sell still limited by takeaway
      const newWells = caps.wells + addPot
      const newSell = Math.min(newWells, caps.takeaway)
      const salesDelta = Math.max(0, newSell - currentSell)
      const blocked = !basin.owned
        ? 'Acquire lease first'
        : state.cash < cost
          ? 'Insufficient cash'
          : null
      return {
        purpose: `Add ${count} well(s) — potential output in ${def.name}`,
        plainLabel: 'Drill / complete wells',
        jargon: 'upstream development',
        price: cost,
        recurringCostPerMmbtu: OPEX.production,
        recurringNote: `~$${OPEX.production}/MMBtu production opex on gas that sells`,
        completionTime: 'Immediate (simplification)',
        expectedSalesDelta: salesDelta,
        expectedCashDelta: -cost,
        effectSummary:
          salesDelta > 0
            ? `Could raise sales by ~${fmtVol(salesDelta)}/q if takeaway has room.`
            : `Adds ${fmtVol(addPot)}/q potential, but sales stay flat while takeaway binds — extra gas is left in the ground.`,
        blockedReason: blocked,
      }
    }
    case 'BUY_TAKEAWAY': {
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      const capacity = Math.floor(action.capacity)
      const cost = def.takeawayUnitCost * capacity
      const caps = getBasinCapacities(state, action.basinId)
      const currentSell = maxSellable(state, action.basinId).total
      const newTakeaway = caps.takeaway + capacity
      const newSell = Math.min(caps.wells, newTakeaway)
      const salesDelta = Math.max(0, newSell - currentSell)
      const blocked = !basin.owned
        ? 'Acquire lease first'
        : state.cash < cost
          ? 'Insufficient cash'
          : null
      return {
        purpose: `Move more gas from ${def.name} to buyers`,
        plainLabel: 'Increase pipeline capacity',
        jargon: 'takeaway',
        price: cost,
        recurringCostPerMmbtu: OPEX.takeaway,
        recurringNote: `~$${OPEX.takeaway}/MMBtu transport opex on sold volumes`,
        completionTime: 'Immediate (purchased capacity)',
        expectedSalesDelta: salesDelta,
        expectedCashDelta: -cost,
        effectSummary:
          salesDelta > 0
            ? `Expected sales +${fmtVol(salesDelta)}/q (pipe was the bottleneck).`
            : `Adds ${fmtVol(capacity)}/q pipe room; sales unchanged until wells catch up.`,
        blockedReason: blocked,
      }
    }
    case 'PROGRESS_FID': {
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      const cost = Math.round(def.liquefactionUnitCost * 500_000)
      const existing = state.projects.find(
        (p) => p.basinId === action.basinId && p.kind === 'fid',
      )
      let blocked: string | null = null
      if (!basin.owned) blocked = 'Acquire lease first'
      else if (basin.fidProgress >= 100) blocked = 'FID complete — reserve liquefaction capacity'
      else if (basin.fidApproved || existing)
        blocked = `FID already approved — construction has ${existing?.quartersRemaining ?? '?'} quarter(s) left`
      else if (state.cash < cost) blocked = 'Insufficient cash'
      return {
        purpose: `Commit to an LNG export project at ${def.name}`,
        plainLabel: 'Approve the investment',
        jargon: 'FID',
        price: cost,
        recurringCostPerMmbtu: 0,
        recurringNote: 'No sales impact until construction finishes and capacity is reserved.',
        completionTime: `${def.fidConstructionQuarters} quarters construction (not instant)`,
        expectedSalesDelta: 0,
        expectedCashDelta: -cost,
        effectSummary:
          'FID is a commit only. Construction runs over multiple quarters; repeat clicks do not finish it early.',
        blockedReason: blocked,
      }
    }
    case 'BOOK_LIQUEFACTION': {
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      const capacity = Math.floor(action.capacity)
      const cost = def.liquefactionUnitCost * capacity
      let blocked: string | null = null
      if (!basin.owned) blocked = 'Acquire lease first'
      else if (basin.fidProgress < 100)
        blocked = `Need FID construction complete (now ${basin.fidProgress}%)`
      else if (state.cash < cost) blocked = 'Insufficient cash'
      return {
        purpose: `Reserve liquefaction throughput at ${def.name}`,
        plainLabel: 'Reserve space at an LNG plant',
        jargon: 'liquefaction capacity',
        price: cost,
        recurringCostPerMmbtu: OPEX.liquefaction,
        recurringNote: `~$${OPEX.liquefaction}/MMBtu when volumes liquefy`,
        completionTime: `${def.liquefactionConstructionQuarters} quarters to come online`,
        expectedSalesDelta: 0,
        expectedCashDelta: -cost,
        effectSummary: `After construction, +${fmtVol(capacity)}/q liquefaction. Still need shipping + a nominated cargo to sell LNG.`,
        blockedReason: blocked,
      }
    }
    case 'BUY_SHIPPING': {
      const capacity = Math.floor(action.capacity)
      const cost = Math.ceil((capacity / 1_000_000) * SHIPPING_UNIT_COST)
      const blocked = state.cash < cost ? 'Insufficient cash' : null
      return {
        purpose: 'Charter tanker capacity for LNG exports',
        plainLabel: 'Book LNG shipping capacity',
        jargon: 'shipping / charter',
        price: cost,
        recurringCostPerMmbtu: OPEX.shipping,
        recurringNote: `~$${OPEX.shipping}/MMBtu (+ JKM haul premium on Asia routes)`,
        completionTime: 'Immediate booking',
        expectedSalesDelta: 0,
        expectedCashDelta: -cost,
        effectSummary: `Adds ${fmtVol(capacity)}/q shipping. Nominate cargoes to Europe (TTF) or Asia (JKM).`,
        blockedReason: blocked,
      }
    }
    case 'SCHEDULE_CARGO': {
      return {
        purpose: `Send LNG to ${action.hub === 'TTF' ? 'Northwest Europe' : 'Northeast Asia'} customers`,
        plainLabel: 'Schedule an LNG shipment',
        jargon: 'nominate cargo',
        price: 0,
        recurringCostPerMmbtu: unitOpexForHub(action.hub),
        recurringNote: `Netback uses destination price minus ~$${unitOpexForHub(action.hub)}/MMBtu path costs`,
        completionTime: 'This quarter (nomination)',
        expectedSalesDelta: Math.floor(action.volume),
        expectedCashDelta: 0,
        effectSummary: 'No upfront cash — revenue/opex resolve at quarter end. Higher price ≠ better if netback is worse.',
        blockedReason: null,
      }
    }
    default:
      return null
  }
}

/** Before ending the quarter — expected sales/cash from current nominations & capacities. */
export function previewQuarter(state: GameState): QuarterPreview {
  const basinIds = Object.keys(state.basins) as BasinId[]
  let expectedSales = 0
  let potentialOutput = 0
  let unusedWell = 0
  let unusedTakeaway = 0
  let expectedRevenue = 0
  let expectedOpex = 0
  const notes: string[] = []

  let shippingUsed = 0
  for (const basinId of basinIds) {
    const basin = state.basins[basinId]
    if (!basin.owned) continue
    const potential = basinWellPotential(state, basinId)
    potentialOutput += potential
    const sell = maxSellable(state, basinId)
    const caps = getBasinCapacities(state, basinId)

    const cargoes = state.cargoes.filter((c) => c.basinId === basinId)
    let lngSold = 0
    for (const cargo of cargoes) {
      const room = Math.min(
        cargo.volume,
        sell.lng - lngSold,
        state.shippingCapacity - shippingUsed,
      )
      if (room <= 0) continue
      const price = state.prices[cargo.hub]
      const unit = unitOpexForHub(cargo.hub)
      expectedRevenue += room * price
      expectedOpex += room * unit
      lngSold += room
      shippingUsed += room
      expectedSales += room
    }

    const domesticVol = sell.domestic
    if (domesticVol > 0) {
      expectedRevenue += domesticVol * state.prices.HH
      expectedOpex += domesticVol * unitOpexForHub('HH')
      expectedSales += domesticVol
    }

    const soldHere = lngSold + domesticVol
    const unmarketed = Math.max(0, potential - soldHere)
    if (unmarketed > 0) {
      expectedOpex += unmarketed * 0.15
      notes.push(
        `${BASIN_DEFS[basinId].name}: ${fmtVol(unmarketed)} left in the ground (unmarketed)`,
      )
    }
    unusedWell += Math.max(0, caps.wells - soldHere)
    unusedTakeaway += Math.max(0, caps.takeaway - soldHere)
  }

  const opProfit = expectedRevenue - expectedOpex
  const binding = globalBindingConstraint(state)

  return {
    expectedSales,
    potentialOutput,
    unusedWellCapacity: unusedWell,
    unusedTakeaway,
    expectedRevenue,
    expectedOpex,
    expectedOperatingProfit: opProfit,
    investmentSpend: state.quarterCapex,
    closingCash: state.cash + opProfit,
    bindingConstraint: binding,
    priceMode: 'known',
    prices: { ...state.prices },
    notes,
  }
}
