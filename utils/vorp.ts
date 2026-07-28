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

const TIER_GAP_MULTIPLIER = 3;
const MIN_TIER_GAP_POINTS = 4;
const TIER_SAMPLE_SIZE = 200;

/**
 * Assign 1-based tiers to a descending list of values. A new tier starts
 * wherever the drop to the next value exceeds a threshold derived from the
 * distribution (multiple of the median consecutive gap in the sample window),
 * floored so micro-gaps never fragment tiers.
 */
export function computeValueTiers(sortedValuesDesc: number[]): number[] {
  if (sortedValuesDesc.length === 0) return [];

  const sampleEnd = Math.min(sortedValuesDesc.length, TIER_SAMPLE_SIZE);
  const gaps: number[] = [];
  for (let i = 1; i < sampleEnd; i++) {
    gaps.push(sortedValuesDesc[i - 1] - sortedValuesDesc[i]);
  }
  gaps.sort((a, b) => a - b);

  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  const threshold = Math.max(
    MIN_TIER_GAP_POINTS,
    TIER_GAP_MULTIPLIER * medianGap
  );

  const tiers: number[] = [1];
  let tier = 1;
  for (let i = 1; i < sortedValuesDesc.length; i++) {
    if (sortedValuesDesc[i - 1] - sortedValuesDesc[i] > threshold) {
      tier += 1;
    }
    tiers.push(tier);
  }

  return tiers;
}

/**
 * Map of player id → anchored value. Within each position, the projection
 * values of players that have one are sorted descending and reassigned in
 * source-rank order, so the source ranking stays authoritative within a
 * position while projections only define its scarcity curve.
 */
function anchorValuesToRankOrder(players: Player[]): Map<string, number> {
  const anchored = new Map<string, number>();

  positionsList.forEach((pos) => {
    const group = players.filter(
      (p) => p.position === pos && p.projectedPoints !== undefined
    );
    const values = group.map((p) => p.projectedPoints!).sort((a, b) => b - a);

    group
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .forEach((p, i) => anchored.set(p.id, values[i]));
  });

  return anchored;
}

/**
 * Returns a NEW array of player copies ordered by value over replacement,
 * where each position's projection values are reassigned in source-rank
 * order so the source ranking is never reordered within a position. Tier
 * and pRank are recomputed for the adjusted order. Players without
 * projections (or whose position has no replacement level) go to the
 * bottom in original-rank order with no tier.
 */
export function applyScarcityAdjustment(
  players: Player[],
  rosterSize: Record<Position, number>,
  numTeams: number
): Player[] {
  const levels = computeReplacementLevels(players, rosterSize, numTeams);
  const anchoredValues = anchorValuesToRankOrder(players);

  const valued: { player: Player; value: number }[] = [];
  const unvalued: Player[] = [];

  players.forEach((player) => {
    const level = levels[player.position];
    const anchored = anchoredValues.get(player.id);
    if (anchored !== undefined && level !== undefined) {
      valued.push({ player, value: anchored - level });
    } else {
      unvalued.push(player);
    }
  });

  valued.sort((a, b) => b.value - a.value || a.player.rank - b.player.rank);
  unvalued.sort((a, b) => a.rank - b.rank);

  const tiers = computeValueTiers(valued.map((entry) => entry.value));

  const positionCounts: Partial<Record<Position, number>> = {};
  const takePositionRank = (pos: Position) => {
    positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
    return positionCounts[pos]!;
  };

  return [
    ...valued.map((entry, index) => ({
      ...entry.player,
      tier: tiers[index],
      pRank: takePositionRank(entry.player.position),
    })),
    ...unvalued.map((player) => ({
      ...player,
      tier: undefined,
      pRank: takePositionRank(player.position),
    })),
  ];
}
