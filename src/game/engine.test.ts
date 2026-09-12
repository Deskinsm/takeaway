import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyAction } from './applyAction.ts'
import {
  createGame,
  createLearnChapter2,
  createLearnGame,
  createSandboxGame,
} from './createGame.ts'
import { maxSellable } from './constraints.ts'
import { previewAction, previewQuarter } from './preview.ts'
import { migrateState } from './save.ts'
import { computeMarginScore, computeVolumeScore, scoreLabels } from './scores.ts'
import { CHAPTER_META } from './tutorial.ts'
import type { GameState } from './types.ts'

function fresh(seed = 42): GameState {
  return createSandboxGame({ companyName: 'TestCo', seed })
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

describe('capacity accounting', () => {
  it('sells min(wells, takeaway) on domestic path', () => {
    let s = fresh(7)
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'permian' }).state
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'permian', count: 2 }).state
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
    assert.ok(result.unmarketed >= 1_400_000 - 1)
    assert.equal(result.stranded, result.unmarketed)
    assert.equal(result.bindingConstraint, 'takeaway')
  })

  it('LNG path respects min(wells, takeaway, liquefaction, shipping)', () => {
    let s = fresh(99)
    s = { ...s, cash: 5_000_000_000 }
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'qatar' }).state
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'qatar', count: 2 }).state
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'qatar',
      capacity: 3_000_000,
    }).state

    // FID is a commit — construction takes multiple quarters
    const fid = applyAction(s, { type: 'PROGRESS_FID', basinId: 'qatar' })
    assert.equal(fid.ok, true)
    s = fid.state
    assert.equal(s.basins.qatar.fidApproved, true)
    assert.equal(s.basins.qatar.fidProgress, 0)
    assert.equal(s.projects.length, 1)
    assert.equal(s.projects[0].kind, 'fid')

    // Spam-click must NOT finish FID
    const spam = applyAction(s, { type: 'PROGRESS_FID', basinId: 'qatar' })
    assert.equal(spam.ok, false)
    assert.match(spam.error ?? '', /already approved|construction/i)

    // Advance quarters until FID completes
    const need = s.projects[0].quartersRemaining
    for (let i = 0; i < need; i++) {
      s = applyAction(s, { type: 'END_QUARTER' }).state
    }
    assert.equal(s.basins.qatar.fidProgress, 100)
    assert.equal(s.projects.filter((p) => p.kind === 'fid').length, 0)

    // Book liquefaction — also construction, not instant
    s = applyAction(s, {
      type: 'BOOK_LIQUEFACTION',
      basinId: 'qatar',
      capacity: 2_000_000,
    }).state
    assert.equal(s.basins.qatar.liquefaction, 0)
    assert.ok(s.projects.some((p) => p.kind === 'liquefaction'))
    const liqQ = s.projects.find((p) => p.kind === 'liquefaction')!.quartersRemaining
    for (let i = 0; i < liqQ; i++) {
      s = applyAction(s, { type: 'END_QUARTER' }).state
    }
    assert.equal(s.basins.qatar.liquefaction, 2_000_000)

    s = applyAction(s, { type: 'BUY_SHIPPING', capacity: 1_500_000 }).state
    s = applyAction(s, {
      type: 'SCHEDULE_CARGO',
      basinId: 'qatar',
      hub: 'JKM',
      volume: 1_500_000,
    }).state

    const sell = maxSellable(s, 'qatar')
    assert.equal(sell.lng, 1_500_000)

    const ended = applyAction(s, { type: 'END_QUARTER' })
    assert.equal(ended.ok, true)
    assert.equal(ended.state.lastResult?.sold, 1_500_000)
  })
})

describe('FID construction timing', () => {
  it('FID does not instant-complete and repeated clicks fail', () => {
    let s = fresh(3)
    s = { ...s, cash: 2_000_000_000 }
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'permian' }).state
    s = applyAction(s, { type: 'PROGRESS_FID', basinId: 'permian' }).state
    const remaining = s.projects[0].quartersRemaining
    assert.ok(remaining >= 2)
    for (let i = 0; i < 5; i++) {
      const r = applyAction(s, { type: 'PROGRESS_FID', basinId: 'permian' })
      assert.equal(r.ok, false)
    }
    assert.equal(s.basins.permian.fidProgress, 0)
    // One quarter tick reduces remaining but does not complete if remaining > 1
    s = applyAction(s, { type: 'END_QUARTER' }).state
    if (remaining > 1) {
      assert.ok(s.basins.permian.fidProgress < 100)
      assert.ok(s.projects.some((p) => p.kind === 'fid'))
    }
  })
})

describe('financial reconciliation basics', () => {
  it('separates revenue, operating profit, investment spend, and cash', () => {
    let s = fresh(11)
    s = { ...s, cash: 2_000_000_000, prices: { HH: 4.5, TTF: 8, JKM: 9 } }
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'permian' }).state
    const afterLease = s.cash
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'permian', count: 1 }).state
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'permian',
      capacity: 2_000_000,
    }).state
    const capex = s.quarterCapex
    assert.ok(capex > 0)
    assert.ok(s.cash < afterLease)

    const preview = previewQuarter(s)
    assert.equal(preview.investmentSpend, capex)
    assert.ok(preview.expectedSales > 0)

    s = applyAction(s, { type: 'END_QUARTER' }).state
    const r = s.lastResult!
    assert.ok(r.revenue > 0)
    assert.equal(r.operatingProfit, r.revenue - r.opex)
    assert.equal(r.netCash, r.operatingProfit)
    assert.equal(r.investmentSpend, capex)
    // Cash = pre-resolve cash + operating profit (capex already deducted during actions)
    assert.ok(Math.abs(r.closingCash - s.cash) < 0.01 || s.cash === r.closingCash)
    assert.equal(s.quarterCapex, 0)
  })

  it('scores are not labeled as reserves', () => {
    const labels = scoreLabels()
    assert.match(labels.volume, /not reserves/i)
    assert.match(labels.margin, /operating profit/i)
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

    s = { ...s, prices: { HH: 4.5, TTF: 8, JKM: 9 } }
    s = applyAction(s, { type: 'END_QUARTER' }).state
    const vol1 = s.volumeScore
    const mar1 = s.marginScore
    assert.ok(s.cumulativeVolume > 0)

    s = { ...s, prices: { HH: 0.8, TTF: 2, JKM: 2.5 } }
    s = applyAction(s, { type: 'END_QUARTER' }).state
    assert.ok(s.volumeScore > vol1)
    assert.ok(s.marginScore < mar1)
  })

  it('unmarketed gas: volume stalls while opex drags margin', () => {
    let s = fresh(21)
    s = { ...s, cash: 2_000_000_000 }
    s = applyAction(s, { type: 'ACQUIRE_LEASE', basinId: 'haynesville' }).state
    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'haynesville', count: 4 }).state
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'haynesville',
      capacity: 100_000,
    }).state
    s = { ...s, prices: { HH: 3.0, TTF: 6, JKM: 7 } }
    s = applyAction(s, { type: 'END_QUARTER' }).state
    assert.ok(s.lastResult)
    assert.ok(s.lastResult.unmarketed > s.lastResult.sold)
    const realized = s.cumulativeNet / s.cumulativeVolume
    const naive = 3.0 - 0.45 - 0.25
    assert.ok(realized < naive)
    assert.equal(s.volumeScore, computeVolumeScore(s.cumulativeVolume))
    assert.equal(s.marginScore, computeMarginScore(s.cumulativeNet, s.cumulativeVolume))
  })
})

describe('tutorial progression', () => {
  it('chapter 1: buy takeaway and sell completes first sale', () => {
    let s = createLearnGame({ companyName: 'Learner', seed: 55 })
    assert.equal(s.mode, 'learn')
    assert.equal(s.learn?.chapter, 'first_sale')
    assert.equal(s.basins.permian.owned, true)
    assert.equal(s.basins.permian.wells, 1)
    assert.equal(s.basins.permian.takeaway, 0)

    // Cannot sell yet
    let ended = applyAction(s, { type: 'END_QUARTER' })
    assert.equal(ended.state.lastResult?.sold, 0)

    s = applyAction(ended.state, {
      type: 'BUY_TAKEAWAY',
      basinId: 'permian',
      capacity: 1_200_000,
    }).state
    ended = applyAction(s, { type: 'END_QUARTER' })
    assert.ok((ended.state.lastResult?.sold ?? 0) > 0)
    assert.equal(ended.state.learn?.chapterComplete, true)
    assert.ok(CHAPTER_META.first_sale.title.includes('First sale'))
  })

  it('chapter 2: extra well does not raise sales when takeaway binds', () => {
    let s = createLearnChapter2({ companyName: 'Learner', seed: 66 })
    assert.equal(s.learn?.chapter, 'bottleneck')
    const sellBefore = maxSellable(s, 'permian').total

    const pred = applyAction(s, { type: 'ANSWER_PREDICTION', choice: 'no' })
    assert.equal(pred.ok, true)
    assert.equal(pred.state.learn?.prediction?.correct, true)
    s = pred.state

    s = applyAction(s, { type: 'DRILL_WELLS', basinId: 'permian', count: 1 }).state
    const sellAfterDrill = maxSellable(s, 'permian').total
    assert.equal(sellAfterDrill, sellBefore)

    s = applyAction(s, { type: 'END_QUARTER' }).state
    assert.equal(s.lastResult?.sold, sellBefore)

    // Restart and buy takeaway instead
    s = applyAction(s, { type: 'RESTART_CHAPTER' }).state
    assert.equal(s.learn?.chapter, 'bottleneck')
    const before = maxSellable(s, 'permian').total
    s = applyAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'permian',
      capacity: 1_000_000,
    }).state
    assert.ok(maxSellable(s, 'permian').total > before)
  })

  it('after chapter 2 can enter sandbox', () => {
    let s = createLearnChapter2({ companyName: 'Learner', seed: 77 })
    s = {
      ...s,
      learn: { ...s.learn!, chapterComplete: true, chapter: 'bottleneck' },
    }
    s = applyAction(s, { type: 'START_NEXT_CHAPTER' }).state
    assert.equal(s.learn?.chapter, 'done')
    const sand = applyAction(s, { type: 'ENTER_SANDBOX' })
    assert.equal(sand.ok, true)
    assert.equal(sand.state.mode, 'sandbox')
    assert.equal(sand.state.learn, null)
  })

  it('createGame learn mode delegates', () => {
    const s = createGame({ companyName: 'X', seed: 1, mode: 'learn' })
    assert.equal(s.mode, 'learn')
  })
})

describe('purchase previews', () => {
  it('takeaway preview reflects binding constraint effect', () => {
    const s = createLearnGame({ companyName: 'P', seed: 1 })
    const prev = previewAction(s, {
      type: 'BUY_TAKEAWAY',
      basinId: 'permian',
      capacity: 1_200_000,
    })
    assert.ok(prev)
    assert.match(prev.plainLabel, /pipeline capacity/i)
    assert.equal(prev.jargon, 'takeaway')
    assert.ok(prev.expectedSalesDelta > 0)
  })

  it('drill preview warns when takeaway binds', () => {
    const s = createLearnChapter2({ companyName: 'P', seed: 2 })
    const prev = previewAction(s, {
      type: 'DRILL_WELLS',
      basinId: 'permian',
      count: 1,
    })
    assert.ok(prev)
    assert.equal(prev.expectedSalesDelta, 0)
    assert.match(prev.effectSummary, /left in the ground/i)
  })
})

describe('save migration', () => {
  it('migrates legacy v1-shaped objects', () => {
    const legacy = {
      companyName: 'Old',
      seed: 123,
      rngState: 123,
      year: 2016,
      quarter: 2,
      cash: 100,
      basins: {
        permian: { id: 'permian', owned: true, wells: 2, takeaway: 500000, liquefaction: 0, fidProgress: 50 },
      },
      shippingCapacity: 0,
      cargoes: [],
      prices: { HH: 3, TTF: 5, JKM: 6 },
      cumulativeVolume: 10,
      cumulativeNet: 5,
      volumeScore: 1,
      marginScore: 0.5,
      bindingConstraint: 'takeaway',
      lastResult: null,
      log: [],
      gameOver: false,
      turn: 3,
    }
    const m = migrateState(legacy)
    assert.ok(m)
    assert.equal(m.saveVersion, 2)
    assert.equal(m.basins.permian.wells, 2)
    assert.equal(m.unmarketedPolicy, 'left_in_ground')
    assert.ok(m.projects)
  })
})
