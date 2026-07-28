# Rank-Anchored Scarcity Values — Design

**Date:** 2026-07-28
**Status:** Approved

## Problem

The scarcity-adjusted rankings (`utils/vorp.ts`) order players purely by
`projectedPoints - replacementLevel`, where `projectedPoints` comes from
Sleeper projections. The active data source's ranking (Boris Chen expert
consensus, or ADP) is only used as a tie-breaker for exactly-equal values
and to order players with no projection at the bottom of the board.

This discards the expert-consensus signal that makes Boris Chen rankings
valuable. Projections are high-variance; when Sleeper projects Boris's RB2
above his RB1, the scarcity board flips them.

## Requirement

When scarcity mode is on, the board must never reorder players **within a
position** relative to the active data source's ranking. If the source has
Player A as RB1 and Player B as RB2, the scarcity board must never show B
above A. This applies to both data sources (Boris and ADP).

Cross-position reordering — the purpose of scarcity mode — must still work.

## Design

In `applyScarcityAdjustment`, permute each position's projection values so
they follow the source ranking's order before computing value over
replacement:

1. **Eligibility unchanged.** A player participates in valuation only if
   they have `projectedPoints` and their position has a replacement level.
   Players without projections still fall to the unvalued tail in
   source-rank order.
2. **Reassign values within each position.** Take the participating
   players' projection values, sort descending, and hand them back out in
   source-rank order: the source's RB1 gets the best RB projection value,
   RB2 the second-best, and so on.
3. **Everything downstream untouched.** Replacement levels
   (`computeReplacementLevels`), the VORP subtraction, value-gap tiers
   (`computeValueTiers`), and `pRank` assignment all operate on the same
   multiset of values per position — only which player carries which value
   changes.

### Why the invariant holds

Within a position, assigned values are non-increasing as source rank
increases. Equal values are broken by the existing
`a.player.rank - b.player.rank` tie-breaker. Therefore the final
descending-value sort can never place a lower-ranked player above a
higher-ranked one at the same position.

### Accepted trade-off

A player the source ranks high but projections dislike is promoted to the
value of that positional slot — the projection's opinion about that
specific player is discarded, keeping only its opinion about how valuable
the slot (e.g., "an RB3") is. This is the intended consequence of making
the source order authoritative within a position.

## Testing

Add cases to `tests/vorp.test.ts`:

- Projections that disagree with source order within a position → board
  order still follows source order.
- Cross-position reordering still occurs (e.g., a steep RB drop-off floats
  RBs above similarly-projected WRs).
- Players without projections still sink to the bottom in rank order.
- Replacement levels and tier boundaries are unchanged by the permutation
  (same value multiset per position).

## Out of scope

- Blending Boris rank into the value calculation (curve fitting, weighted
  averages).
- Using Boris tiers to drive scarcity tiers; tiers remain derived from
  value gaps.
- Any API or data-fetch changes; this is entirely client-side in
  `utils/vorp.ts`.
