# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start the Next.js development server
- `npm run build` - Build the production application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## Project Architecture

This is a Next.js fantasy football draft tool that helps users draft players by providing rankings and managing roster construction.

### Core Data Flow

1. **Data Sources**: Boris Chen's tiers/rankings (`utils/boris.ts`) are the
   only rankings source. Sleeper API season projections
   (`utils/projections.ts`) are merged in as an enhancement — they provide
   `projectedPoints`, ADP per format, teams, and rookie flags; cached
   in-memory for 24h (`utils/cache.ts`). (FantasyPros scraping was removed
   in 2026 — the site login-gates its data.)

2. **API Layer**: `/api/rankings.ts` serves player data by:
   - Validating format (standard/ppr/half-ppr)
   - Fetching Boris Chen rankings
   - Merging team data, ADP, and rookie status from Sleeper projections
   - Adding missing kickers/defenses from Sleeper projections

3. **State Management**: Uses React Context with useReducer pattern:
   - `DraftProvider` manages draft state (drafted players, roster, favorites,
     avoided players, per-player notes, keepers). Favorites and avoided are
     mutually exclusive — toggling one strips the id from the other list.
     Notes are a `Record<playerId, string>`; setting an empty/whitespace
     note deletes it. The reducer lives in `providers/draftReducer.ts`
     (unit tested in `tests/draftReducer.test.ts`).
   - `SettingsProvider` manages app configuration (format, roster sizes) —
     no longer tracks a data source
   - State is persisted to localStorage automatically

### Key Components

- **DraftBoard**: Virtual scrolling table displaying player rankings with filtering
- **Roster**: Shows current team construction organized by position
- **Settings**: Modal for configuring league format and roster sizes

### Position Management

- Standard positions: QB, RB, WR, TE, K, DST
- Special positions: FLX (flex), BN (bench)
- Roster construction automatically moves excess players to flex/bench based on configured roster sizes
- When the "Scarcity-Adjusted Rankings" setting is on, the draft board re-orders
  players client-side by value over replacement (`utils/vorp.ts`) using the roster
  configuration and league size, and recomputes tiers from value gaps

### Data Types

Core types in `types/index.ts`:
- `Player` - Basic player with rank, position, team
- `RosteredPlayer` - Player with round/pick info when added to roster
- `Format` - Scoring system (standard/ppr/half-ppr)

### Styling

Uses Chakra UI with custom theme in `styles/theme.ts`. Supports light/dark mode switching.