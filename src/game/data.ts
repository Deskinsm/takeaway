import type { BasinDef, BasinId, HubPrices } from './types.ts'

export const SAVE_VERSION = 2

export const START_YEAR = 2015
export const START_QUARTER = 4 as const
export const END_YEAR = 2035
export const STARTING_CASH = 850_000_000
export const LEARN_STARTING_CASH = 400_000_000

/** Unit opex ($/mmbtu) layered on top of realized hub price. */
export const OPEX = {
  production: 0.45,
  takeaway: 0.25,
  liquefaction: 0.9,
  shipping: 0.55,
  /** Extra haul cost for JKM vs TTF so netback differs. */
  jkmPremium: 0.35,
} as const

export const SHIPPING_UNIT_COST = 12_000_000 // per 1e6 mmbtu/q (~1 mtpa-ish abstract)

export const BASIN_DEFS: Record<BasinId, BasinDef> = {
  permian: {
    id: 'permian',
    name: 'Permian Gas',
    region: 'US Midland / Delaware',
    blurb: 'Associated & dry gas. Often takeaway-bound before wells.',
    leaseCost: 120_000_000,
    wellCost: 8_500_000,
    mmbtuPerWell: 1_200_000,
    takeawayUnitCost: 18,
    liquefactionUnitCost: 45,
    fidConstructionQuarters: 3,
    liquefactionConstructionQuarters: 2,
    lngFeed: false,
    domesticHub: 'HH',
  },
  haynesville: {
    id: 'haynesville',
    name: 'Haynesville',
    region: 'US Gulf Coast dry gas',
    blurb: 'High EUR wells; historically pipeline-constrained to Gulf LNG.',
    leaseCost: 95_000_000,
    wellCost: 9_200_000,
    mmbtuPerWell: 1_450_000,
    takeawayUnitCost: 22,
    liquefactionUnitCost: 40,
    fidConstructionQuarters: 3,
    liquefactionConstructionQuarters: 2,
    lngFeed: false,
    domesticHub: 'HH',
  },
  qatar: {
    id: 'qatar',
    name: 'Qatar North Field Feed',
    region: 'Middle East LNG',
    blurb: 'World-scale LNG feed. FID → construction → liquefaction → shipping unlocks exports.',
    leaseCost: 220_000_000,
    wellCost: 14_000_000,
    mmbtuPerWell: 2_200_000,
    takeawayUnitCost: 8,
    liquefactionUnitCost: 55,
    fidConstructionQuarters: 4,
    liquefactionConstructionQuarters: 2,
    lngFeed: true,
    domesticHub: null,
  },
  australia: {
    id: 'australia',
    name: 'Australia LNG Feed',
    region: 'NW Shelf / Gladstone concept',
    blurb: 'Long-haul Asia exposure. Shipping + FID construction are the usual bottlenecks.',
    leaseCost: 180_000_000,
    wellCost: 16_000_000,
    mmbtuPerWell: 1_800_000,
    takeawayUnitCost: 10,
    liquefactionUnitCost: 60,
    fidConstructionQuarters: 4,
    liquefactionConstructionQuarters: 2,
    lngFeed: true,
    domesticHub: null,
  },
}

export const INITIAL_PRICES: HubPrices = {
  HH: 2.65,
  TTF: 5.4,
  JKM: 6.1,
}

/** Winter (Q1/Q4) seasonal uplift by hub — simulated scenario, not history. */
export const SEASONALITY: Record<1 | 2 | 3 | 4, HubPrices> = {
  1: { HH: 0.35, TTF: 1.2, JKM: 1.0 },
  2: { HH: -0.15, TTF: -0.4, JKM: -0.25 },
  3: { HH: -0.2, TTF: -0.5, JKM: -0.35 },
  4: { HH: 0.25, TTF: 0.9, JKM: 0.75 },
}

export const PRICE_MODEL_LABEL =
  'Simulated 2015–2035 price scenario (seasonality + noise) — not historical accuracy.'

export const GLOSSARY = {
  takeaway:
    'Pipeline capacity that moves gas out of a basin to buyers. Plain label: increase pipeline capacity. Without takeaway, wells cannot sell — gas is left in the ground.',
  basis:
    'Price difference between a hub (e.g. Henry Hub) and a local delivery point. Wide basis = takeaway stress.',
  FID: 'Final Investment Decision — board commitment (approve the investment) that starts multi-quarter construction. Clicking FID again does not finish the project early.',
  mmbtu:
    'MMBtu = one million British Thermal Units — a standard gas energy unit. Hub prices are in $/MMBtu. Tutorial volumes often show as “1 million MMBtu per quarter.”',
  HH: 'Henry Hub — US natural gas benchmark (Louisiana). Domestic pipeline sales land here. Think: US Gulf Coast buyers.',
  TTF: 'Title Transfer Facility — European gas benchmark (Netherlands). Think: Northwest Europe customers.',
  JKM: 'Japan Korea Marker — spot LNG benchmark for Northeast Asia. Think: Japan / Korea customers.',
  cargo:
    'Schedule an LNG shipment (nominate cargo) to a customer region. Diverting cargoes teaches arbitrage between Europe and Asia.',
  netback:
    'Netback = destination price minus the costs to get gas there (transport, liquefaction, shipping). A higher hub price is not always better if costs eat the difference.',
  upstream: 'Upstream: finding and producing gas (leases, wells). You own these assets or pay to drill.',
  midstream:
    'Midstream: moving and processing gas (pipelines / takeaway, liquefaction plants). Often purchased capacity rather than owned pipes.',
  downstream:
    'Downstream: selling to customers / hubs. You earn only when gas reaches a buyer.',
  revenue: 'Money from gas sold this quarter (price × volume).',
  operating_profit:
    'Operating profit = revenue − operating costs (opex). Does not include capital investment spend.',
  cash: 'Cash on hand. Goes down when you invest (wells, takeaway, FID) and up when operating profit is positive.',
  liquefaction:
    'Cooling natural gas into LNG (liquid) so it can ship by tanker. Plain label: reserve space at an LNG plant.',
  LNG: 'Liquefied Natural Gas — natural gas cooled to a liquid for long-distance ship transport. Introduced after domestic pipeline sales in Learn mode.',
} as const

export type GlossaryKey = keyof typeof GLOSSARY

/** Unit opex path costs for netback teaching. */
export function unitOpexForHub(hub: 'HH' | 'TTF' | 'JKM'): number {
  if (hub === 'HH') return OPEX.production + OPEX.takeaway
  if (hub === 'TTF') return OPEX.production + OPEX.takeaway + OPEX.liquefaction + OPEX.shipping
  return OPEX.production + OPEX.takeaway + OPEX.liquefaction + OPEX.shipping + OPEX.jkmPremium
}

export function netback(price: number, hub: 'HH' | 'TTF' | 'JKM'): number {
  return Math.round((price - unitOpexForHub(hub)) * 100) / 100
}
