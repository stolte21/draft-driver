# Draft Driver

**Live app: [draft-driver.vercel.app](https://draft-driver.vercel.app)**

A free fantasy football draft tool built around a tier-based draft board.
Track your draft in real time: mark players as drafted, favorite or avoid
them, keep per-player notes, and watch your roster fill up by position.

![draft-driver](https://user-images.githubusercontent.com/3914543/185001004-0ec2dee4-6482-425b-adf9-a8bdcbca0ac8.png)

## Data sources

- **Rankings & tiers** — [Boris Chen](https://www.borischen.co)'s tiers,
  generated from FantasyPros expert consensus rankings
- **Projections, ADP, teams, rookie & injury status** — the
  [Sleeper](https://sleeper.com) API, cached in-memory for 24 hours

## Features

- Tier-based draft board for **standard, PPR, and half-PPR** scoring
- Player search and position filtering
- Favorites, avoid list, per-player notes, and keeper support
- Roster tracking by position with automatic flex/bench handling
- **Scarcity-adjusted rankings** — optionally re-order the board by value
  over replacement (VORP) computed from your league and roster settings
- Injury status indicators and player news
- NFL team depth charts
- Light and dark modes; works great on mobile
- Progress saved automatically to your browser — no account needed

## Development

```bash
npm install
npm run dev    # start the dev server
npm test       # run unit tests (vitest)
npm run lint   # eslint
npm run build  # production build
```

## Updating rankings

Tier data in `public/tiers/` comes from a local checkout of the
[fftiers](https://github.com/borisachen/fftiers) project. To refresh it:

```bash
Rscript ~/projects/fftiers/src/main.R t   # regenerate tiers from FantasyPros
npm run sync-tiers                        # copy CSVs into public/tiers/
```

Then commit and push the `public/tiers/` changes to deploy. The full runbook
(validation, commit rules, per-season maintenance) lives in
[.claude/skills/sync-tiers/SKILL.md](.claude/skills/sync-tiers/SKILL.md), which
Claude Code runs as the `/sync-tiers` skill on a daily schedule.
`FFTIERS_CSV_DIR` overrides the source directory; `TIERS_SOURCE=s3` makes the
app read from the public S3 mirror instead of local files.
