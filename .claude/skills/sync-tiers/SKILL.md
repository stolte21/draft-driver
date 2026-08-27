---
name: sync-tiers
description: Use when asked to update, refresh, or sync player rankings or tiers, when rankings data is stale, or when the daily scheduled rankings update runs.
---

# Sync Tiers

Refresh Boris Chen-style tier rankings from the local fftiers repo into draft-driver, and deploy if the data changed.

## Steps

Run steps in order. If any step fails, STOP: do not sync, commit, or push partial state. Report the failing step and its output; if running unattended (scheduled), also send a push notification.

1. **Regenerate tiers.** Runtime is highly variable — usually a few minutes, but it has
   taken 17+ minutes (it downloads from FantasyPros). **Run it in the background and poll
   the log; do not run it in the foreground**, where a tool timeout will kill it mid-run.

   ```bash
   date +%s > /tmp/fftiers-start
   nohup Rscript /Users/stolte/projects/fftiers/src/main.R t > /tmp/fftiers.log 2>&1 &
   ```

   Then poll until the process exits (`ps -p <pid>` empty) — check every couple of minutes.
   Done = the log's last echoed statement is the final `draw.tiers`/`if (thisweek > 0)`
   block from `src/main.R`. Treat as failure: `grep -iE "^Error|cannot open|Execution halted" /tmp/fftiers.log`
   matching anything.

   `t` downloads fresh FantasyPros data; `f` re-clusters existing data without downloading.
   (`~/projects/fftiers` and `~/dev/fftiers` are the same repo; see Operational notes.)
   The R transcript is noisy — ggplot warnings like "Scale for colour is already present"
   are normal. Step 2 catches silent failures.

2. **Validate output** in `~/dev/fftiers/out/current/csv/`. All three of `weekly-ALL.csv`, `weekly-ALL-PPR.csv`, `weekly-ALL-HALF-PPR.csv` must:
   - have an mtime **newer than the `/tmp/fftiers-start` stamp** from step 1. Do not check
     "within the last few minutes" — a long run plus polling can leave the first-written
     file (`weekly-ALL.csv`, written early) well over an hour old by the time you validate,
     and the three files legitimately differ by 15+ minutes from each other.
   - have 201 lines (header + 200 players); more than a few lines off is a failure
   - start with the header `"Rank","Player.Name","Tier","Position",...`

3. **Sync into the app** (from the draft-driver root):
   ```bash
   npm run sync-tiers
   ```

4. **Run tests**: `npm test` — all must pass.

5. **Commit gate** — check `git diff --name-only public/tiers`:
   - Any `weekly-ALL*.csv` changed → commit all `public/tiers` changes on `main` as `chore(tiers): sync rankings from fftiers (YYYY-MM-DD)` and push (push deploys via Vercel).
   - Only `metadata.json` changed (rankings identical, timestamp bumped) → restore it with `git checkout -- public/tiers/metadata.json` and report "rankings unchanged, nothing deployed". Do not commit timestamp-only changes.
   - Empty diff → nothing to do; report "rankings unchanged".

## Operational notes

- `~/projects/fftiers` is a load-bearing symlink to `~/dev/fftiers`; paths inside the R code are hardcoded to it. Never remove it.
- fftiers prerequisites (already installed): R with `mclust` + `ggplot2`, python3, curl, and `api_key.py` at the fftiers root holding a live FantasyPros API key. That file is gitignored — never commit it.
- The week number is computed from the date (week 0 = pre-draft). No per-week config needed.
- **Season bump** (each summer): the year is hardcoded in fftiers `src/main.R` (`year`, `weekonetuesday`, `datdir`) and `src/ff-functions.R` (several lines). Grep both files for the previous year.
- The app reads `public/tiers/*.csv` in [utils/boris.ts](../../../utils/boris.ts); `metadata.json`'s `syncedAt` becomes the `x-rankings-last-modified` header and drives the stale-rankings banner.

## Common mistakes

- **Running `npm run sync-tiers` without step 1 first**: it copies whatever is in `out/current/csv/` and stamps a fresh `syncedAt`, making stale data look current. Always regenerate first.
- **Running the R script in the foreground**: it can exceed a 10 minute tool timeout and get killed partway. Always background it and poll (step 1).
- **Assuming a killed R run left nothing behind**: it is recoverable and diagnosable. `src/main.R` `rm`s `out/current/csv/*` near the top, so if the old CSVs survive with their pre-run mtime, it died before regenerating anything and no data was lost. Re-run step 1.
- Committing when only `metadata.json` changed: triggers a pointless deploy every run.
- Pointing at `out/week<N>/csv/`: those are archives with different filenames; the sync script reads `out/current/csv/` only.
