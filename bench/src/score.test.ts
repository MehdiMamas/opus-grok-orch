import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareToBaseline,
  emptyUsageSplit,
  loadTasks,
  measureParentFileBytes,
  scoreAnswer,
  scoreTask,
  splitUsage,
  summarizeRun,
  type SuiteRun,
  type Task,
  type TaskScore,
} from "./score.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const corpusRoot = path.join(repoRoot, "bench", "corpus");

function task(partial: Partial<Task> & Pick<Task, "id">): Task {
  return {
    title: partial.id,
    tiers: ["core"],
    kind: "needle",
    prompt: "question",
    requiredFacts: [],
    forbiddenFacts: [],
    citationMustContain: [],
    expectNotFound: false,
    ...partial,
  };
}

test("corpus keeps planted facts and omits the crypto feature", () => {
  const settle = fs.readFileSync(path.join(corpusRoot, "src/billing/settle.ts"), "utf8");
  assert.ok(settle.split(/\r?\n/).length >= 1000);
  assert.match(settle, /half-away-from-zero/);
  const joined = walk(path.join(corpusRoot, "src")).join("\n");
  assert.equal(joined.includes("HARBOR_FEATURE_CRYPTO_PAYOUT"), false);
  assert.match(fs.readFileSync(path.join(corpusRoot, "src/notify/pager.ts"), "utf8"), /harbor-oncall-primary/);
  assert.ok(fs.readFileSync(path.join(corpusRoot, "src/notify/pager.ts"), "utf8").split(/\r?\n/).length <= 80);
});

test("task tiers are smoke 4, core 12, full 16", () => {
  const dir = path.join(repoRoot, "bench", "tasks");
  assert.equal(loadTasks(dir, "smoke").length, 4);
  assert.equal(loadTasks(dir, "core").length, 12);
  assert.equal(loadTasks(dir, "full").length, 16);
});

test("citation must cover the planted rounding line", () => {
  const scored = scoreAnswer(
    task({
      id: "needle",
      requiredFacts: ["half-away-from-zero"],
      forbiddenFacts: ["bankers-rounding"],
      citationMustContain: ["half-away-from-zero"],
    }),
    "Settlement uses half-away-from-zero. See src/billing/settle.ts:826-830.",
    corpusRoot,
  );
  assert.equal(scored.quality, 100);
  assert.deepEqual(scored.flags, []);
});

test("a citation of the wrong lines fails even when the answer states the fact", () => {
  const scored = scoreAnswer(
    task({
      id: "needle",
      requiredFacts: ["half-away-from-zero"],
      citationMustContain: ["half-away-from-zero"],
    }),
    "The mode is half-away-from-zero. See src/billing/settle.ts:1-4.",
    corpusRoot,
  );
  assert.ok(scored.flags.includes("badCitation"));
  assert.ok(scored.quality < 100);
});

test("forbidden decoy lowers quality", () => {
  const scored = scoreAnswer(
    task({
      id: "ttl",
      requiredFacts: ["900"],
      forbiddenFacts: ["86400"],
      citationMustContain: ["900"],
    }),
    "The TTL is 900, not 86400. src/auth/session.ts:505-506.",
    corpusRoot,
  );
  assert.ok(scored.flags.includes("decoyHit"));
});

test("absent feature requires a not-found answer", () => {
  const missing = scoreAnswer(
    task({ id: "crypto", expectNotFound: true }),
    "HARBOR_FEATURE_CRYPTO_PAYOUT was not found in the repository.",
    corpusRoot,
  );
  assert.equal(missing.quality, 100);
  const invented = scoreAnswer(
    task({ id: "crypto", expectNotFound: true }),
    "It enables payouts and lives in src/billing/payouts.ts.",
    corpusRoot,
  );
  assert.equal(invented.quality, 0);
});

test("hook log counts claude slices and ignores grok reads", () => {
  const measured = measureParentFileBytes({
    corpusRoot,
    useHookLog: true,
    hookEvents: [
      {
        tool: "Read",
        model: "claude-opus-5",
        permission: "allow",
        path: "src/notify/pager.ts",
        limit: 80,
        offset: 1,
      },
      {
        tool: "Read",
        model: "claude-opus-5",
        permission: "deny",
        path: "src/billing/settle.ts",
        limit: null,
      },
      {
        tool: "Read",
        model: "grok-4.7-high",
        permission: "allow",
        path: "src/billing/settle.ts",
        limit: null,
      },
    ],
    tools: [],
  });
  const pager = fs.readFileSync(path.join(corpusRoot, "src/notify/pager.ts"));
  assert.equal(measured.parentFileBytes, pager.byteLength);
  assert.equal(measured.denies, 1);
  assert.equal(measured.allows, 2);
  assert.equal(measured.claudeReadEvents, 2);
  assert.equal(measured.grokReadEvents, 1);
  assert.equal(measured.parentDump, false);
});

test("baseline transcript reads count the whole file when limit is missing", () => {
  const settle = fs.readFileSync(path.join(corpusRoot, "src/billing/settle.ts"));
  const measured = measureParentFileBytes({
    corpusRoot,
    useHookLog: false,
    hookEvents: [],
    tools: [
      {
        name: "Read",
        status: "completed",
        args: { path: "src/billing/settle.ts" },
        result: "ignored because the file resolves",
      },
    ],
  });
  assert.equal(measured.parentFileBytes, settle.byteLength);
  assert.equal(measured.parentDump, true);
});

test("policy run without file-reader is a harness failure", () => {
  const scored = scoreTask({
    task: task({
      id: "needle-rounding",
      requiredFacts: ["half-away-from-zero"],
      citationMustContain: ["half-away-from-zero"],
    }),
    finalText: "half-away-from-zero is in src/billing/settle.ts:826-828.",
    corpusRoot,
    useHookLog: true,
    policy: true,
    hookEvents: [],
    tools: [],
  });
  assert.equal(scored.quality, 100);
  assert.ok(scored.harnessReasons.includes("noDelegation"));
});

test("regression fires when quality drops or parent bytes rise", () => {
  const meta = [{ id: "needle-rounding", title: "rounding", kind: "needle" }];
  const good = scoreTask({
    task: task({
      id: "needle-rounding",
      requiredFacts: ["half-away-from-zero"],
      citationMustContain: ["half-away-from-zero"],
    }),
    finalText: "half-away-from-zero src/billing/settle.ts:826-828",
    corpusRoot,
    useHookLog: true,
    policy: true,
    hookEvents: [
      {
        tool: "Read",
        model: "grok-4.7-high",
        permission: "allow",
        path: "src/billing/settle.ts",
      },
    ],
    tools: [{ name: "Task", status: "completed", args: { subagent_type: "file-reader" }, result: "short" }],
  });
  const worseText = scoreTask({
    ...{
      task: task({ id: "needle-rounding", requiredFacts: ["missing-fact"], citationMustContain: ["missing-fact"] }),
      finalText: "no idea",
      corpusRoot,
      useHookLog: true,
      policy: true,
      hookEvents: [],
      tools: [{ name: "Task", status: "completed", args: { subagent_type: "file-reader" }, result: "short" }],
    },
  });
  const first = summarizeRun({
    id: "run-a",
    variant: "current",
    tier: "smoke",
    parentModel: "claude-opus-5",
    createdAt: "2026-10-01T00:00:00.000Z",
    policy: true,
    taskMeta: meta,
    repeatScores: [[good]],
    previous: null,
  });
  assert.equal(first.regression, false);
  assert.equal(first.harnessFailure, false);

  const dropped = summarizeRun({
    id: "run-b",
    variant: "current",
    tier: "smoke",
    parentModel: "claude-opus-5",
    createdAt: "2026-10-01T01:00:00.000Z",
    policy: true,
    taskMeta: meta,
    repeatScores: [[worseText]],
    previous: first,
  });
  assert.equal(dropped.regression, true);
  assert.equal(dropped.regressionAgainst, "run-a");

  const heavier = summarizeRun({
    id: "run-c",
    variant: "current",
    tier: "smoke",
    parentModel: "claude-opus-5",
    createdAt: "2026-10-01T02:00:00.000Z",
    policy: true,
    taskMeta: meta,
    repeatScores: [[{ ...good, parentFileBytes: good.parentFileBytes + 50 }]],
    previous: first,
  });
  assert.equal(heavier.regression, true);
});

function suite(partial: Partial<SuiteRun> & Pick<SuiteRun, "id" | "variant">): SuiteRun {
  return {
    tier: "smoke",
    parentModel: "claude-opus-5",
    createdAt: "2026-10-01T00:00:00.000Z",
    repeats: 1,
    policy: partial.variant !== "baseline",
    medianQuality: 90,
    medianParentFileBytes: 10_000,
    medianCacheWriteTokens: 0,
    medianInputTokens: 0,
    medianUsage: emptyUsageSplit(),
    medianDurationMs: 0,
    efficiency: 0,
    regression: false,
    regressionAgainst: null,
    harnessFailure: false,
    harnessReasons: [],
    failOpens: 0,
    tasks: [],
    ...partial,
  };
}

test("compareToBaseline passes when quality holds and parent bytes fall", () => {
  const comparison = compareToBaseline(
    suite({ id: "before", variant: "baseline", medianQuality: 90, medianParentFileBytes: 10_000 }),
    suite({ id: "after", variant: "current", medianQuality: 86, medianParentFileBytes: 400 }),
  );
  assert.equal(comparison.qualityDelta, -4);
  assert.equal(comparison.parentFileBytesDelta, -9600);
  assert.equal(comparison.passed, true);
  assert.deepEqual(comparison.reasons, []);
});

test("compareToBaseline fails when the baseline run is a harness failure", () => {
  const comparison = compareToBaseline(
    suite({ id: "before", variant: "baseline", harnessFailure: true }),
    suite({ id: "after", variant: "current", medianQuality: 90, medianParentFileBytes: 100 }),
  );
  assert.equal(comparison.passed, false);
  assert.ok(comparison.reasons.includes("baselineHarnessFailure"));
});

test("compareToBaseline fails on a quality drop, rising bytes, or a harness failure", () => {
  const before = suite({ id: "before", variant: "baseline" });
  const quality = compareToBaseline(before, suite({ id: "q", variant: "current", medianQuality: 80 }));
  assert.equal(quality.passed, false);
  assert.ok(quality.reasons.includes("qualityDrop"));

  const bytes = compareToBaseline(before, suite({ id: "b", variant: "current", medianParentFileBytes: 10_000 }));
  assert.equal(bytes.passed, false);
  assert.ok(bytes.reasons.includes("parentBytesUp"));

  const harness = compareToBaseline(
    before,
    suite({
      id: "h",
      variant: "current",
      medianQuality: 90,
      medianParentFileBytes: 100,
      harnessFailure: true,
    }),
  );
  assert.equal(harness.passed, false);
  assert.ok(harness.reasons.includes("harnessFailure"));
});

test("usage events split Claude and Grok token counts", () => {
  const split = splitUsage({
    messages: [
      { type: "system", agent_id: "parent", model: { id: "claude-opus-5-5-medium" } },
      {
        type: "usage",
        agent_id: "parent",
        usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 },
      },
      { type: "system", agent_id: "child", model: { id: "grok-4.7-medium" } },
      {
        type: "usage",
        agent_id: "child",
        usage: { inputTokens: 5, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 6 },
      },
    ],
    tools: [],
  });
  assert.deepEqual(split.claude, { inputTokens: 10, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 });
  assert.deepEqual(split.grok, { inputTokens: 5, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 6 });
  assert.deepEqual(split.unattributed, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
});

test("a usage event with no model lands in unattributed", () => {
  const counts = { inputTokens: 7, outputTokens: 1, cacheReadTokens: 2, cacheWriteTokens: 3 };
  const split = splitUsage({
    messages: [{ type: "usage", agent_id: "unknown", usage: counts }],
    tools: [],
    parentAgentId: "parent",
    parentModel: "claude-opus-5-5",
  });
  assert.deepEqual(split.unattributed, counts);
  assert.equal(split.claude.inputTokens, 0);
  assert.equal(split.grok.inputTokens, 0);

  const fallback = splitUsage({
    messages: [],
    tools: [],
    fallback: { inputTokens: 9, outputTokens: 4, cacheReadTokens: 8, cacheWriteTokens: 1 },
  });
  assert.deepEqual(fallback.unattributed, { inputTokens: 9, outputTokens: 4, cacheReadTokens: 8, cacheWriteTokens: 1 });
});

test("with parentModel claude-opus-5-5 the fallback lands in claude", () => {
  const counts = { inputTokens: 9, outputTokens: 4, cacheReadTokens: 8, cacheWriteTokens: 1 };
  const split = splitUsage({
    messages: [],
    tools: [],
    fallback: counts,
    parentModel: "claude-opus-5-5",
  });
  assert.deepEqual(split.claude, counts);
  assert.equal(split.grok.inputTokens, 0);
  assert.equal(split.unattributed.inputTokens, 0);
});

test("a file-reader result is not double-counted when that agent already reported usage", () => {
  const usage = { inputTokens: 5, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 6 };
  const split = splitUsage({
    messages: [
      { type: "system", agent_id: "child", model: { id: "grok-4.7-medium" } },
      { type: "usage", agent_id: "child", usage },
    ],
    tools: [
      {
        name: "Task",
        status: "completed",
        args: { subagent_type: "file-reader" },
        result: {
          status: "success",
          value: {
            agentId: "child",
            conversationSteps: [{ type: "usage", agent_id: "child", usage: { inputTokens: 100, outputTokens: 100, cacheReadTokens: 100, cacheWriteTokens: 100 } }],
          },
        },
      },
    ],
  });
  assert.deepEqual(split.grok, usage);

  const onlyTask = splitUsage({
    messages: [],
    tools: [
      {
        name: "Task",
        status: "completed",
        args: { subagentType: { kind: "custom", name: "file-reader" } },
        result: { agentId: "worker", inputTokens: 8, outputTokens: 2, cacheReadTokens: 1, cacheWriteTokens: 4 },
      },
    ],
  });
  assert.deepEqual(onlyTask.grok, { inputTokens: 8, outputTokens: 2, cacheReadTokens: 1, cacheWriteTokens: 4 });
});

test("summarizeRun medians Claude and Grok token buckets", () => {
  const meta = [{ id: "needle-rounding", title: "rounding", kind: "needle" }];
  const sample = (input: number): TaskScore =>
    scoreTask({
      task: task({
        id: "needle-rounding",
        requiredFacts: ["half-away-from-zero"],
        citationMustContain: ["half-away-from-zero"],
      }),
      finalText: "half-away-from-zero src/billing/settle.ts:826-828",
      corpusRoot,
      useHookLog: true,
      policy: true,
      hookEvents: [],
      tools: [{ name: "Task", status: "completed", args: { subagent_type: "file-reader" }, result: "short" }],
      usage: {
        claude: { inputTokens: input, outputTokens: 1, cacheReadTokens: 2, cacheWriteTokens: 3 },
        grok: { inputTokens: input + 1, outputTokens: 4, cacheReadTokens: 5, cacheWriteTokens: 6 },
        unattributed: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      },
    });
  const summary = summarizeRun({
    id: "tokens",
    variant: "current",
    tier: "smoke",
    parentModel: "claude-opus-5-5-medium",
    createdAt: "2026-10-01T00:00:00.000Z",
    policy: true,
    taskMeta: meta,
    repeatScores: [[sample(10)], [sample(30)]],
    previous: null,
  });
  assert.equal(summary.medianUsage.claude.inputTokens, 20);
  assert.equal(summary.medianUsage.grok.inputTokens, 21);
  assert.equal(summary.medianUsage.claude.cacheWriteTokens, 3);
  assert.equal(summary.medianInputTokens, 41);
  assert.equal(summary.medianCacheWriteTokens, 9);
});

test("hook tool names are matched without case, and a non-Grok model counts as the parent", () => {
  const settle = fs.readFileSync(path.join(corpusRoot, "src/billing/settle.ts"));
  const measured = measureParentFileBytes({
    corpusRoot,
    useHookLog: true,
    hookEvents: [
      { tool: "read", model: "", permission: "allow", path: "src/billing/settle.ts", limit: null },
      { tool: "shell", model: "claude-opus-5", permission: "allow", command: "cat src/notify/pager.ts" },
    ],
    tools: [],
  });
  const pager = fs.readFileSync(path.join(corpusRoot, "src/notify/pager.ts"));
  assert.equal(measured.parentFileBytes, settle.byteLength + pager.byteLength);
  assert.equal(measured.parentDump, true);
  assert.equal(measured.claudeReadEvents, 0);
  assert.equal(measured.grokReadEvents, 0);
});

test("parent byte counts skip .cursor paths", () => {
  const measured = measureParentFileBytes({
    corpusRoot,
    useHookLog: true,
    hookEvents: [
      {
        tool: "Read",
        model: "claude-opus-5",
        permission: "allow",
        path: ".cursor/skills/opus-plan-cache/SKILL.md",
        limit: null,
      },
    ],
    tools: [
      {
        name: "read",
        status: "completed",
        agentId: "parent",
        args: { path: ".cursor/skills/opus-plan-cache/SKILL.md" },
        result: "skill body",
      },
    ],
    parentAgentId: "parent",
  });
  assert.equal(measured.parentFileBytes, 0);
  assert.equal(measured.parentDump, false);
  assert.equal(measured.unboundedParentCorpusRead, false);
});

test("policy bytes are the max of the hook log and parent transcript reads", () => {
  const settle = fs.readFileSync(path.join(corpusRoot, "src/billing/settle.ts"));
  const pager = fs.readFileSync(path.join(corpusRoot, "src/notify/pager.ts"));
  const hookSmaller = measureParentFileBytes({
    corpusRoot,
    useHookLog: true,
    hookEvents: [
      {
        tool: "read",
        model: "claude-opus-5",
        permission: "allow",
        path: "src/notify/pager.ts",
        limit: 80,
        offset: 1,
      },
    ],
    tools: [
      {
        name: "read",
        status: "completed",
        agentId: "parent",
        args: { path: "src/billing/settle.ts" },
      },
      {
        name: "read",
        status: "completed",
        agentId: "worker",
        args: { path: "src/billing/settle.ts" },
      },
    ],
    parentAgentId: "parent",
  });
  assert.equal(hookSmaller.parentFileBytes, settle.byteLength);
  assert.equal(hookSmaller.unboundedParentCorpusRead, true);

  const hookLarger = measureParentFileBytes({
    corpusRoot,
    useHookLog: true,
    hookEvents: [
      {
        tool: "Read",
        model: "",
        permission: "allow",
        path: "src/billing/settle.ts",
        limit: null,
      },
    ],
    tools: [
      {
        name: "read",
        status: "completed",
        args: { path: "src/notify/pager.ts", limit: 10 },
      },
    ],
    parentAgentId: "parent",
  });
  assert.equal(hookLarger.parentFileBytes, settle.byteLength);
  assert.ok(settle.byteLength > pager.byteLength);
});

test("an unbounded parent read with zero hook denies is gateNotEnforced", () => {
  const base = {
    task: task({
      id: "needle-rounding",
      requiredFacts: ["half-away-from-zero"],
      citationMustContain: ["half-away-from-zero"],
    }),
    finalText: "half-away-from-zero is in src/billing/settle.ts:826-828.",
    corpusRoot,
    useHookLog: true,
    policy: true,
    tools: [
      { name: "Task", status: "completed", agentId: "parent", args: { subagent_type: "file-reader" }, result: "short" },
      { name: "read", status: "completed", agentId: "parent", args: { path: "src/billing/settle.ts" } },
    ],
    parentAgentId: "parent",
  };
  const open = scoreTask({ ...base, hookEvents: [] });
  assert.ok(open.harnessReasons.includes("gateNotEnforced"));
  assert.equal(open.denies, 0);

  const denied = scoreTask({
    ...base,
    hookEvents: [
      { tool: "read", model: "claude-opus-5", permission: "deny", path: "src/billing/settle.ts", limit: null },
    ],
  });
  assert.equal(denied.harnessReasons.includes("gateNotEnforced"), false);
  assert.equal(denied.denies, 1);
});

test("sdk errors and stalls are harness failures for both variants", () => {
  const scored = scoreTask({
    task: task({ id: "needle-rounding" }),
    finalText: "partial answer",
    corpusRoot,
    useHookLog: false,
    policy: false,
    hookEvents: [],
    tools: [],
    incomplete: true,
    sdkError: "unable to open database file",
  });
  assert.ok(scored.harnessReasons.includes("sdkError"));
  assert.ok(scored.harnessReasons.includes("stalled"));
  assert.equal(scored.incomplete, true);
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(fs.readFileSync(abs, "utf8"));
  }
  return out;
}

test("marker file selects the JSONL log when GATE_LOG_PATH is unset", async () => {
  const { logDecision } = await import("../../hooks/gate-lib.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harbor-marker-"));
  const previous = process.cwd();
  const saved = process.env.GATE_LOG_PATH;
  delete process.env.GATE_LOG_PATH;
  process.chdir(dir);
  try {
    fs.mkdirSync(path.join(dir, ".cursor"));
    const logPath = path.join(dir, "events.jsonl");
    fs.writeFileSync(path.join(dir, ".cursor", "gate-log-path.txt"), `${logPath}\n`);
    logDecision(
      { model: "grok-4.7-high", tool_name: "Read", tool_input: { path: "src/a.ts" } },
      { permission: "allow" },
    );
    assert.equal(JSON.parse(fs.readFileSync(logPath, "utf8")).tool, "Read");
  } finally {
    process.chdir(previous);
    if (saved == null) delete process.env.GATE_LOG_PATH;
    else process.env.GATE_LOG_PATH = saved;
  }
});
