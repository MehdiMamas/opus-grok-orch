# opus-grok-orch

A Cursor setup that keeps raw file contents out of the main model's context, plus a benchmark ("Harbor") that measures whether it helps.

Instead of reading files itself, the parent model hands the reading to a cheaper `file-reader` subagent that runs on Grok and returns only what was asked for. A hook enforces this, and a skill tells the parent how to work this way.

## What is in it

| Piece | Where | What it does |
|---|---|---|
| `file-reader` subagent | `agents/file-reader.md` | Reads files and answers with just the relevant facts |
| Plan-cache skill | `skills/opus-plan-cache/` | Instructions for the parent on planning and delegating reads |
| Gate hook | `hooks/`, `hooks.json` | Pre-tool-use check on Read and Shell calls from the parent |
| Benchmark | `bench/` | Runs the same tasks with and without the setup and compares quality and how many file bytes the parent reads |

## Benchmark

A run passes when quality with the setup stays within 5 points of the baseline, the parent reads fewer file bytes, and the `file-reader` is actually called. Token usage is reported but is not part of the pass rule. Details are in [`bench/README.md`](bench/README.md).

## Run it

Needs Node.js with built-in TypeScript support, since the scripts run `.ts` files directly.

```sh
npm install
npm test                # offline: checks the hook and the scorer, no API key needed
```

Live runs need a `CURSOR_API_KEY` in a `.env` file at the repo root (it is gitignored, never commit it):

```sh
npm run bench:smoke     # 4 tasks, 1 repeat, both variants
npm run bench -- --variant baseline --variant current --tier core
```

Then open `bench/dashboard/index.html` to see the results.

## Tech

TypeScript and Node.js, the [Cursor SDK](https://www.npmjs.com/package/@cursor/sdk).
