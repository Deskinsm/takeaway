import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyAction } from './applyAction.ts'
import { createGame } from './createGame.ts'
import { maxSellable } from './constraints.ts'
import { computeMarginScore, computeVolumeScore } from './scores.ts'
import type { GameState } from './types.ts'

function fresh(seed = 42): GameState {
  return createGame({ companyName: 'TestCo', seed })
}

describe('cannot overspend', () => {
  it('rejects lease when cash is insufficient', () => {
    let s = fresh()
    s = { ...s, cash: 1_000 }
    const r = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'permian' })
    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /Cannot overspend/)
    assert.equal(r.state.cash, 1_000)
    assert.equal(r.state.basins.permian.owned, false)
  })

  it('rejects drilling when wells would exceed cash', () => {
    let s = fresh()
    const acquired = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'permian' })
    assert.equal(acquired.ok, true)
    s = acquired.state
    s = { ...s, cash: 1_000_000 }
    const r = applyAction(s, { type: 'DRILL_WELLS', basinId: 'permian', count: 5 })
    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /Cannot overspend/)
    assert.equal(r.state.basins.permian.wells, 0)
  })

  it('rejects takeaway purchase beyond cash', () => {
    let s = fresh()
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'haynesville' }).state
    s = { ...s, cash: 100 }
    const r = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'haynesville',
      capacity: 1_000_000,
    })
    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /Cannot overspend/)
  })
})

describe('production respects binding min constraint', () => {
  it('sells min(wells, takeaway) on domestic path', () => {
    let s = fresh(7)
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'permian' }).state
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'permian', count: 2 }).state
    // 2 wells * 1.2M = 2.4M potential; buy only 1M takeaway
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'permian',
      capacity: 1_000_000,
    }).state

    const sell = maxSellable(s, 'permian')
    assert.equal(sell.binding, 'takeaway')
    assert.equal(sell.total, 1_000_000)
    assert.equal(sell.domestic, 1_000_000)

    const ended = applyAction(s, { type: 'END_QUARTER' })
    assert.equal(ended.ok, true)
    const result = ended.state.lastResult
    assert.ok(result)
    assert.equal(result.sold, 1_000_000)
    assert.ok(result.stranded >= 1_400_000 - 1) // ~1.4M stranded
    assert.equal(result.bindingConstraint, 'takeaway')
  })

  it('LNG path respects min(wells, takeaway, liquefaction, shipping)', () => {
    let s = fresh(99)
    s = { ...s, cash: 5_000_000_000 }
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'qatar' }).state
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'qatar', count: 2 }).state
    // 2 * 2.2M = 4.4M wells
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'qatar',
      capacity: 3_000_000,
    }).state
    // FID to 100%
    for (let i = 0; i < 5; i++) {
      const r = applyAction(s, { type: 'PROGRESS_FID', basinId: 'qatar' })
      assert.equal(r.ok, true)
      s = r.state
    }
    assert.equal(s.basins.qatar.fidProgress, 100)
    s = applyAction(s, {
      type: 'BOOK_LIQUEFACTION',
      basinId: 'qatar',
      capacity: 2_000_000,
    }).state
    s = applyAction(s, { type: 'BUY_SHIPPING', capacity: 1_500_000 }).state
    s = applyAction(s, {
      type: 'SCHEDULE_CARGO',
      basinId: 'qatar',
      hub: 'JKM',
      volume: 1_500_000,
    }).state

    const sell = maxSellable(s, 'qatar')
    assert.equal(sell.lng, 1_500_000)
    assert.ok(
      ['shipping', 'liquefaction', 'takeaway', 'wells'].includes(sell.binding),
    )

    const ended = applyAction(s, { type: 'END_QUARTER' })
    assert.equal(ended.ok, true)
    assert.equal(ended.state.lastResult?.sold, 1_500_000)
  })
})

describe('margin score vs volume score diverge', () => {
  it('under price crash, volume can rise while margin score falls', () => {
    let s = fresh(11)
    s = { ...s, cash: 2_000_000_000 }
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'permian' }).state
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'permian', count: 3 }).state
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'permian',
      capacity: 5_000_000,
    }).state

    // Healthy prices first quarter
    s = {
      ...s,
      prices: { HH: 4.5, TTF: 8, JKM: 9 },
    }
    s = applyAction(s, { type: 'END_QUARTER' }).state
    const vol1 = s.volumeScore
    const mar1 = s.marginScore
    assert.ok(s.cumulativeVolume > 0)
    assert.ok(vol1 > 0)
    assert.ok(mar1 > 0)

    // Crash HH; keep producing
    s = {
      ...s,
      prices: { HH: 0.8, TTF: 2, JKM: 2.5 },
    }
    s = applyAction(s, { type: 'END_QUARTER' }).state
    const vol2 = s.volumeScore
    const mar2 = s.marginScore

    assert.ok(vol2 > vol1, 'volume score should keep rising')
    assert.ok(
      mar2 < mar1,
      `margin score should fall after crash (${mar2} vs ${mar1})`,
    )
  })

  it('stranded gas: volume stalls relative to potential while opex drags margin', () => {
    let s = fresh(21)
    s = { ...s, cash: 2_000_000_000 }
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'haynesville' }).state
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'haynesville', count: 4 }).state
    // Almost no takeaway → heavy stranded
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'haynesville',
      capacity: 100_000,
    }).state
    s = {
      ...s,
      prices: { HH: 3.0, TTF: 6, JKM: 7 },
    }
    s = applyAction(s, { type: 'END_QUARTER' }).state
    assert.ok(s.lastResult)
    assert.ok(s.lastResult.stranded > s.lastResult.sold)
    // Realized margin dragged by stranded opex
    const realized = s.cumulativeNet / s.cumulativeVolume
    const naive = 3.0 - 0.45 - 0.25 // price - prod - takeaway
    assert.ok(
      realized < naive,
      `stranded drag: realized ${realized} should be < naive ${naive}`,
    )

    // Scores helpers stay consistent
    assert.equal(s.volumeScore, computeVolumeScore(s.cumulativeVolume))
    assert.equal(s.marginScore, computeMarginScore(s.cumulativeNet, s.cumulativeVolume))
  })
})
