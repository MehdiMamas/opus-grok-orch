I've stopped making changes. Below is a plan you can paste into Cursor.

I had already edited bench/src/score.ts before your message, and those edits are kept. All 25 tests still pass:
- answerText(): it now joins streamed text with no separator and returns only the last answer.
- splitUsage(): it accepts optional parentAgentId / parentModel. When parentModel isn't passed it behaves as before, and run.ts doesn't pass it yet.

The plan marks those two as done. If you'd rather Cursor do everything from scratch, tell me and I'll revert them.

---

# Fix the Harbor file-reader benchmark

## Context
This repo benchmarks whether a Cursor setup keeps raw file contents out of Claude's context:
- `agents/file-reader.md`: a Grok subagent
- `skills/opus-plan-cache`: a skill telling Claude to delegate file reading
- `hooks/gate-parent-reads.mjs`: a hook that blocks Claude's full-file reads

`bench/src/run.ts` runs each task through `@cursor/sdk` twice: `baseline` (none of the above) and `current` (all three). `bench/src/score.ts` scores the runs. `bench/dashboard/index.html` shows the results.

The last two smoke runs are unusable. Every task in both variants ended with `status: "error"`. The quality scores are wrong, the token cards show 0, and `file-reader` was never called.

## Already done (don't redo)
- `answerText()` in `score.ts` now joins streamed text with `""` and returns only the last assistant segment. A segment ends at each `tool_call`/`task` event. Before, chunks were joined with "\n", which split facts like `WEBHOOK_MAX_ATTEMPTS`.
- `splitUsage()` in `score.ts` now takes optional `parentAgentId` and `parentModel`. Usage events from the parent agent, or with no agent id, go to the parent model's bucket. The `fallback` run total goes to the parent bucket when no usage events exist at all.

## 1. Fix the SDK database error (bench/src/run.ts, runTask)
Every run failed with `[internal] unable to open database file`. On Windows, the SDK's default SQLite path is ~/.cursor/projects/<long temp slug>/sdk-agent-store/<sha256>/agents/agent-<sha256>/store.db. That is 252 characters, so `store.db-journal` reaches 260, which is past the Windows MAX_PATH limit.
- `import { SqliteLocalAgentStore } from "@cursor/sdk/sqlite"`.
- Per task, `const store = await SqliteLocalAgentStore.open({ workspaceRef: workspace, stateRoot })`. Make `stateRoot` short: `process.env.BENCH_STATE_ROOT`, default `path.join(os.homedir(), ".hb", <short random id>)`.
- Pass it as `local: { cwd: workspace, settingSources: ["project"], store }`.
- Call `await store.dispose()` in the `finally` block after disposing the agent, then delete the state root.
- Create the temp workspace under `process.env.BENCH_WORK_ROOT ?? os.tmpdir()` with a short prefix like `hb-`.

## 2. Treat SDK errors as failures
- In `runTask`, set `incomplete` whenever `result.status === "error"` or `"cancelled"`, even when some text was streamed. Today this happens only when the answer is empty (run.ts around line 419).
- Add a `sdkError?: string` option to `scoreTask`. Push the harness reason `sdkError` for both variants, not just policy runs. Also push `stalled` for both variants when `incomplete` is set.
- In `compareToBaseline`, also fail with the reason `baselineHarnessFailure` when `before.harnessFailure` is true.

## 3. Make the token numbers real
- In `runTask`, record `run.agentId` and pass `parentAgentId: run.agentId` and `parentModel: options.model.id` to `splitUsage`. Pass `answerText(result.result, messages, run.agentId)`.
- After `run.wait()`, call `await agent.getUsage()` inside try/catch. Save it to the transcript JSON as `agentUsage`; it includes `cost` when available. When `result.usage` is missing, use `agentUsage.usage` as the `fallback`.
- Update the test "a usage event with no model lands in unattributed" in `score.test.ts`, and add one test showing that, with `parentModel: "claude-opus-5-5"`, the fallback lands in `claude`.
- Dashboard (`bench/dashboard/index.html`):
  - Add `tokenCard("Unattributed tokens", "unattributed", ...)`, rendered only when it is non-zero.
  - Add a "Total tokens" card.
  - Add a small note that input includes cache reads.
  - Runs without `medianUsage` (old schema) show "no usage data" instead of 0.

## 4. Make delegation visible, then fix it
None of the transcripts contains a `task` or file-reader call. The only tools used were grep, read, shell and glob. The parent read `SKILL.md` up to four times per task and then read files itself anyway.
- Save the `system` init event (its `tools` list and `model`) into each transcript JSON. This shows whether the `task` tool is offered at all under `mode: "plan"`.
- Validate the subagent model id from `agents/file-reader.md` frontmatter (`grok-4.7-medium`) against `Cursor.models.list()`. Reuse the matching logic in `resolveParentModel`: `grok-4.7-medium` may need to be `grok-4.7` plus an effort param. Fail fast with the list of Grok ids if it's not found.
- For the `current` variant, prepend this to the prompt: "Use the file-reader subagent for reading file contents; do not read whole files yourself."
- If `task` isn't in the tools list under plan mode, make `mode` configurable in `bench/config.json` (`"parentMode": "plan" | "agent"`) and use "agent" for the run.
- Optionally, add a `strict` variant (`bench/variants/strict/`) that also passes `disallowedTools: ["read"]` to the parent, to measure the upper bound.

## 5. Measure parent bytes honestly (bench/src/score.ts, measureParentFileBytes)
`current` reports parentFileBytes = 0, but its transcripts show Claude doing unbounded `read`s of `src/webhooks/dispatcher.ts` that the hook did not block. The hook log is deleted with the temp workspace.
- In `runTask`, copy `<workspace>/.cursor/parent-reads.jsonl` to `bench/results/<runId>/<variant>/<taskId>.hook.jsonl` before cleanup.
- Compare tool names case-insensitively: `"read"` and `"shell"`, not just exactly `"Read"`.
- Treat hook events whose model is not Grok (including an empty model) as parent events.
- Skip paths under `/.cursor/`, such as the skill file, when counting bytes.
- `extractTools` now records `agentId` on each tool. For policy runs, also compute bytes from the transcript tools whose `agentId` is the parent's (or missing), and use `max(hookBytes, transcriptBytes)`.
- Add the harness reason `gateNotEnforced` when the transcript has an unbounded parent read of a corpus file and the hook log has zero denies.
- Add tests for each of these.

## 6. Small items
- `bench/README.md`: document `BENCH_STATE_ROOT`, `BENCH_WORK_ROOT`, `parentMode`, and note that the `forbiddenFacts` decoy check is strict: mentioning the decoy only to reject it still counts as a hit.
- Keep the existing code style: no new dependencies, plain node:test tests.

## Verification
1. `npm test`: all old and new tests pass.
2. `npm run bench:smoke` with `CURSOR_API_KEY` set:
   - no "unable to open database file"
   - each task's status is "finished"
   - Claude tokens are non-zero for both variants
   - each transcript contains the system event's tools list
   - `current` shows either file-reader calls with non-zero Grok tokens, or a clear `noDelegation`/`gateNotEnforced` reason
3. Open `bench/dashboard/index.html` and confirm the token cards show real numbers.

---

This also has nothing to do with the benchmark: your real Cursor hook log (~/.cursor/hooks/gate-parent-reads.log) shows about 1,470 Grok reads of the same terminals/847932.txt, about 0.85 seconds apart, in your cursify project. That looks like a polling loop that's burning tokens.