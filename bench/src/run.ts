import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SqliteLocalAgentStore } from "@cursor/sdk/sqlite";
import {
  answerText,
  compareToBaseline,
  extractTools,
  lastStatusMessage,
  loadTasks,
  scoreTask,
  splitUsage,
  summarizeRun,
  type BaselineComparison,
  type HookEvent,
  type SuiteRun,
  type TaskScore,
  type TokenCounts,
} from "./score.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const corpusRoot = path.join(repoRoot, "bench", "corpus");
const tasksDir = path.join(repoRoot, "bench", "tasks");
const resultsDir = path.join(repoRoot, "bench", "results");
const dashboardData = path.join(repoRoot, "bench", "dashboard", "results.js");
const indexPath = path.join(resultsDir, "index.json");

type Variant = {
  name: string;
  policy: boolean;
  agent?: string;
  skill?: string;
  hook?: string;
  disallowedTools?: string[];
};

type ParentMode = "plan" | "agent";

type Config = {
  parentModel: string;
  parentEffort?: string;
  parentMode?: ParentMode;
  taskTimeoutMs: number;
  tiers: Record<string, { repeats: number }>;
};

type ModelParam = { id: string; value: string };

type ListedModel = {
  id: string;
  aliases?: string[];
  parameters?: Array<{ id?: string; values?: Array<{ value?: string }> }>;
  variants?: Array<{ displayName?: string; params?: ModelParam[] }>;
};

const QUESTION_PREFIX = `Answer this question about the Harbor codebase in the working directory.
Do not edit files. Do not create files.
Cite evidence as a repo-relative path with a line range, using forward slashes, like src/billing/settle.ts:10-20.
If the fact is not in the repository, say it was not found.

Question:
`;

const DELEGATION_PREFIX = `Use the file-reader subagent for reading file contents; do not read whole files yourself.

`;

function readFlag(name: string): string[] {
  const values: string[] = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === `--${name}`) {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) values.push(next);
    } else if (arg.startsWith(`--${name}=`)) {
      values.push(arg.slice(name.length + 3));
    }
  }
  return values;
}

function loadLocalEnv() {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function help() {
  console.log(`Usage: node bench/src/run.ts [--variant <name>]... [--tier smoke|core|full] [--repeats N]

Variants:
  baseline   no skill, no hook, no file-reader
  current    agents/file-reader.md, skills/opus-plan-cache, and hooks/ at the repo root
  strict     current, plus disallowedTools: ["read"] on the parent
  <id>       bench/variants/<id>/ with those three files, or variant.json {"policy":false}

Default: --variant baseline --variant current --tier core
Writes bench/results/index.json and bench/dashboard/results.js
`);
}

function loadConfig(): Config {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, "bench", "config.json"), "utf8")) as Config;
}

function repoPolicyFiles(): Pick<Variant, "agent" | "skill" | "hook"> {
  return {
    agent: path.join(repoRoot, "agents", "file-reader.md"),
    skill: path.join(repoRoot, "skills", "opus-plan-cache", "SKILL.md"),
    hook: path.join(repoRoot, "hooks", "gate-parent-reads.mjs"),
  };
}

function resolveVariant(name: string): Variant {
  if (name === "current") return { name, policy: true, ...repoPolicyFiles() };
  const dir = path.join(repoRoot, "bench", "variants", name);
  const marker = path.join(dir, "variant.json");
  const meta = fs.existsSync(marker)
    ? (JSON.parse(fs.readFileSync(marker, "utf8")) as { policy?: boolean; disallowedTools?: string[] })
    : {};
  if (meta.policy === false) return { name, policy: false, disallowedTools: meta.disallowedTools };
  const agent = path.join(dir, "agents", "file-reader.md");
  const skill = path.join(dir, "skills", "opus-plan-cache", "SKILL.md");
  const hook = path.join(dir, "hooks", "gate-parent-reads.mjs");
  if ([agent, skill, hook].every((file) => fs.existsSync(file))) {
    return { name, policy: true, agent, skill, hook, disallowedTools: meta.disallowedTools };
  }
  if (meta.policy === true) return { name, policy: true, ...repoPolicyFiles(), disallowedTools: meta.disallowedTools };
  throw new Error(
    `Variant ${name} needs agents/file-reader.md, skills/opus-plan-cache/SKILL.md, and hooks/gate-parent-reads.mjs, or variant.json {"policy":false}.`,
  );
}

function parentModeOf(config: Config): ParentMode {
  if (config.parentMode == null) return "plan";
  if (config.parentMode === "plan" || config.parentMode === "agent") return config.parentMode;
  throw new Error(`bench/config.json parentMode must be "plan" or "agent".`);
}

function offersTask(tools: string[]): boolean {
  return tools.some((tool) => tool.toLowerCase() === "task");
}

function systemToolsOf(messages: unknown[]): string[] | null {
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const event = message as Record<string, unknown>;
    if (event.type !== "system" || !Array.isArray(event.tools)) continue;
    return event.tools.map((tool) => String(tool));
  }
  return null;
}

function systemModelOf(messages: unknown[]): unknown {
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const event = message as Record<string, unknown>;
    if (event.type !== "system") continue;
    return event.model ?? null;
  }
  return null;
}

function taskStateRoot(): string {
  const base = process.env.BENCH_STATE_ROOT ?? path.join(os.homedir(), ".hb");
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, "s"));
}

function taskWorkspace(): string {
  const base = process.env.BENCH_WORK_ROOT ?? os.tmpdir();
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, "hb-"));
}

function materialize(workspace: string, variant: Variant) {
  fs.cpSync(corpusRoot, workspace, { recursive: true });
  if (!variant.policy || !variant.agent || !variant.skill || !variant.hook) return;
  const cursor = path.join(workspace, ".cursor");
  fs.mkdirSync(path.join(cursor, "hooks"), { recursive: true });
  fs.mkdirSync(path.join(cursor, "agents"), { recursive: true });
  fs.mkdirSync(path.join(cursor, "skills", "opus-plan-cache"), { recursive: true });
  fs.copyFileSync(variant.agent, path.join(cursor, "agents", "file-reader.md"));
  fs.copyFileSync(variant.skill, path.join(cursor, "skills", "opus-plan-cache", "SKILL.md"));
  fs.copyFileSync(path.join(repoRoot, "hooks", "gate-lib.mjs"), path.join(cursor, "hooks", "gate-lib.mjs"));
  fs.copyFileSync(variant.hook, path.join(cursor, "hooks", "gate-parent-reads.mjs"));
  fs.writeFileSync(
    path.join(cursor, "hooks.json"),
    `${JSON.stringify(
      {
        version: 1,
        hooks: {
          preToolUse: [
            {
              command: "node .cursor/hooks/gate-parent-reads.mjs",
              matcher: "Read|Shell",
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
}

function readHookEvents(logPath: string): HookEvent[] {
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as HookEvent);
}

function fileReaderDefinition(filePath: string): { description: string; prompt: string; model: { id: string } } {
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const front = match?.[1] ?? "";
  const prompt = (match?.[2] ?? text).trim();
  const description =
    /^description:\s*(.+)$/m.exec(front)?.[1]?.trim() ??
    "Parses local files and returns a short cited answer.";
  const model = /^model:\s*(.+)$/m.exec(front)?.[1]?.trim() || "grok-4.7-medium";
  return { description, prompt, model: { id: model } };
}

function listedModels(list: unknown): ListedModel[] {
  const rows = Array.isArray(list)
    ? list
    : list && typeof list === "object" && Array.isArray((list as { models?: unknown[] }).models)
      ? (list as { models: unknown[] }).models
      : [];
  return rows.filter((row): row is ListedModel => Boolean(row) && typeof row === "object" && typeof (row as ListedModel).id === "string");
}

function resolveParentModel(
  list: unknown,
  id: string,
  effort: string | undefined,
  role: "parent" | "subagent" = "parent",
): { id: string; params?: ModelParam[]; label: string } {
  const models = listedModels(list);
  if (models.length === 0) return { id, label: effort ? `${id} ${effort}` : id };
  const model = models.find((item) => item.id === id || item.aliases?.includes(id));
  const family = role === "parent" ? /claude/i : /grok/i;
  const familyName = role === "parent" ? "Claude" : "Grok";
  const modelLabel = role === "parent" ? "bench/config.json parentModel" : "agents/file-reader.md model";
  const effortLabel = role === "parent" ? "bench/config.json parentEffort" : "agents/file-reader.md model effort";
  if (!model) {
    const names = models.map((item) => item.id).filter((name) => family.test(name));
    throw new Error(
      `${modelLabel} ${id} is not in Cursor.models.list(). ${familyName} ids: ${names.join(", ") || "(none)"}`,
    );
  }
  if (!effort) return { id: model.id, label: model.id };
  const wanted = effort.toLowerCase();
  const variant = (model.variants ?? []).find((item) => {
    if (item.displayName?.toLowerCase() === wanted) return true;
    return item.params?.some((param) => param.value.toLowerCase() === wanted);
  });
  if (variant?.params?.length) {
    return { id: model.id, params: variant.params, label: `${model.id} ${effort}` };
  }
  const parameters = model.parameters ?? [];
  const parameter = parameters.find((item) => /effort|reasoning|thinking/i.test(item.id ?? "") && item.values?.some((value) => value.value?.toLowerCase() === wanted))
    ?? parameters.find((item) => item.values?.some((value) => value.value?.toLowerCase() === wanted));
  const value = parameter?.values?.find((item) => item.value?.toLowerCase() === wanted)?.value;
  if (parameter?.id && value) {
    return { id: model.id, params: [{ id: parameter.id, value }], label: `${model.id} ${value}` };
  }
  const choices = [
    ...(model.variants ?? []).map((item) => item.displayName).filter(Boolean),
    ...parameters.flatMap((item) => (item.values ?? []).map((value) => value.value).filter(Boolean)),
  ];
  throw new Error(
    `${effortLabel} ${effort} is not a variant of ${model.id}. Choices: ${[...new Set(choices)].join(", ") || "(none)"}`,
  );
}

function resolveFileReaderModel(list: unknown, raw: string): { id: string; params?: ModelParam[]; label: string } {
  const models = listedModels(list);
  if (models.length === 0) return { id: raw, label: raw };
  const exact = models.find((item) => item.id === raw || item.aliases?.includes(raw));
  if (exact) return resolveParentModel(list, exact.id, undefined, "subagent");
  const dash = raw.lastIndexOf("-");
  if (dash > 0) {
    const id = raw.slice(0, dash);
    const effort = raw.slice(dash + 1);
    const base = models.find((item) => item.id === id || item.aliases?.includes(id));
    if (base) return resolveParentModel(list, base.id, effort, "subagent");
  }
  const grok = models.map((item) => item.id).filter((name) => /grok/i.test(name));
  throw new Error(
    `agents/file-reader.md model ${raw} is not in Cursor.models.list(). Grok ids: ${grok.join(", ") || "(none)"}`,
  );
}

type ResultsIndex = { runs: SuiteRun[]; comparisons: BaselineComparison[] };

function latestComparison(runs: SuiteRun[], tier: string): BaselineComparison | null {
  const before = [...runs].reverse().find((run) => run.variant === "baseline" && run.tier === tier) ?? null;
  const after = [...runs].reverse().find((run) => run.variant === "current" && run.tier === tier) ?? null;
  if (!before || !after) return null;
  return compareToBaseline(before, after);
}

function withComparisons(runs: SuiteRun[]): ResultsIndex {
  const tiers = [...new Set(runs.map((run) => run.tier))];
  const comparisons = tiers
    .map((name) => latestComparison(runs, name))
    .filter((comparison): comparison is BaselineComparison => comparison != null);
  return { runs, comparisons };
}

function loadIndex(): ResultsIndex {
  if (!fs.existsSync(indexPath)) return { runs: [], comparisons: [] };
  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as Partial<ResultsIndex>;
  return withComparisons(parsed.runs ?? []);
}

function writeIndex(index: ResultsIndex) {
  const next = withComparisons(index.runs);
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(indexPath, `${JSON.stringify(next, null, 2)}\n`);
  fs.mkdirSync(path.dirname(dashboardData), { recursive: true });
  fs.writeFileSync(dashboardData, `window.BENCH_RESULTS = ${JSON.stringify(next)};\n`);
  return next;
}

function printComparison(comparison: BaselineComparison) {
  const verdict = comparison.passed ? "pass" : `fail ${comparison.reasons.join(", ")}`;
  console.log(
    [
      `before ${comparison.beforeId} quality ${comparison.beforeQuality.toFixed(1)} bytes ${Math.round(comparison.beforeParentFileBytes)}`,
      `after ${comparison.afterId} quality ${comparison.afterQuality.toFixed(1)} bytes ${Math.round(comparison.afterParentFileBytes)}`,
      `delta quality ${comparison.qualityDelta.toFixed(1)} bytes ${Math.round(comparison.parentFileBytesDelta)}`,
      verdict,
    ].join("\n"),
  );
}

function formatCounts(label: string, counts: TokenCounts | undefined): string {
  const value = counts ?? { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  return `  ${label} in ${Math.round(value.inputTokens)} out ${Math.round(value.outputTokens)} cacheRead ${Math.round(value.cacheReadTokens)} cacheWrite ${Math.round(value.cacheWriteTokens)}`;
}

function printRun(run: SuiteRun) {
  const flag = run.harnessFailure ? " harness-failure" : run.regression ? " regression" : "";
  console.log(
    `${run.variant}/${run.tier} quality ${run.medianQuality.toFixed(1)} bytes ${Math.round(run.medianParentFileBytes)} efficiency ${run.efficiency.toFixed(2)}${flag}`,
  );
  console.log(formatCounts("claude", run.medianUsage?.claude));
  console.log(formatCounts("grok", run.medianUsage?.grok));
  const unattributed = run.medianUsage?.unattributed;
  if (
    unattributed &&
    (unattributed.inputTokens || unattributed.outputTokens || unattributed.cacheReadTokens || unattributed.cacheWriteTokens)
  ) {
    console.log(formatCounts("unattributed", unattributed));
  }
  if (run.harnessReasons.length) console.log(`  harness: ${run.harnessReasons.join(", ")}`);
  for (const task of run.tasks) {
    const marks = task.flags.length ? ` [${task.flags.join(", ")}]` : "";
    console.log(
      `  ${task.taskId} quality ${task.medianQuality.toFixed(1)} bytes ${Math.round(task.medianParentFileBytes)}${marks}`,
    );
  }
}

type TurnUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

type AgentUsageSnapshot = {
  usage?: TurnUsage;
  cost?: unknown;
};

async function runTask(options: {
  Agent: {
    create: (opts: unknown) => Promise<{
      getUsage?: () => Promise<AgentUsageSnapshot>;
      send: (prompt: string) => Promise<{
        agentId: string;
        stream: () => AsyncIterable<unknown>;
        wait: () => Promise<{
          status?: string;
          result?: string;
          durationMs?: number;
          error?: { message?: string; code?: string };
          usage?: TurnUsage;
        }>;
        supports?: (op: string) => boolean;
        cancel?: () => Promise<void>;
      }>;
      [Symbol.asyncDispose]?: () => Promise<void>;
    }>;
  };
  apiKey: string;
  model: { id: string; params?: ModelParam[] };
  fileReaderModel?: { id: string; params?: ModelParam[] };
  variant: Variant;
  task: ReturnType<typeof loadTasks>[number];
  timeoutMs: number;
  runId: string;
  mode: ParentMode;
}): Promise<{ score: TaskScore; systemTools: string[] | null }> {
  const workspace = taskWorkspace();
  const stateRoot = taskStateRoot();
  const logPath = path.join(workspace, ".cursor", "parent-reads.jsonl");
  materialize(workspace, options.variant);
  fs.mkdirSync(path.join(workspace, ".cursor"), { recursive: true });
  fs.writeFileSync(path.join(workspace, ".cursor", "gate-log-path.txt"), `${logPath}\n`);
  const previousLog = process.env.GATE_LOG_PATH;
  process.env.GATE_LOG_PATH = logPath;

  let store: SqliteLocalAgentStore | null = null;
  let agent: Awaited<ReturnType<typeof options.Agent.create>> | null = null;
  try {
    store = await SqliteLocalAgentStore.open({ workspaceRef: workspace, stateRoot });
    const reader = options.variant.policy && options.variant.agent
      ? fileReaderDefinition(options.variant.agent)
      : null;
    const readerModel = options.fileReaderModel ?? reader?.model;
    agent = await options.Agent.create({
      apiKey: options.apiKey,
      model: options.model,
      mode: options.mode,
      local: { cwd: workspace, settingSources: ["project"], store },
      ...(options.variant.disallowedTools?.length ? { disallowedTools: options.variant.disallowedTools } : {}),
      ...(reader && readerModel ? { agents: { "file-reader": { description: reader.description, prompt: reader.prompt, model: readerModel } } } : {}),
    });
    const prompt = `${options.variant.policy ? DELEGATION_PREFIX : ""}${QUESTION_PREFIX}${options.task.prompt}`;
    const run = await agent.send(prompt);
    const messages: unknown[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (run.supports?.("cancel")) void run.cancel?.();
    }, options.timeoutMs);
    let giveUpTimer: ReturnType<typeof setTimeout> | undefined;
    const giveUp = new Promise<never>((_, reject) => {
      giveUpTimer = setTimeout(
        () => reject(new Error(`timed out after ${options.timeoutMs}ms`)),
        options.timeoutMs + 15_000,
      );
    });
    const streamed = (async () => {
      for await (const event of run.stream()) messages.push(event);
      return run.wait();
    })();
    let result: {
      status?: string;
      result?: string;
      durationMs?: number;
      error?: { message?: string; code?: string };
      usage?: TurnUsage;
    };
    try {
      result = await Promise.race([streamed, giveUp]);
    } catch (error) {
      timedOut = true;
      result = {
        status: "cancelled",
        result: "",
        error: { message: error instanceof Error ? error.message : "timed out" },
      };
    } finally {
      clearTimeout(timer);
      if (giveUpTimer) clearTimeout(giveUpTimer);
      streamed.catch(() => {});
    }
    let agentUsage: AgentUsageSnapshot | null = null;
    try {
      agentUsage = (await agent.getUsage?.()) ?? null;
    } catch {
      agentUsage = null;
    }
    const tools = extractTools(messages);
    const answer = answerText(result.result, messages, run.agentId);
    const fallback = result.usage ?? agentUsage?.usage;
    const usage = splitUsage({
      messages,
      tools,
      fallback,
      parentAgentId: run.agentId,
      parentModel: options.model.id,
    });
    const systemTools = systemToolsOf(messages);
    const transcriptPath = path.join(resultsDir, options.runId, options.variant.name, `${options.task.id}.json`);
    fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });
    fs.writeFileSync(
      transcriptPath,
      JSON.stringify(
        {
          status: result.status ?? "unknown",
          result: result.result ?? "",
          answer,
          error: result.error ? { message: result.error.message ?? "", code: result.error.code ?? "" } : null,
          statusMessage: lastStatusMessage(messages),
          durationMs: result.durationMs ?? 0,
          usage: result.usage ?? null,
          agentUsage,
          usageByModel: usage,
          agentId: run.agentId,
          mode: options.mode,
          system: { tools: systemTools, model: systemModelOf(messages) },
          timedOut,
          tools: tools.map((tool) => ({
            name: tool.name,
            status: tool.status,
            ...(tool.agentId ? { agentId: tool.agentId } : {}),
            args: tool.args,
            resultBytes: JSON.stringify(tool.result ?? "").length,
          })),
        },
        null,
        2,
      ),
    );
    const sdkError = result.status === "error" ? result.error?.message || result.status : undefined;
    return {
      systemTools,
      score: scoreTask({
        task: options.task,
        finalText: answer,
        corpusRoot: workspace,
        useHookLog: options.variant.policy,
        policy: options.variant.policy,
        hookEvents: readHookEvents(logPath),
        tools,
        usage,
        durationMs: result.durationMs ?? 0,
        incomplete: timedOut || result.status === "error" || result.status === "cancelled",
        sdkError,
        parentAgentId: run.agentId,
      }),
    };
  } finally {
    if (previousLog == null) delete process.env.GATE_LOG_PATH;
    else process.env.GATE_LOG_PATH = previousLog;
    const hookCopy = path.join(resultsDir, options.runId, options.variant.name, `${options.task.id}.hook.jsonl`);
    try {
      if (fs.existsSync(logPath)) {
        fs.mkdirSync(path.dirname(hookCopy), { recursive: true });
        fs.copyFileSync(logPath, hookCopy);
      }
    } catch (error) {
      console.error(`hook log copy failed: ${error instanceof Error ? error.message : error}`);
    }
    try {
      await agent?.[Symbol.asyncDispose]?.();
    } catch (error) {
      console.error(`agent dispose failed: ${error instanceof Error ? error.message : error}`);
    }
    try {
      await store?.dispose();
    } catch (error) {
      console.error(`store dispose failed: ${error instanceof Error ? error.message : error}`);
    }
    try {
      fs.rmSync(workspace, { recursive: true, force: true });
      fs.rmSync(stateRoot, { recursive: true, force: true });
    } catch (error) {
      console.error(`cleanup failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    help();
    return;
  }
  const config = loadConfig();
  const tier = readFlag("tier")[0] ?? "core";
  if (!config.tiers[tier]) {
    throw new Error(`Unknown tier ${tier}. Use smoke, core, or full.`);
  }
  const repeats = Number(readFlag("repeats")[0] ?? config.tiers[tier].repeats);
  const variantNames = readFlag("variant");
  const variants = (variantNames.length ? variantNames : ["baseline", "current"]).map(resolveVariant);
  const tasks = loadTasks(tasksDir, tier);
  if (tasks.length === 0) throw new Error(`No tasks for tier ${tier}`);

  loadLocalEnv();
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error("Put CURSOR_API_KEY in .env at the repo root.");
  }

  const sdk = (await import("@cursor/sdk")) as {
    Agent: Parameters<typeof runTask>[0]["Agent"];
    Cursor: { models: { list: (opts: { apiKey: string }) => Promise<unknown> } };
  };
  const modelList = await sdk.Cursor.models.list({ apiKey });
  const parent = resolveParentModel(modelList, config.parentModel, config.parentEffort);
  const fileReaderModels = new Map<string, { id: string; params?: ModelParam[] }>();
  for (const variant of variants) {
    if (!variant.agent) continue;
    const raw = fileReaderDefinition(variant.agent).model.id;
    if (fileReaderModels.has(raw)) continue;
    const resolved = resolveFileReaderModel(modelList, raw);
    fileReaderModels.set(raw, { id: resolved.id, ...(resolved.params ? { params: resolved.params } : {}) });
  }
  let mode = parentModeOf(config);

  const index = loadIndex();
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  let failed = false;

  for (const variant of variants) {
    const repeatScores: TaskScore[][] = [];
    for (let repeat = 0; repeat < repeats; repeat += 1) {
      const scores: TaskScore[] = [];
      for (const task of tasks) {
        console.log(`${variant.name} repeat ${repeat + 1}/${repeats} ${task.id}`);
        const readerModel = variant.agent
          ? fileReaderModels.get(fileReaderDefinition(variant.agent).model.id)
          : undefined;
        try {
          let outcome = await runTask({
            Agent: sdk.Agent,
            apiKey,
            model: { id: parent.id, ...(parent.params ? { params: parent.params } : {}) },
            fileReaderModel: readerModel,
            variant,
            task,
            timeoutMs: config.taskTimeoutMs,
            runId,
            mode,
          });
          if (mode === "plan" && outcome.systemTools && !offersTask(outcome.systemTools)) {
            console.log(`${variant.name} ${task.id}: plan mode did not offer the task tool; rerunning in agent mode`);
            mode = "agent";
            outcome = await runTask({
              Agent: sdk.Agent,
              apiKey,
              model: { id: parent.id, ...(parent.params ? { params: parent.params } : {}) },
              fileReaderModel: readerModel,
              variant,
              task,
              timeoutMs: config.taskTimeoutMs,
              runId,
              mode,
            });
          }
          scores.push(outcome.score);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`${task.id} failed: ${message}`);
          scores.push(
            scoreTask({
              task,
              finalText: "",
              corpusRoot,
              useHookLog: variant.policy,
              policy: variant.policy,
              hookEvents: [],
              tools: [],
              incomplete: true,
              sdkError: message,
            }),
          );
        }
      }
      repeatScores.push(scores);
    }
    const previous =
      [...index.runs].reverse().find((run) => run.variant === variant.name && run.tier === tier) ?? null;
    const summary = summarizeRun({
      id: `${runId}-${variant.name}`,
      variant: variant.name,
      tier,
      parentModel: parent.label,
      createdAt: new Date().toISOString(),
      policy: variant.policy,
      taskMeta: tasks,
      repeatScores,
      previous,
    });
    index.runs.push(summary);
    writeIndex(index);
    printRun(summary);
    if (summary.harnessFailure || summary.regression) failed = true;
  }

  const comparison = latestComparison(index.runs, tier);
  const ranPair = variants.some((variant) => variant.name === "baseline")
    && variants.some((variant) => variant.name === "current");
  if (comparison && ranPair) {
    console.log("");
    printComparison(comparison);
    if (!comparison.passed) failed = true;
  }

  console.log(`results ${indexPath}`);
  console.log(`dashboard ${path.join(repoRoot, "bench", "dashboard", "index.html")}`);
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
