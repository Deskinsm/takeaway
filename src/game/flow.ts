import { BASIN_DEFS } from './data.ts'
import {
  basinWellPotential,
  getBasinCapacities,
  maxSellable,
} from './constraints.ts'
import { constraintExplain } from './constraints.ts'
import type { BasinId, ConstraintId, GameState } from './types.ts'

export interface FlowNode {
  id: ConstraintId | 'buyer' | 'lng_locked'
  label: string
  plainLabel: string
  capacity: number
  flow: number
  utilization: number
  binding: boolean
  locked?: boolean
  lockedReason?: string
  explain: { what: string; why: string; expansion: string }
}

export interface FlowPath {
  basinId: BasinId
  basinName: string
  potentialOutput: number
  actualFlow: number
  binding: ConstraintId
  nodes: FlowNode[]
  /** Empty / non-operating leases should not be shown as the bottleneck. */
  operating: boolean
}

/**
 * Persistent flow: origin → transport → buyer.
 * LNG branch dimmed/locked until liquefaction path is relevant.
 */
export function buildFlowPaths(state: GameState): FlowPath[] {
  const ids = (Object.keys(state.basins) as BasinId[]).filter((id) => {
    if (state.mode === 'learn') return id === 'permian'
    return state.basins[id].owned
  })

  return ids.map((basinId) => {
    const def = BASIN_DEFS[basinId]
    const caps = getBasinCapacities(state, basinId)
    const sell = maxSellable(state, basinId)
    const potential = basinWellPotential(state, basinId)
    const actual = sell.total
    const operating = state.basins[basinId].owned && potential > 0
    const binding = operating ? sell.binding : ('wells' as ConstraintId)

    const wellUtil = caps.wells > 0 ? actual / caps.wells : 0
    const pipeUtil = caps.takeaway > 0 ? actual / caps.takeaway : 0

    const nodes: FlowNode[] = [
      {
        id: 'wells',
        label: 'Wells',
        plainLabel: 'Origin — potential output',
        capacity: caps.wells,
        flow: Math.min(actual, caps.wells),
        utilization: wellUtil,
        binding: binding === 'wells',
        explain: constraintExplain('wells'),
      },
      {
        id: 'takeaway',
        label: 'Pipeline',
        plainLabel: 'Transport — takeaway',
        capacity: caps.takeaway,
        flow: Math.min(actual, caps.takeaway),
        utilization: pipeUtil,
        binding: binding === 'takeaway',
        explain: constraintExplain('takeaway'),
      },
      {
        id: 'buyer',
        label: def.domesticHub ? 'Henry Hub buyers' : 'Export buyers',
        plainLabel: 'Buyer / region',
        capacity: actual,
        flow: actual,
        utilization: actual > 0 ? 1 : 0,
        binding: false,
        explain: {
          what: 'Customers who pay for gas that arrives.',
          why: 'You earn revenue only when gas reaches a buyer — not when it sits in the well.',
          expansion: 'Domestic path sells to US Henry Hub; LNG exports (later) reach Europe or Asia.',
        },
      },
    ]

    // LNG branch — dimmed/locked in learn chapters 1–2 and until FID path exists
    const lngUnlocked =
      state.mode === 'sandbox' &&
      (state.basins[basinId].fidProgress >= 100 || state.basins[basinId].fidApproved)
    nodes.push({
      id: lngUnlocked ? 'liquefaction' : 'lng_locked',
      label: 'LNG export',
      plainLabel: lngUnlocked ? 'Liquefaction → shipping → overseas buyers' : 'LNG branch (locked)',
      capacity: lngUnlocked ? caps.liquefaction : 0,
      flow: sell.lng,
      utilization:
        lngUnlocked && caps.liquefaction > 0 ? sell.lng / caps.liquefaction : 0,
      binding: binding === 'liquefaction' || binding === 'shipping',
      locked: !lngUnlocked,
      lockedReason: lngUnlocked
        ? undefined
        : state.mode === 'learn'
          ? 'LNG (cooled liquid for ship transport) unlocks in later chapters. Chapters 1–2 teach domestic pipeline sales first.'
          : 'Approve FID and finish construction, then reserve liquefaction and shipping to unlock exports.',
      explain: lngUnlocked
        ? constraintExplain('liquefaction')
        : {
            what: 'LNG = natural gas cooled into a liquid so tankers can reach distant customers.',
            why: 'Export prices (TTF/JKM) are not always better — netback = price minus costs to reach that market.',
            expansion: 'Later: FID → construction → liquefaction capacity → nominate cargoes.',
          },
    })

    return {
      basinId,
      basinName: def.name,
      potentialOutput: potential,
      actualFlow: actual,
      binding,
      nodes,
      operating,
    }
  })
}
