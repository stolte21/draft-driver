import { Player, Position } from 'types';
import { flexPositionsList, positionsList } from 'utils';

export type ReplacementLevels = Partial<Record<Position, number>>;

/**
 * Replacement level per position: the projected points of the last starter,
 * where starters = rosterSize × numTeams and each FLX slot is handed to
 * whichever flex-eligible position has the highest-projected next player.
 * Bench slots are intentionally ignored (v1 simplification, see spec).
 */
export function computeReplacementLevels(
  players: Player[],
  rosterSize: Record<Position, number>,
  numTeams: number
): ReplacementLevels {
  const pointsByPosition: Partial<Record<Position, number[]>> = {};
  positionsList.forEach((pos) => {
    pointsByPosition[pos] = players
      .filter((p) => p.position === pos && p.projectedPoints !== undefined)
      .map((p) => p.projectedPoints!)
      .sort((a, b) => b - a);
  });

  const starters: Partial<Record<Position, number>> = {};
  positionsList.forEach((pos) => {
    starters[pos] = rosterSize[pos] * numTeams;
  });

  const flexSlots = rosterSize.FLX * numTeams;
  for (let slot = 0; slot < flexSlots; slot++) {
    let bestPos: Position | null = null;
    let bestPoints = -Infinity;

    for (const pos of flexPositionsList) {
      const next = pointsByPosition[pos]?.[starters[pos]!];
      if (next !== undefined && next > bestPoints) {
        bestPoints = next;
        bestPos = pos;
      }
    }

    if (bestPos === null) break;
    starters[bestPos]! += 1;
  }

  const levels: ReplacementLevels = {};
  positionsList.forEach((pos) => {
    const pool = pointsByPosition[pos]!;
    if (pool.length === 0) return;

    const lastStarterIndex = Math.max(starters[pos]! - 1, 0);
    levels[pos] = pool[Math.min(lastStarterIndex, pool.length - 1)];
  });

  return levels;
}
