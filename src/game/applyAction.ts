import { BASIN_DEFS, SHIPPING_UNIT_COST } from './data.ts'
import { scheduledForBasin, scheduledLngTotal } from './constraints.ts'
import { resolveQuarter } from './resolveQuarter.ts'
import type { Action, ActionResult, GameState } from './types.ts'

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error }
}

function spend(state: GameState, cost: number, note: string): ActionResult {
  if (cost < 0) return fail(state, 'Invalid cost')
  if (state.cash < cost) {
    return fail(state, `Cannot overspend: need $${fmt(cost)}, have $${fmt(state.cash)}`)
  }
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - cost,
      log: [...state.log, note].slice(-80),
    },
  }
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return n.toFixed(0)
}

export function applyAction(state: GameState, action: Action): ActionResult {
  if (state.gameOver && action.type !== 'END_QUARTER') {
    return fail(state, 'Game over')
  }

  switch (action.type) {
    case 'ACQUIRE_LEASE': {
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (basin.owned) return fail(state, `${def.name} already acquired`)
      const res = spend(
        state,
        def.leaseCost,
        `Acquired lease: ${def.name} (−$${fmt(def.leaseCost)})`,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: {
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, owned: true },
          },
        },
      }
    }

    case 'DRILL_WELLS': {
      const count = Math.floor(action.count)
      if (count < 1) return fail(state, 'Drill at least 1 well')
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      const cost = def.wellCost * count
      const res = spend(
        state,
        cost,
        `Drilled ${count} well(s) in ${def.name} (−$${fmt(cost)})`,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: {
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, wells: basin.wells + count },
          },
        },
      }
    }

    case 'BUY_TAKEAWAY': {
      const capacity = Math.floor(action.capacity)
      if (capacity < 1) return fail(state, 'Buy at least 1 mmbtu/q takeaway')
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      const cost = def.takeawayUnitCost * capacity
      const res = spend(
        state,
        cost,
        `Booked ${fmt(capacity)} mmbtu/q takeaway on ${def.name} (−$${fmt(cost)})`,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: {
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, takeaway: basin.takeaway + capacity },
          },
        },
      }
    }

    case 'PROGRESS_FID': {
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, 'FID complete — book liquefaction slots')
      if (basin.fidProgress >= 100) return fail(state, 'FID complete — book liquefaction slots')
      const cost = Math.round(def.liquefactionUnitCost * 500_000)
      const res = spend(
        state,
        cost,
        `FID progress +${def.fidProgressPerAction}% on ${def.name} (−$${fmt(cost)})`,
      )
      if (!res.ok) return res
      const next = Math.min(100, basin.fidProgress + def.fidProgressPerAction)
      return {
        ok: true,
        state: {
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, fidProgress: next },
          },
          log: [
            ...res.state.log.slice(0, -1),
            `FID progress +${def.fidProgressPerAction}% on ${def.name} → ${next}% (−$${fmt(cost)})`,
          ].slice(-80),
        },
      }
    }

    case 'BOOK_LIQUEFACTION': {
      const capacity = Math.floor(action.capacity)
      if (capacity < 1) return fail(state, 'Book at least 1 mmbtu/q liquefaction')
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      if (basin.fidProgress < 100) {
        return fail(state, `FID incomplete (${basin.fidProgress}%) — progress FID first`)
      }
      const cost = def.liquefactionUnitCost * capacity
      const res = spend(
        state,
        cost,
        `Booked ${fmt(capacity)} mmbtu/q liquefaction on ${def.name} (−$${fmt(cost)})`,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: {
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, liquefaction: basin.liquefaction + capacity },
          },
        },
      }
    }

    case 'BUY_SHIPPING': {
      const capacity = Math.floor(action.capacity)
      if (capacity < 1) return fail(state, 'Buy at least 1 mmbtu/q shipping')
      const units = capacity / 1_000_000
      const cost = Math.ceil(units * SHIPPING_UNIT_COST)
      const res = spend(
        state,
        cost,
        `Chartered ${fmt(capacity)} mmbtu/q shipping (−$${fmt(cost)})`,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: {
          ...res.state,
          shippingCapacity: res.state.shippingCapacity + capacity,
        },
      }
    }

    case 'SCHEDULE_CARGO': {
      const volume = Math.floor(action.volume)
      if (volume < 1) return fail(state, 'Schedule at least 1 mmbtu')
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      if (action.hub === 'HH') {
        return fail(state, 'HH is pipeline/domestic — schedule TTF or JKM cargoes for LNG')
      }
      if (basin.fidProgress < 100 || basin.liquefaction <= 0) {
        return fail(state, 'Need FID + liquefaction before scheduling LNG cargoes')
      }
      const already = scheduledForBasin(state, action.basinId)
      if (already + volume > basin.liquefaction) {
        return fail(state, 'Cargo exceeds basin liquefaction capacity')
      }
      if (scheduledLngTotal(state) + volume > state.shippingCapacity) {
        return fail(state, 'Cargo exceeds shipping capacity')
      }
      const id = `c${state.turn}-${state.cargoes.length + 1}`
      return {
        ok: true,
        state: {
          ...state,
          cargoes: [
            ...state.cargoes,
            { id, hub: action.hub, volume, basinId: action.basinId },
          ],
          log: [
            ...state.log,
            `Scheduled ${fmt(volume)} mmbtu → ${action.hub} from ${def.name}`,
          ].slice(-80),
        },
      }
    }

    case 'CLEAR_CARGOES': {
      return {
        ok: true,
        state: {
          ...state,
          cargoes: [],
          log: [...state.log, 'Cleared cargo schedule for this quarter'].slice(-80),
        },
      }
    }

    case 'END_QUARTER': {
      const next = resolveQuarter(state)
      return { ok: true, state: next }
    }

    default: {
      const _exhaustive: never = action
      return fail(state, `Unknown action: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
