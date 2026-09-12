import { BASIN_DEFS } from './data.ts'
import type { BasinId, ConstraintId, GameState, HubId } from './types.ts'

export interface BasinCapacities {
  wells: number
  takeaway: number
  liquefaction: number
  shipping: number
  /** Domestic HH path capacity (no LNG needed). */
  domesticPath: number
  /** LNG export path capacity. */
  lngPath: number
}

export function basinWellPotential(state: GameState, basinId: BasinId): number {
  const b = state.basins[basinId]
  if (!b.owned) return 0
  const def = BASIN_DEFS[basinId]
  return b.wells * def.mmbtuPerWell
}

export function getBasinCapacities(state: GameState, basinId: BasinId): BasinCapacities {
  const b = state.basins[basinId]
  const wells = basinWellPotential(state, basinId)
  const takeaway = b.owned ? b.takeaway : 0
  const liquefaction = b.owned ? b.liquefaction : 0
  const shipping = state.shippingCapacity
  const def = BASIN_DEFS[basinId]

  // Domestic (pipeline to HH): limited by wells & takeaway
  const domesticPath = def.domesticHub ? Math.min(wells, takeaway) : 0
  // LNG path: wells → takeaway → liquefaction → shipping
  const lngPath = Math.min(wells, takeaway, liquefaction, shipping)

  return { wells, takeaway, liquefaction, shipping, domesticPath, lngPath }
}

export function scheduledForBasin(state: GameState, basinId: BasinId): number {
  return state.cargoes
    .filter((c) => c.basinId === basinId)
    .reduce((s, c) => s + c.volume, 0)
}

export function scheduledLngTotal(state: GameState): number {
  return state.cargoes.reduce((s, c) => s + c.volume, 0)
}

/**
 * Max sellable this quarter for a basin given cargo schedule + domestic sales.
 * Domestic fills remaining after cargoes, capped by domestic path.
 */
export function maxSellable(state: GameState, basinId: BasinId): {
  domestic: number
  lng: number
  total: number
  binding: ConstraintId
  breakdown: Record<'wells' | 'takeaway' | 'liquefaction' | 'shipping', number>
} {
  const caps = getBasinCapacities(state, basinId)
  const def = BASIN_DEFS[basinId]
  const lngScheduled = scheduledForBasin(state, basinId)
  const lng = Math.min(lngScheduled, caps.lngPath)

  // Remaining well+takeaway after LNG allocation can go domestic if available
  const remainingAfterLng = Math.max(0, Math.min(caps.wells, caps.takeaway) - lng)
  const domestic = def.domesticHub ? Math.min(remainingAfterLng, caps.domesticPath) : 0

  const breakdown = {
    wells: caps.wells,
    takeaway: caps.takeaway,
    liquefaction: caps.liquefaction,
    shipping: caps.shipping,
  }

  // Which constraint binds overall throughput potential
  const chain: { id: ConstraintId; v: number }[] = [
    { id: 'wells', v: caps.wells },
    { id: 'takeaway', v: caps.takeaway },
  ]
  if (def.lngFeed || lngScheduled > 0) {
    chain.push({ id: 'liquefaction', v: caps.liquefaction })
    chain.push({ id: 'shipping', v: caps.shipping })
  }

  let binding: ConstraintId = 'wells'
  let minV = Infinity
  for (const c of chain) {
    if (c.v < minV) {
      minV = c.v
      binding = c.id
    }
  }
  if (caps.wells === 0 && !state.basins[basinId].owned) {
    binding = 'wells'
  }

  return { domestic, lng, total: domestic + lng, binding, breakdown }
}

export function globalBindingConstraint(state: GameState): ConstraintId {
  const owned = (Object.keys(state.basins) as BasinId[]).filter((id) => state.basins[id].owned)
  if (owned.length === 0) return 'wells'

  let worst: ConstraintId = 'none'
  let worstSlack = Infinity

  for (const id of owned) {
    const caps = getBasinCapacities(state, id)
    const potential = caps.wells
    if (potential <= 0) {
      if (worstSlack > 0) {
        worstSlack = 0
        worst = 'wells'
      }
      continue
    }
    const steps: { id: ConstraintId; v: number }[] = [
      { id: 'wells', v: caps.wells },
      { id: 'takeaway', v: caps.takeaway },
      { id: 'liquefaction', v: caps.liquefaction },
      { id: 'shipping', v: caps.shipping },
    ]
    // For domestic-only basins with no cargoes, liquefaction/shipping less relevant
    const hasLng = BASIN_DEFS[id].lngFeed || scheduledForBasin(state, id) > 0
    const relevant = hasLng
      ? steps
      : [
          { id: 'wells' as ConstraintId, v: caps.wells },
          { id: 'takeaway' as ConstraintId, v: caps.takeaway },
        ]

    for (const s of relevant) {
      const slack = s.v // lowest capacity binds
      if (slack < worstSlack) {
        worstSlack = slack
        worst = s.id
      }
    }
  }

  // If prices are crushed and we still produce, surface hub_price as soft signal
  const avg = (state.prices.HH + state.prices.TTF + state.prices.JKM) / 3
  if (avg < 2.0 && worst !== 'wells') {
    return 'hub_price'
  }

  return worst === 'none' ? 'wells' : worst
}

export function hubLabel(hub: HubId): string {
  switch (hub) {
    case 'HH':
      return 'Henry Hub'
    case 'TTF':
      return 'TTF'
    case 'JKM':
      return 'JKM'
  }
}
