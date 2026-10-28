# opus-grok-orch

A Cursor setup that keeps raw file contents out of Claude's context (a Grok `file-reader` subagent, a skill and a gating hook), plus a benchmark ("Harbor") that compares it against a baseline. Details in `bench/README.md`.

## Setup
- `npm install` (Node with built-in TypeScript running, as the scripts run `.ts` files directly).
- Live benchmark runs need `CURSOR_API_KEY` in a root `.env` (gitignored). Never commit it.

## Commands (`package.json`)
- `npm test` - offline; checks the hook and the scorer.
- `npm run bench:smoke` - live, 4 tasks, 1 repeat, both variants.
- `npm run bench` - full runner (`-- --variant baseline --variant current --tier core` for the default comparison).
- `npm run generate:corpus` / `npm run typecheck:corpus` - build and typecheck the benchmark corpus.

## Where things live
- `agents/file-reader.md` - the Grok subagent. `skills/opus-plan-cache/` - skill. `hooks/` + `hooks.json` - pre-tool-use gate on Read and Shell.
- `bench/src/` - runner, scorer, tests. `bench/config.json`, `bench/tasks`, `bench/variants`, `bench/corpus`, `bench/dashboard`.
- `.cursor/plans/` - saved plans.

## Gotchas
- Env knobs: `BENCH_STATE_ROOT` (default `~/.hb`) and `BENCH_WORK_ROOT` (default OS temp dir).
- Model ids in `bench/config.json` and `agents/file-reader.md` are checked against the live model list; the runner stops if one is missing.
