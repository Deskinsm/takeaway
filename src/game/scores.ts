import type { GameState } from './types.ts'

/**
 * Volume score: cumulative SOLD mmbtu scaled to a readable index.
 * This is NOT reserves / resource — only gas that reached a buyer.
 */
export function computeVolumeScore(cumulativeVolume: number): number {
  return Math.round((cumulativeVolume / 1_000_000) * 10) / 10
}

/**
 * Margin score: realized average operating profit $/mmbtu.
 * Diverges from volume when prices crash or gas is left unmarketed (opex drag).
 */
export function computeMarginScore(cumulativeNet: number, cumulativeVolume: number): number {
  if (cumulativeVolume <= 0) return 0
  const realized = cumulativeNet / cumulativeVolume
  return Math.round(realized * 100) / 100
}

export function refreshScores(state: GameState): GameState {
  return {
    ...state,
    volumeScore: computeVolumeScore(state.cumulativeVolume),
    marginScore: computeMarginScore(state.cumulativeNet, state.cumulativeVolume),
  }
}

/** Guard for tests / UI — never treat volume score as reserves. */
export function scoreLabels(): { volume: string; margin: string } {
  return {
    volume: 'Cumulative sold volume index (not reserves)',
    margin: 'Realized operating profit $/MMBtu',
  }
}
