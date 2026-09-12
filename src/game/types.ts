/** Hub price markers for gas/LNG. Destinations are customers/regions. */
export type HubId = 'HH' | 'TTF' | 'JKM'

/** Binding constraint along the value chain. */
export type ConstraintId =
  | 'wells'
  | 'takeaway'
  | 'liquefaction'
  | 'shipping'
  | 'hub_price'
  | 'none'

export type BasinId = 'permian' | 'haynesville' | 'qatar' | 'australia'

export type TabId = 'command' | 'field' | 'midstream' | 'market' | 'flow'

export type GameMode = 'learn' | 'sandbox'

export type LearnChapterId = 'first_sale' | 'bottleneck' | 'done'

/** Unmarketed gas policy — stated in UI. */
export type UnmarketedPolicy = 'left_in_ground'

export interface BasinDef {
  id: BasinId
  name: string
  region: string
  /** Short teaching blurb. */
  blurb: string
  leaseCost: number
  wellCost: number
  /** Potential production per completed well, mmbtu / quarter.
   * Fixed output is an intentional simplification until decline curves exist. */
  mmbtuPerWell: number
  /** Cost to buy 1 mmbtu/q of pipeline takeaway. */
  takeawayUnitCost: number
  /** Cost to book 1 mmbtu/q liquefaction slot (or FID tranche). */
  liquefactionUnitCost: number
  /** Quarters from FID approval until liquefaction can be reserved. */
  fidConstructionQuarters: number
  /** Quarters after booking liquefaction until capacity is online. */
  liquefactionConstructionQuarters: number
  /** True if basin gas needs liquefaction before TTF/JKM sale. */
  lngFeed: boolean
  /** Domestic hub if any (pipeline sales). */
  domesticHub: HubId | null
}

export interface BasinState {
  id: BasinId
  owned: boolean
  wells: number
  /** Pipeline takeaway capacity, mmbtu / quarter. */
  takeaway: number
  /** Liquefaction throughput booked/online, mmbtu / quarter. */
  liquefaction: number
  /**
   * FID status: 0 = not approved, 100 = FID approved and construction complete.
   * During construction, see projects — progress is NOT advanced by spam-clicking.
   */
  fidProgress: number
  /** True once the board has approved FID (commit). Construction may still be ongoing. */
  fidApproved: boolean
}

export type ProjectKind = 'fid' | 'liquefaction'

/** Multi-quarter construction. FID is a commit; builds do not finish in the same click. */
export interface ConstructionProject {
  id: string
  kind: ProjectKind
  basinId: BasinId
  /** Capacity to add when liquefaction construction completes. */
  capacity: number
  quartersRemaining: number
  totalQuarters: number
  label: string
  /** Upfront capital already spent at commit. */
  committedCost: number
}

export interface Cargo {
  id: string
  hub: HubId
  /** Volume committed this quarter, mmbtu. */
  volume: number
  basinId: BasinId
}

export interface HubPrices {
  HH: number
  TTF: number
  JKM: number
}

export interface QuarterResult {
  year: number
  quarter: number
  /** Well potential (what wells could produce if unconstrained). */
  potentialOutput: number
  /** Alias for potential — kept for older UI. */
  produced: number
  /** Actually sold / marketed this quarter. */
  sold: number
  /** Potential that was not marketed (left in the ground). */
  unmarketed: number
  /** @deprecated use unmarketed — same value, left in ground. */
  stranded: number
  revenue: number
  opex: number
  /** revenue − opex (operating profit). Does NOT subtract capital spend. */
  operatingProfit: number
  /** Capital spend during the quarter (leases, wells, takeaway, FID, etc.). */
  investmentSpend: number
  /** operatingProfit − already-spent cash is tracked separately; netCash here = operating only. */
  netCash: number
  closingCash: number
  bindingConstraint: ConstraintId
  constraintBreakdown: Record<Exclude<ConstraintId, 'none' | 'hub_price'>, number>
  prices: HubPrices
  notes: string[]
  /** What decision mattered / external change / reconsider. */
  feedback: {
    decisionMatters: string
    externalChange: string
    reconsider: string
  }
}

export interface LearnPrediction {
  question: string
  /** Revealed after answer or after seeing the outcome. */
  answered: boolean
  choice: 'yes' | 'no' | null
  correct: boolean | null
  explanation: string
}

export interface LearnState {
  chapter: LearnChapterId
  /** Snapshot seed for chapter restart. */
  chapterSeed: number
  hintRevealed: boolean
  objectives: string[]
  completedObjectives: string[]
  chapterComplete: boolean
  prediction: LearnPrediction | null
  /** Intro panels already dismissed. */
  introSeen: boolean
  salesBeforeDecision: number | null
}

export interface GameState {
  /** Save format version for migrations. */
  saveVersion: number
  mode: GameMode
  companyName: string
  seed: number
  /** Mulberry32 state. */
  rngState: number
  year: number
  quarter: 1 | 2 | 3 | 4
  cash: number
  basins: Record<BasinId, BasinState>
  /** Global LNG shipping booking capacity, mmbtu / quarter. */
  shippingCapacity: number
  cargoes: Cargo[]
  prices: HubPrices
  /** Cumulative sold mmbtu — volume score input. NOT reserves. */
  cumulativeVolume: number
  /** Cumulative operating profit $ (margin score input). */
  cumulativeNet: number
  /** Cumulative sold volume index — NOT a reserves figure. */
  volumeScore: number
  /** Realized average operating profit $/mmbtu. */
  marginScore: number
  bindingConstraint: ConstraintId
  lastResult: QuarterResult | null
  log: string[]
  gameOver: boolean
  turn: number
  /** Capex spent since last quarter resolve (resets each END_QUARTER). */
  quarterCapex: number
  projects: ConstructionProject[]
  learn: LearnState | null
  /** Policy for unmarketed gas — always left in ground in v1. */
  unmarketedPolicy: UnmarketedPolicy
  /** Prices are a simulated 2015–2035 scenario, not historical accuracy. */
  priceModelLabel: string
}

export type Action =
  | { type: 'ACQUIRE_LEASE'; basinId: BasinId }
  | { type: 'DRILL_WELLS'; basinId: BasinId; count: number }
  | { type: 'BUY_TAKEAWAY'; basinId: BasinId; capacity: number }
  | { type: 'BOOK_LIQUEFACTION'; basinId: BasinId; capacity: number }
  /** Approve FID (commit). Starts multi-quarter construction — does not finish instantly. */
  | { type: 'PROGRESS_FID'; basinId: BasinId }
  | { type: 'BUY_SHIPPING'; capacity: number }
  | { type: 'SCHEDULE_CARGO'; basinId: BasinId; hub: HubId; volume: number }
  | { type: 'CLEAR_CARGOES' }
  | { type: 'END_QUARTER' }
  | { type: 'RESTART_CHAPTER' }
  | { type: 'REVEAL_HINT' }
  | { type: 'ANSWER_PREDICTION'; choice: 'yes' | 'no' }
  | { type: 'COMPLETE_CHAPTER' }
  | { type: 'START_NEXT_CHAPTER' }
  | { type: 'ENTER_SANDBOX' }
  | { type: 'DISMISS_INTRO' }

export interface ActionResult {
  ok: boolean
  state: GameState
  error?: string
}

export interface PurchasePreview {
  purpose: string
  plainLabel: string
  jargon: string | null
  price: number
  recurringCostPerMmbtu: number
  recurringNote: string
  completionTime: string
  expectedSalesDelta: number
  expectedCashDelta: number
  effectSummary: string
  blockedReason: string | null
}

export interface QuarterPreview {
  expectedSales: number
  potentialOutput: number
  unusedWellCapacity: number
  unusedTakeaway: number
  expectedRevenue: number
  expectedOpex: number
  expectedOperatingProfit: number
  investmentSpend: number
  closingCash: number
  bindingConstraint: ConstraintId
  priceMode: 'known'
  prices: HubPrices
  notes: string[]
}
