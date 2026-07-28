# Rank-Anchored Scarcity Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active data source's within-position order authoritative in scarcity-adjusted rankings; projections only supply each position's value curve.

**Architecture:** A new helper in `utils/vorp.ts` sorts each position's projection values descending and reassigns them to players in source-rank order. `applyScarcityAdjustment` uses those anchored values instead of each player's own projection when computing value over replacement. Replacement levels, tiering, and the unvalued tail are untouched (same value multiset per position). Players keep their own `projectedPoints` field for display.

**Tech Stack:** TypeScript, Vitest (`npm test` runs `vitest run`).

**Spec:** `docs/superpowers/specs/2026-07-28-rank-anchored-scarcity-design.md`

---

### Task 1: Rank-anchored value assignment

**Files:**
- Modify: `utils/vorp.ts` (helper + `applyScarcityAdjustment`, currently lines 103–145)
- Test: `tests/vorp.test.ts` (add tests to the `applyScarcityAdjustment` describe block; update the stale test at ~line 297)

Background for the implementer:
- `Player` (from `types/index.ts`) has `id: string`, `rank: number` (overall rank from the active data source), `pRank`, `position`, `projectedPoints?: number`, `tier?`.
- The test file has a `makePlayer(position, projectedPoints, rank?)` factory and a `position(pos, n, top, step)` helper that creates `n` players with descending points. The `applyScarcityAdjustment` describe block has its own `roster` const (`QB: 2, RB: 2, WR: 2, TE: 1`, rest 0).

- [ ] **Step 1: Write the failing tests**

Add these three tests inside the `describe('applyScarcityAdjustment', ...)` block in `tests/vorp.test.ts`:

```ts
it('never reorders players within a position relative to source rank', () => {
  const players = [
    makePlayer('RB', 180, 1), // source RB1, projections dislike him
    makePlayer('RB', 260, 2), // source RB2, projections love him
    makePlayer('RB', 200, 3),
    makePlayer('RB', 100, 4),
    ...position('WR', 6, 200, 10),
    ...position('QB', 6, 300, 5),
    ...position('TE', 6, 150, 8),
  ];

  const adjusted = applyScarcityAdjustment(players, roster, 2);

  const rbRanks = adjusted
    .filter((p) => p.position === 'RB')
    .map((p) => p.rank);
  expect(rbRanks).toEqual([1, 2, 3, 4]);
});

it("keeps each player's own projectedPoints for display", () => {
  const players = [makePlayer('QB', 250, 1), makePlayer('QB', 300, 2)];

  const adjusted = applyScarcityAdjustment(players, roster, 1);

  // Rank 1 is anchored to the better value (300) and sorts first, but
  // still displays his own projection of 250.
  expect(adjusted[0].rank).toBe(1);
  expect(adjusted[0].projectedPoints).toBe(250);
  expect(adjusted[1].projectedPoints).toBe(300);
});

it('permuting projections within a position does not change the board', () => {
  const ranksAndTiers = (list: Player[]) =>
    list.map((p) => ({ rank: p.rank, tier: p.tier }));

  const base = [
    makePlayer('RB', 300, 1),
    makePlayer('RB', 200, 2),
    makePlayer('RB', 100, 3),
    makePlayer('WR', 250, 4),
    makePlayer('WR', 150, 5),
  ];
  // Same ranks, same value pool — projections shuffled among the RBs
  const shuffled = [
    makePlayer('RB', 100, 1),
    makePlayer('RB', 300, 2),
    makePlayer('RB', 200, 3),
    makePlayer('WR', 250, 4),
    makePlayer('WR', 150, 5),
  ];
  // Reset ids/names diverging is fine — compare only rank and tier.
  expect(ranksAndTiers(applyScarcityAdjustment(shuffled, roster, 1))).toEqual(
    ranksAndTiers(applyScarcityAdjustment(base, roster, 1))
  );
});
```

Then **replace** the existing stale test `'recomputes contiguous positional ranks in the new order'` (it asserts the old projections-flip-QBs behavior, which this change removes) with:

```ts
it('recomputes contiguous positional ranks in the new order', () => {
  const players = [
    makePlayer('QB', 250, 1),
    makePlayer('QB', 240, 2),
    makePlayer('RB', 300, 3),
    makePlayer('RB', 100, 4),
  ];

  const adjusted = applyScarcityAdjustment(players, roster, 1);

  // RB1's huge value floats him above both QBs (cross-position movement
  // still works); pRank stays contiguous per position in the new order.
  expect(adjusted.map((p) => p.position)).toEqual(['RB', 'QB', 'QB', 'RB']);
  expect(adjusted.map((p) => p.pRank)).toEqual([1, 1, 2, 2]);
});
```

Hand-check of that arithmetic (1 team, roster QB:2/RB:2): QB replacement = 240, RB replacement = 100. VORPs: RB rank 3 → 200, QB rank 1 → 10, QB rank 2 → 0, RB rank 4 → 0; the 0-0 tie breaks by rank (2 before 4).

- [ ] **Step 2: Run the tests to verify the three new ones fail**

Run: `npm test`
Expected: `'never reorders players within a position relative to source rank'`, `"keeps each player's own projectedPoints for display"`, and `'permuting projections within a position does not change the board'` FAIL (wrong order/values). The replaced `'recomputes contiguous positional ranks in the new order'` also FAILS. All other tests PASS.

- [ ] **Step 3: Implement the anchoring helper and wire it in**

In `utils/vorp.ts`, add above `applyScarcityAdjustment`:

```ts
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
```

Then in `applyScarcityAdjustment`, compute the map after the levels and use it in the eligibility branch. Replace:

```ts
  const levels = computeReplacementLevels(players, rosterSize, numTeams);

  const valued: { player: Player; value: number }[] = [];
  const unvalued: Player[] = [];

  players.forEach((player) => {
    const level = levels[player.position];
    if (player.projectedPoints !== undefined && level !== undefined) {
      valued.push({ player, value: player.projectedPoints - level });
    } else {
      unvalued.push(player);
    }
  });
```

with:

```ts
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
```

(`anchoredValues.get(player.id)` is defined exactly when `player.projectedPoints` is, so the unvalued-tail behavior is unchanged.)

Also update the `applyScarcityAdjustment` doc comment (lines 97–102) to mention anchoring, e.g. change the first sentence to: `Returns a NEW array of player copies ordered by value over replacement, where each position's projection values are reassigned in source-rank order so the source ranking is never reordered within a position.`

- [ ] **Step 4: Run the full test suite to verify everything passes**

Run: `npm test`
Expected: all tests PASS, including the pre-existing cross-position tests (`'re-orders by value over replacement, not raw points'`, `'lifts QBs when roster demands two of them'`, `'breaks value ties by original rank'`, `'sends players without projections to the bottom in rank order'`, `'does not mutate the input players'`).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add utils/vorp.ts tests/vorp.test.ts
git commit -m "feat(vorp): anchor scarcity values to source-rank order within positions"
```

---

### Task 2: Manual verification in the app

**Files:** none modified — browser verification only.

- [ ] **Step 1: Start the dev server and open the board**

Start the dev server (browser preview tooling, `npm run dev` config) and open the app.

- [ ] **Step 2: Verify the invariant on the live board**

With data source = Boris Chen and Scarcity-Adjusted Rankings ON, confirm on the board that within every position the players appear in strictly increasing source order (e.g., filter to RB: positional order matches Boris's RB order), while positions are still interleaved by scarcity. Toggle the setting OFF and confirm the original board is unchanged.

- [ ] **Step 3: Screenshot proof**

Capture a screenshot of the scarcity board showing interleaved positions for the user.
