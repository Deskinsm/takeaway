/** Hub price markers for gas/LNG. */
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

export type TabId = 'command' | 'field' | 'midstream' | 'market'

export interface BasinDef {
  id: BasinId
  name: string
  region: string
  /** Short teaching blurb. */
  blurb: string
  leaseCost: number
  wellCost: number
  /** Potential production per completed well, mmbtu / quarter. */
  mmbtuPerWell: number
  /** Cost to buy 1 mmbtu/q of pipeline takeaway. */
  takeawayUnitCost: number
  /** Cost to book 1 mmbtu/q liquefaction slot (or FID tranche). */
  liquefactionUnitCost: number
  /** FID progress points gained per FID action (0–100). */
  fidProgressPerAction: number
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
  /** 0–100; at 100 liquefaction capacity can be commissioned. */
  fidProgress: number
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
  produced: number
  sold: number
  stranded: number
  revenue: number
  opex: number
  netCash: number
  bindingConstraint: ConstraintId
  constraintBreakdown: Record<Exclude<ConstraintId, 'none' | 'hub_price'>, number>
  prices: HubPrices
  notes: string[]
}

export interface GameState {
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
  /** Cumulative sold mmbtu (volume score input). */
  cumulativeVolume: number
  /** Cumulative net margin $ (margin score input). */
  cumulativeNet: number
  volumeScore: number
  marginScore: number
  bindingConstraint: ConstraintId
  lastResult: QuarterResult | null
  log: string[]
  gameOver: boolean
  turn: number
}

export type Action =
  | { type: 'ACQUIRE_LEASE'; basinId: BasinId }
  | { type: 'DRILL_WELLS'; basinId: BasinId; count: number }
  | { type: 'BUY_TAKEAWAY'; basinId: BasinId; capacity: number }
  | { type: 'BOOK_LIQUEFACTION'; basinId: BasinId; capacity: number }
  | { type: 'PROGRESS_FID'; basinId: BasinId }
  | { type: 'BUY_SHIPPING'; capacity: number }
  | { type: 'SCHEDULE_CARGO'; basinId: BasinId; hub: HubId; volume: number }
  | { type: 'CLEAR_CARGOES' }
  | { type: 'END_QUARTER' }

export interface ActionResult {
  ok: boolean
  state: GameState
  error?: string
}
