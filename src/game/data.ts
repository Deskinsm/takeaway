import type { BasinDef, BasinId, HubPrices } from './types.ts'

export const START_YEAR = 2015
export const START_QUARTER = 4 as const
export const END_YEAR = 2035
export const STARTING_CASH = 850_000_000

/** Unit opex ($/mmbtu) layered on top of realized hub price. */
export const OPEX = {
  production: 0.45,
  takeaway: 0.25,
  liquefaction: 0.9,
  shipping: 0.55,
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
    fidProgressPerAction: 25,
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
    fidProgressPerAction: 20,
    lngFeed: false,
    domesticHub: 'HH',
  },
  qatar: {
    id: 'qatar',
    name: 'Qatar North Field Feed',
    region: 'Middle East LNG',
    blurb: 'World-scale LNG feed. FID → liquefaction → shipping unlocks TTF/JKM.',
    leaseCost: 220_000_000,
    wellCost: 14_000_000,
    mmbtuPerWell: 2_200_000,
    takeawayUnitCost: 8,
    liquefactionUnitCost: 55,
    fidProgressPerAction: 20,
    lngFeed: true,
    domesticHub: null,
  },
  australia: {
    id: 'australia',
    name: 'Australia LNG Feed',
    region: 'NW Shelf / Gladstone concept',
    blurb: 'Long-haul JKM exposure. Shipping + FID are the usual bottlenecks.',
    leaseCost: 180_000_000,
    wellCost: 16_000_000,
    mmbtuPerWell: 1_800_000,
    takeawayUnitCost: 10,
    liquefactionUnitCost: 60,
    fidProgressPerAction: 20,
    lngFeed: true,
    domesticHub: null,
  },
}

export const INITIAL_PRICES: HubPrices = {
  HH: 2.65,
  TTF: 5.4,
  JKM: 6.1,
}

/** Winter (Q1/Q4) seasonal uplift by hub. */
export const SEASONALITY: Record<1 | 2 | 3 | 4, HubPrices> = {
  1: { HH: 0.35, TTF: 1.2, JKM: 1.0 },
  2: { HH: -0.15, TTF: -0.4, JKM: -0.25 },
  3: { HH: -0.2, TTF: -0.5, JKM: -0.35 },
  4: { HH: 0.25, TTF: 0.9, JKM: 0.75 },
}

export const GLOSSARY = {
  takeaway:
    'Pipeline capacity that moves gas out of a basin. Without takeaway, wells produce into a constraint (stranded gas).',
  basis:
    'Price difference between a hub (e.g. Henry Hub) and a local delivery point. Wide basis = takeaway stress.',
  FID: 'Final Investment Decision — board commitment that unlocks liquefaction build-out over several quarters.',
  mmbtu: 'Million British Thermal Units — standard gas energy unit. LNG cargoes and hub prices quote in $/mmbtu.',
  HH: 'Henry Hub — US natural gas benchmark (Louisiana).',
  TTF: 'Title Transfer Facility — European gas benchmark (Netherlands).',
  JKM: 'Japan Korea Marker — spot LNG benchmark for Northeast Asia.',
  cargo:
    'Scheduled LNG shipment to a hub. Diverting cargoes teaches arbitrage between TTF and JKM.',
} as const

export type GlossaryKey = keyof typeof GLOSSARY
