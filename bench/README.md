# Harbor file-reader benchmark

Before is `baseline`: no skill, no hook, no file-reader. Claude may read the corpus freely.

After is `current`: `agents/file-reader.md`, `skills/opus-plan-cache`, and `hooks/gate-parent-reads.mjs`, copied into a temp workspace at run time. The run loads project settings only, so a hook installed in your user Cursor config stays out of the measurement.

A pass means after quality stays within 5 points of before, parent file bytes go down, and `current` calls `file-reader`. If `current` never delegates, that is a harness failure.

Token cards show Claude and Grok input, output, cache read, and cache write. Input includes cache reads. Unattributed tokens appear only when they are non-zero, and a total card sums the buckets. Runs saved before `medianUsage` existed show "no usage data". Tokens are reported and are not part of the pass rule.

`forbiddenFacts` is a strict decoy check: mentioning the decoy only to reject it still counts as a hit.

`parentMode` in `bench/config.json` is `"plan"` or `"agent"`. The runner starts in that mode. If a plan-mode system event does not list the `task` tool, that task is rerun in agent mode and the rest of the run stays there.

`BENCH_STATE_ROOT` is the directory that holds each task's SDK store. The default is `~/.hb`. Each task gets a short subdirectory there so `store.db-journal` stays under the Windows path limit, and the runner deletes it when the task finishes.

`BENCH_WORK_ROOT` is the parent of the temp corpus workspace. The default is the OS temp directory. Workspaces use the prefix `hb-`.

`strict` (`bench/variants/strict/`) is `current` plus `disallowedTools: ["read"]` on the parent, an upper bound on how little the parent can read.

## Start here

Offline. No API key. Checks the hook and the scorer, including the before/after comparison:

```bash
npm test
```

Live before/after. Put `CURSOR_API_KEY=...` in `.env` at the repo root (that file stays gitignored). The parent model is `claude-opus-5-5` with `parentEffort` `medium` in `bench/config.json`. The runner checks that id against `Cursor.models.list()` and selects the medium variant from that model's parameters. It resolves `model: grok-4.7-medium` in `agents/file-reader.md` the same way, and stops if that id is not in the Grok list.

First live check is smoke: 4 tasks, 1 repeat, both variants.

```bash
npm run bench:smoke
```

The default comparison, once smoke is not a harness failure, is core: 12 tasks, both variants.

```bash
npm run bench -- --variant baseline --variant current --tier core
```

Then open `bench/dashboard/index.html`. Results stay gitignored. The page reads `bench/dashboard/results.js`, which the runner writes next to it.

The terminal prints one block after a pair exists for that tier: before quality and bytes, after quality and bytes, the deltas, and pass or fail.
