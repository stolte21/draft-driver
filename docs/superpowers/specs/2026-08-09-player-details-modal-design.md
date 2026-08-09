# Player Details Modal — Design

**Date:** 2026-08-09
**Status:** Approved

## Goal

Add a "View Player Details" action to the player action menu (the Chakra `Menu`
on each draft-board ranking row) that opens a modal with full information about
the player: photo, team, position, jersey number, bye week, age, height/weight,
college, years pro, year drafted, current injury status, and recent news.

## Data source decision

All data comes from Sleeper. Verified during research (2026-08-09):

| Need | Source | Notes |
| --- | --- | --- |
| Bio (team, position, number, age, birth date, height, weight, college, years_exp, rookie_year, status, depth chart) | `GET https://api.sleeper.app/v1/players/nfl` | ~14MB blob, already fetched and cached 24h by the depth-charts feature |
| Current injury | Same blob (`injury_status`, `injury_body_part`, `injury_notes`, `injury_start_date`) | |
| Photo | `https://sleepercdn.com/content/nfl/players/{player_id}.jpg` | Verified 200/JPEG; `thumb/` variant exists. DSTs use `https://sleepercdn.com/images/team_logos/nfl/{team_lowercase}.png` |
| Bye week | `GET https://api.sleeper.app/schedule/nfl/regular/{season}` | Undocumented but live for 2026; bye = missing week 1–18 per team |
| Recent news | `POST https://sleeper.com/graphql`, query `get_player_news(sport, player_id, limit)` | Undocumented, no auth. Returns title, description, analysis, source, url, published. Must degrade gracefully |

Rejected alternatives:

- **Sleeper + ESPN** for news/injury history: `espn_id` is null for 277 of the
  top 487 fantasy-relevant Sleeper players (including top-5 picks), and ESPN's
  per-athlete injuries endpoint returned nothing in testing.
- **On-demand scraping** (FantasyPros, ESPN pages): FantasyPros login-gates its
  data (its scraper was removed from this repo in 2026); HTML scraping is slow,
  brittle, and ToS-risky. Sleeper covers everything except multi-year injury
  history via JSON endpoints.

**Out of scope:** multi-year injury history. No free, reliable source exists.
The modal shows the current injury plus recent news (which covers injury
stories in practice).

## Architecture

### Shared Sleeper players module

Extract the players-blob fetch from `utils/depthCharts.ts` into a new
`utils/sleeperPlayers.ts`:

- Keeps the existing behavior: `cached()` 24h in-memory cache, dev-only disk
  cache at `.cache/sleeper-players.json`.
- Widens the kept fields to: `player_id`, `full_name`, `team`, `position`,
  `number`, `age`, `birth_date`, `height`, `weight`, `college`, `years_exp`,
  `metadata.rookie_year`, `status`, `injury_status`, `injury_body_part`,
  `injury_notes`, `injury_start_date`, `depth_chart_position`,
  `depth_chart_order`, `active`.
- `utils/depthCharts.ts` consumes this module instead of fetching itself.

### New API route: `GET /api/player-details`

Query params: `name` (display name), `position` (QB/RB/WR/TE/K/DST).

- Matches against the blob by normalized name + position, using the same
  normalization as the projections merge (`Player.id` is name-derived, so
  name+position is the join key).
- DST records in the blob are keyed by team abbreviation and match via team.
- Bye week: schedule fetched via `cached()` (24h, key includes season year);
  per-team bye derived as the missing week 1–18.
- News: GraphQL `get_player_news` with `limit: 5`, cached ~1h per player via
  `cached()`. Any failure (endpoint change, timeout, non-200) → `news: []`,
  never fails the route. Proxying server-side keeps the undocumented call out
  of the browser and avoids CORS.
- No blob match → 404.

Response shape:

```ts
interface PlayerDetails {
  playerId: string;
  name: string;
  team: string | null;
  position: string;
  number: number | null;
  age: number | null;
  birthDate: string | null;
  heightIn: number | null;   // blob height is inches as string
  weightLb: number | null;
  college: string | null;
  yearsExp: number | null;
  rookieYear: number | null; // year drafted, from metadata.rookie_year
  status: string | null;     // Active, Inactive, Injured Reserve, ...
  depthChartPosition: string | null;
  depthChartOrder: number | null;
  injury: {
    status: string;
    bodyPart: string | null;
    notes: string | null;
    startDate: string | null;
  } | null;
  byeWeek: number | null;
  photoUrl: string;
  news: {
    title: string;
    description: string | null;
    analysis: string | null;
    source: string;
    url: string | null;
    published: number; // epoch ms
  }[];
}
```

### Client

- **Menu item:** fifth `MenuItem`, "View Player Details", in
  `components/DraftBoard/DraftBoardRankingRow.tsx`, wired like Add/Edit Note:
  calls `props.data.onViewDetails(player)`.
- **State:** `DraftBoardList` adds a nullable `detailsPlayer` state alongside
  `notePlayer`, passes `onViewDetails` through `itemData`, and renders the
  modal (rankings variant only, like the note modal).
- **`components/DraftBoard/PlayerDetailsModal.tsx`:** copies
  `PlayerNoteModal`'s structure — nullable-player `isOpen`, the
  `displayPlayer` trick to keep content during the close animation,
  `size={['xs','sm','lg']}`, `scrollBehavior="inside"`.
- **`hooks/usePlayerDetails.ts`:** react-query, `enabled: !!player`,
  `staleTime` 1h, keyed by name+position.
- **Layout:** header with photo (fallback to initials avatar on image error) +
  name / team / position / number; injury badge when `injury` is present; stat
  grid (age, height/weight, college, years pro, drafted year, bye week,
  depth-chart slot); news list (title, source, relative date, description,
  external link). Skeletons while loading; on 404, show the fields already on
  the `Player` row plus a "no additional details found" note.

## Error handling

- Blob fetch failure: route 502s; modal shows the fallback state.
- News failure: silent — `news: []`, section hidden.
- Schedule failure or missing season: `byeWeek: null`, row hidden.
- Photo 404: Chakra `Avatar` initials fallback.

## Testing

- Unit tests for bye-week derivation from a schedule fixture.
- Unit tests for name+position → blob record matching (incl. DST and
  punctuation/suffix names like "Ja'Marr Chase", "Kenneth Walker III").
- Route merge logic lives in utils so it is testable without HTTP mocking of
  the handler itself; follows existing `tests/` setup.
