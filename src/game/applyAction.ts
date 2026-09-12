import { BASIN_DEFS, SHIPPING_UNIT_COST } from './data.ts'
import { scheduledForBasin, scheduledLngTotal } from './constraints.ts'
import { createSandboxGame } from './createGame.ts'
import { resolveQuarter } from './resolveQuarter.ts'
import {
  answerPrediction,
  restartChapter,
  startNextChapter,
  syncLearnProgress,
} from './tutorial.ts'
import type { Action, ActionResult, ConstructionProject, GameState } from './types.ts'

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error }
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return n.toFixed(0)
}

function spend(
  state: GameState,
  cost: number,
  note: string,
  isCapex: boolean,
): ActionResult {
  if (cost < 0) return fail(state, 'Invalid cost')
  if (state.cash < cost) {
    return fail(state, `Cannot overspend: need $${fmt(cost)}, have $${fmt(state.cash)}`)
  }
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - cost,
      quarterCapex: isCapex ? state.quarterCapex + cost : state.quarterCapex,
      log: [...state.log, note].slice(-80),
    },
  }
}

function after(state: GameState): GameState {
  return syncLearnProgress(state)
}

export function applyAction(state: GameState, action: Action): ActionResult {
  if (state.gameOver && action.type !== 'END_QUARTER' && action.type !== 'ENTER_SANDBOX') {
    return fail(state, 'Game over')
  }

  switch (action.type) {
    case 'ACQUIRE_LEASE': {
      if (state.mode === 'learn' && action.basinId !== 'permian') {
        return fail(state, 'Learn mode focuses on Permian for chapters 1–2')
      }
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (basin.owned) return fail(state, `${def.name} already acquired`)
      const res = spend(
        state,
        def.leaseCost,
        `Acquired lease: ${def.name} (−$${fmt(def.leaseCost)})`,
        true,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: after({
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, owned: true },
          },
        }),
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
        `Drilled ${count} well(s) in ${def.name} (−$${fmt(cost)}). Fixed output/well is a simplification.`,
        true,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: after({
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, wells: basin.wells + count },
          },
        }),
      }
    }

    case 'BUY_TAKEAWAY': {
      const capacity = Math.floor(action.capacity)
      if (capacity < 1) return fail(state, 'Buy at least 1 MMBtu/q takeaway')
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      const cost = def.takeawayUnitCost * capacity
      const res = spend(
        state,
        cost,
        `Increase pipeline capacity (takeaway) +${fmt(capacity)} MMBtu/q on ${def.name} (−$${fmt(cost)})`,
        true,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: after({
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, takeaway: basin.takeaway + capacity },
          },
        }),
      }
    }

    case 'PROGRESS_FID': {
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      if (basin.fidProgress >= 100) {
        return fail(state, 'FID complete — reserve liquefaction capacity')
      }
      if (basin.fidApproved) {
        const proj = state.projects.find(
          (p) => p.basinId === action.basinId && p.kind === 'fid',
        )
        return fail(
          state,
          `FID already approved — construction in progress (${proj?.quartersRemaining ?? '?'} quarter(s) left). Repeat clicks do not finish early.`,
        )
      }
      const cost = Math.round(def.liquefactionUnitCost * 500_000)
      const res = spend(
        state,
        cost,
        `Approve the investment (FID) on ${def.name} (−$${fmt(cost)}). Construction starts: ${def.fidConstructionQuarters} quarters.`,
        true,
      )
      if (!res.ok) return res
      const project: ConstructionProject = {
        id: `fid-${action.basinId}-${state.turn}`,
        kind: 'fid',
        basinId: action.basinId,
        capacity: 0,
        quartersRemaining: def.fidConstructionQuarters,
        totalQuarters: def.fidConstructionQuarters,
        label: `FID construction — ${def.name}`,
        committedCost: cost,
      }
      return {
        ok: true,
        state: after({
          ...res.state,
          basins: {
            ...res.state.basins,
            [action.basinId]: { ...basin, fidApproved: true, fidProgress: 0 },
          },
          projects: [...res.state.projects, project],
        }),
      }
    }

    case 'BOOK_LIQUEFACTION': {
      const capacity = Math.floor(action.capacity)
      if (capacity < 1) return fail(state, 'Book at least 1 MMBtu/q liquefaction')
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      if (basin.fidProgress < 100) {
        return fail(
          state,
          `FID construction incomplete (${basin.fidProgress}%) — wait for project to finish`,
        )
      }
      const cost = def.liquefactionUnitCost * capacity
      const res = spend(
        state,
        cost,
        `Reserve space at an LNG plant (liquefaction) +${fmt(capacity)} MMBtu/q on ${def.name} (−$${fmt(cost)}). Online in ${def.liquefactionConstructionQuarters} quarters.`,
        true,
      )
      if (!res.ok) return res
      const project: ConstructionProject = {
        id: `liq-${action.basinId}-${state.turn}-${capacity}`,
        kind: 'liquefaction',
        basinId: action.basinId,
        capacity,
        quartersRemaining: def.liquefactionConstructionQuarters,
        totalQuarters: def.liquefactionConstructionQuarters,
        label: `Liquefaction build +${fmt(capacity)} — ${def.name}`,
        committedCost: cost,
      }
      return {
        ok: true,
        state: after({
          ...res.state,
          projects: [...res.state.projects, project],
        }),
      }
    }

    case 'BUY_SHIPPING': {
      const capacity = Math.floor(action.capacity)
      if (capacity < 1) return fail(state, 'Buy at least 1 MMBtu/q shipping')
      const units = capacity / 1_000_000
      const cost = Math.ceil(units * SHIPPING_UNIT_COST)
      const res = spend(
        state,
        cost,
        `Booked LNG shipping +${fmt(capacity)} MMBtu/q (−$${fmt(cost)})`,
        true,
      )
      if (!res.ok) return res
      return {
        ok: true,
        state: after({
          ...res.state,
          shippingCapacity: res.state.shippingCapacity + capacity,
        }),
      }
    }

    case 'SCHEDULE_CARGO': {
      const volume = Math.floor(action.volume)
      if (volume < 1) return fail(state, 'Schedule at least 1 MMBtu')
      const def = BASIN_DEFS[action.basinId]
      const basin = state.basins[action.basinId]
      if (!basin.owned) return fail(state, `Acquire ${def.name} first`)
      if (action.hub === 'HH') {
        return fail(state, 'HH is pipeline/domestic — schedule TTF or JKM cargoes for LNG')
      }
      if (basin.fidProgress < 100 || basin.liquefaction <= 0) {
        return fail(state, 'Need completed FID + online liquefaction before scheduling LNG cargoes')
      }
      const already = scheduledForBasin(state, action.basinId)
      if (already + volume > basin.liquefaction) {
        return fail(state, 'Cargo exceeds basin liquefaction capacity')
      }
      if (scheduledLngTotal(state) + volume > state.shippingCapacity) {
        return fail(state, 'Cargo exceeds shipping capacity')
      }
      const dest =
        action.hub === 'TTF' ? 'Northwest Europe (TTF)' : 'Northeast Asia (JKM)'
      const id = `c${state.turn}-${state.cargoes.length + 1}`
      return {
        ok: true,
        state: after({
          ...state,
          cargoes: [
            ...state.cargoes,
            { id, hub: action.hub, volume, basinId: action.basinId },
          ],
          log: [
            ...state.log,
            `Schedule an LNG shipment (nominate cargo): ${fmt(volume)} MMBtu → ${dest} from ${def.name}`,
          ].slice(-80),
        }),
      }
    }

    case 'CLEAR_CARGOES': {
      return {
        ok: true,
        state: after({
          ...state,
          cargoes: [],
          log: [...state.log, 'Cleared cargo schedule for this quarter'].slice(-80),
        }),
      }
    }

    case 'END_QUARTER': {
      const next = resolveQuarter(state)
      return { ok: true, state: after(next) }
    }

    case 'RESTART_CHAPTER': {
      if (state.mode !== 'learn' || !state.learn) {
        return fail(state, 'Restart is only available in Learn mode')
      }
      return { ok: true, state: restartChapter(state) }
    }

    case 'REVEAL_HINT': {
      if (!state.learn) return fail(state, 'No active Learn chapter')
      return {
        ok: true,
        state: {
          ...state,
          learn: { ...state.learn, hintRevealed: true },
        },
      }
    }

    case 'ANSWER_PREDICTION': {
      if (!state.learn?.prediction) return fail(state, 'No prediction question active')
      if (state.learn.prediction.answered) return fail(state, 'Already answered')
      return { ok: true, state: answerPrediction(state, action.choice) }
    }

    case 'COMPLETE_CHAPTER': {
      if (!state.learn) return fail(state, 'No Learn chapter')
      if (!state.learn.chapterComplete) {
        return fail(state, 'Finish the chapter objectives first')
      }
      return { ok: true, state: startNextChapter(state) }
    }

    case 'START_NEXT_CHAPTER': {
      if (!state.learn?.chapterComplete) {
        return fail(state, 'Chapter not complete yet')
      }
      return { ok: true, state: startNextChapter(state) }
    }

    case 'ENTER_SANDBOX': {
      const sandbox = createSandboxGame({
        companyName: state.companyName,
        seed: state.seed,
      })
      return {
        ok: true,
        state: {
          ...sandbox,
          log: [
            ...sandbox.log,
            'Entered Sandbox from Learn. Full basins and LNG chain unlocked.',
          ],
        },
      }
    }

    case 'DISMISS_INTRO': {
      if (!state.learn) return { ok: true, state }
      return {
        ok: true,
        state: {
          ...state,
          learn: { ...state.learn, introSeen: true },
        },
      }
    }

    default: {
      const _exhaustive: never = action
      return fail(state, `Unknown action: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
