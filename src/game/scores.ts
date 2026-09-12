import type { GameState } from './types.ts'

/** Volume score: cumulative sold mmbtu scaled to a readable 0–100+ index. */
export function computeVolumeScore(cumulativeVolume: number): number {
  // ~50 Bcf (~50e6 mmbtu) ≈ score 50 early-game; grows without hard cap
  return Math.round((cumulativeVolume / 1_000_000) * 10) / 10
}

/**
 * Margin score: realized average net $/mmbtu × 10, floored display.
 * Diverges from volume when prices crash or gas is stranded (opex still burns).
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
