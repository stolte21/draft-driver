# Sync Tiers Skill + Daily Routine — Design

Date: 2026-08-16
Status: Approved

## Problem

The rankings update workflow (regenerate tiers in the fftiers repo, sync CSVs into
`public/tiers/`, commit, push to deploy) was undocumented. Reconstructing it required
exploring two repos. The goal is a reusable Claude skill that encodes the workflow,
plus a daily scheduled routine that runs it automatically.

## Decisions

- **Skill**: project skill at `.claude/skills/sync-tiers/SKILL.md`, committed to this
  repo so the workflow is documented in-repo and available to any Claude session here.
- **Autonomy**: full auto when data changed. The routine commits and pushes (deploying
  via Vercel) only when the synced CSV content differs; a timestamp-only change in
  `metadata.json` is restored, not committed, to avoid noise deploys.
- **Failure handling**: any failing step (R script, output validation, tests) stops the
  run before commit/push; unattended runs send a push notification.
- **Schedule**: daily at 7:00 AM local, running in this repo's directory, invoking the
  skill. Runs locally because the R toolchain, fftiers repo, and FantasyPros API key
  exist only on this machine. A missed run (Mac asleep) is caught by the next run.
- **Docs**: short pointers in README.md and CLAUDE.md so the workflow is discoverable
  outside Claude.

## Out of scope

- Automating the per-season year bump in fftiers (documented in the skill instead).
- Any change to the fftiers repo itself.
