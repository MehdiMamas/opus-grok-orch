import fs from "node:fs";
import path from "node:path";
import { isFileDump } from "../../hooks/gate-lib.mjs";

export const MAX_RANGED_LINES = 80;
export const QUALITY_DROP_LIMIT = 5;

const NOT_FOUND =
  /\b(not found|does not exist|doesn't exist|do not exist|no such|isn't defined|is not defined|is not present|isn't present|unable to find|could not find|couldn't find|cannot find|can't find|not in the (repo|codebase|repository|project|code))\b/i;

const CITATION =
  /([A-Za-z0-9_./\\-]+\.(?:ts|tsx|js|mjs|md)):(\d+)(?:\s*[-–]\s*(\d+))?/g;

export type Task = {
  id: string;
  title: string;
  tiers: string[];
  kind: string;
  prompt: string;
  requiredFacts: string[];
  forbiddenFacts: string[];
  citationMustContain: string[];
  requiredOrder?: string[];
  expectNotFound: boolean;
};

export type HookEvent = {
  tool?: string;
  model?: string;
  modelId?: string;
  permission?: string;
  path?: string;
  limit?: number | null;
  offset?: number | null;
  command?: string;
  failOpen?: boolean;
  cwd?: string;
};

export type TranscriptTool = {
  name: string;
  status: string;
  agentId?: string;
  args?: unknown;
  result?: unknown;
};

export type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type UsageSplit = {
  claude: TokenCounts;
  grok: TokenCounts;
  unattributed: TokenCounts;
};

export type TaskScore = {
  taskId: string;
  quality: number;
  parentFileBytes: number;
  workerTextBytes: number;
  delegation: number;
  denies: number;
  allows: number;
  failOpens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  usage: UsageSplit;
  durationMs: number;
  flags: string[];
  harnessReasons: string[];
  incomplete: boolean;
};

export function extractTools(messages: unknown[]): TranscriptTool[] {
  const tools: TranscriptTool[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const event = message as Record<string, unknown>;
    if (event.type !== "tool_call") continue;
    if (event.status !== "completed" && event.status !== "error") continue;
    tools.push({
      name: String(event.name ?? ""),
      status: String(event.status),
      ...(agentIdOf(event) ? { agentId: agentIdOf(event) } : {}),
      args: event.args,
      result: event.result,
    });
  }
  return tools;
}

export function isClaudeModel(model: string | undefined, modelId?: string): boolean {
  return /claude/i.test(`${model ?? ""} ${modelId ?? ""}`);
}

export function isGrokModel(model: string | undefined, modelId?: string): boolean {
  return /grok/i.test(`${model ?? ""} ${modelId ?? ""}`);
}

export function emptyTokenCounts(): TokenCounts {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

export function emptyUsageSplit(): UsageSplit {
  return { claude: emptyTokenCounts(), grok: emptyTokenCounts(), unattributed: emptyTokenCounts() };
}

const TOKEN_FIELDS = ["inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"] as const;

function addTokenCounts(into: TokenCounts, extra: TokenCounts) {
  for (const field of TOKEN_FIELDS) into[field] += extra[field];
}

export function usageTotal(split: UsageSplit, field: (typeof TOKEN_FIELDS)[number]): number {
  return split.claude[field] + split.grok[field] + split.unattributed[field];
}

function tokenCounts(value: unknown): TokenCounts | null {
  const record = asRecord(value);
  if (typeof record.inputTokens !== "number") return null;
  const counts = emptyTokenCounts();
  for (const field of TOKEN_FIELDS) {
    const n = Number(record[field]);
    counts[field] = Number.isFinite(n) ? n : 0;
  }
  return counts;
}

function modelName(model: unknown): string {
  if (typeof model === "string") return model;
  const record = asRecord(model);
  if (typeof record.id === "string") return record.id;
  return "";
}

function agentIdOf(record: Record<string, unknown>): string {
  if (typeof record.agent_id === "string") return record.agent_id;
  if (typeof record.agentId === "string") return record.agentId;
  return "";
}

function usageBucket(model: string): keyof UsageSplit {
  if (isClaudeModel(model)) return "claude";
  if (isGrokModel(model)) return "grok";
  return "unattributed";
}

type FoundUsage = { agentId: string; counts: TokenCounts };

function findUsages(value: unknown, inheritedAgent: string, out: FoundUsage[]) {
  if (Array.isArray(value)) {
    for (const item of value) findUsages(item, inheritedAgent, out);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const agentId = agentIdOf(record) || inheritedAgent;
  if (record.type === "usage") {
    const counts = tokenCounts(record.usage);
    if (counts) out.push({ agentId, counts });
    return;
  }
  const counts = tokenCounts(record);
  if (counts && record.usage == null) {
    out.push({ agentId, counts });
    return;
  }
  for (const child of Object.values(record)) findUsages(child, agentId, out);
}

/**
 * Splits token usage by model. A usage event's model comes from its agent's
 * system event. Given the parent agent id and model, events from the parent
 * (or with no agent id) count toward the parent model, and so does the run
 * total fallback when the parent reported no per-turn usage.
 */
export function splitUsage(options: {
  messages: unknown[];
  tools: TranscriptTool[];
  fallback?: Partial<TokenCounts> | null;
  parentAgentId?: string;
  parentModel?: string;
}): UsageSplit {
  const models = new Map<string, string>();
  for (const message of options.messages) {
    if (!message || typeof message !== "object") continue;
    const event = message as Record<string, unknown>;
    if (event.type !== "system") continue;
    const agentId = agentIdOf(event);
    const model = modelName(event.model);
    if (agentId && model) models.set(agentId, model);
  }
  const isParent = (agentId: string) => !agentId || agentId === options.parentAgentId;
  const modelFor = (agentId: string): string =>
    (agentId ? models.get(agentId) : undefined) ?? (isParent(agentId) ? options.parentModel ?? "" : "");

  const split = emptyUsageSplit();
  const countedAgents = new Set<string>();
  let sawUsage = false;
  let parentReported = false;
  for (const message of options.messages) {
    if (!message || typeof message !== "object") continue;
    const event = message as Record<string, unknown>;
    if (event.type !== "usage") continue;
    const counts = tokenCounts(event.usage);
    if (!counts) continue;
    sawUsage = true;
    const agentId = agentIdOf(event);
    if (isParent(agentId)) parentReported = true;
    addTokenCounts(split[usageBucket(modelFor(agentId))], counts);
    if (agentId) countedAgents.add(agentId);
  }

  for (const tool of options.tools) {
    const args = toolArgs(tool);
    const model = typeof args.model === "string" ? args.model : modelName(args.model);
    if (!isFileReaderCall(tool) && !isGrokModel(model)) continue;
    const found: FoundUsage[] = [];
    findUsages(tool.result, "", found);
    for (const usage of found) {
      if (usage.agentId && countedAgents.has(usage.agentId)) continue;
      sawUsage = true;
      addTokenCounts(split.grok, usage.counts);
      if (usage.agentId) countedAgents.add(usage.agentId);
    }
  }

  if (!parentReported && options.fallback) {
    const counts = tokenCounts({
      inputTokens: options.fallback.inputTokens ?? 0,
      outputTokens: options.fallback.outputTokens ?? 0,
      cacheReadTokens: options.fallback.cacheReadTokens ?? 0,
      cacheWriteTokens: options.fallback.cacheWriteTokens ?? 0,
    });
    // The fallback is a run total that may include subagent turns. Credit it to
    // the parent only when no subagent usage was found, so nothing is counted twice.
    if (counts && !sawUsage) {
      if (options.parentModel) addTokenCounts(split[usageBucket(options.parentModel)], counts);
      else split.unattributed = counts;
    }
  }
  return split;
}

/**
 * The run result when present, else the last streamed assistant segment.
 * Assistant events are text deltas, so they join with no separator. A tool
 * call or task event ends a segment, which keeps narration before
 * tool calls and answers from a retried turn out of the scored text.
 */
export function answerText(result: string | undefined, messages: unknown[], agentId?: string): string {
  if ((result ?? "").trim()) return result ?? "";
  const segments: string[] = [];
  let current: string[] = [];
  const close = () => {
    const text = current.join("");
    if (text.trim()) segments.push(text);
    current = [];
  };
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const event = message as Record<string, unknown>;
    if (agentId && agentIdOf(event) && agentIdOf(event) !== agentId) continue;
    if (event.type === "tool_call" || event.type === "task") {
      close();
      continue;
    }
    if (event.type !== "assistant") continue;
    const content = asRecord(event.message).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const record = asRecord(block);
      if (record.type === "text" && typeof record.text === "string") current.push(record.text);
    }
  }
  close();
  return segments.at(-1) ?? "";
}

export function lastStatusMessage(messages: unknown[]): string {
  let last = "";
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const event = message as Record<string, unknown>;
    if (event.type === "status" && typeof event.message === "string" && event.message.trim()) last = event.message;
  }
  return last;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function toolArgs(tool: TranscriptTool): Record<string, unknown> {
  return asRecord(tool.args);
}

export function resultText(result: unknown): string {
  if (typeof result === "string") return result;
  const record = asRecord(result);
  if (typeof record.stdout === "string") return record.stdout;
  if (typeof record.output === "string") return record.output;
  if (result == null) return "";
  return JSON.stringify(result);
}

export function isFileReaderCall(tool: TranscriptTool): boolean {
  const blob = JSON.stringify({ name: tool.name, args: tool.args }).toLowerCase();
  return blob.includes("file-reader") || blob.includes("file_reader");
}

function readPath(args: Record<string, unknown>): string {
  const value = args.path ?? args.file_path ?? args.target_file ?? args.file ?? "";
  return typeof value === "string" ? value : "";
}

function numeric(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function sliceBytes(fileText: string, offset: number | null, limit: number | null): number {
  const lines = fileText.split(/\r?\n/);
  const start = offset && offset > 0 ? offset - 1 : 0;
  const end = limit && limit > 0 ? start + limit : lines.length;
  return Buffer.byteLength(lines.slice(start, Math.max(start, end)).join("\n"), "utf8");
}

export function resolveCorpusFile(corpusRoot: string, citedPath: string): string | null {
  const normalized = citedPath.replace(/\\/g, "/").replace(/^\.\//, "");
  const direct = path.join(corpusRoot, normalized);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

  const srcAt = normalized.lastIndexOf("src/");
  if (srcAt >= 0) {
    const fromSrc = path.join(corpusRoot, normalized.slice(srcAt));
    if (fs.existsSync(fromSrc) && fs.statSync(fromSrc).isFile()) return fromSrc;
  }

  const base = path.basename(normalized);
  const matches: string[] = [];
  walkFiles(corpusRoot, (file) => {
    if (path.basename(file) === base) matches.push(file);
  });
  return matches.length === 1 ? matches[0] : null;
}

function walkFiles(dir: string, visit: (file: string) => void) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, visit);
    else visit(abs);
  }
}

function dumpTarget(command: string): string | null {
  const parts = command.trim().split(/\s+/);
  const args = parts.slice(1).filter((part) => part && !part.startsWith("-"));
  return args[0]?.replace(/^['"]|['"]$/g, "") ?? null;
}

function fileSliceBytes(corpusRoot: string, filePath: string, offset: number | null, limit: number | null): number {
  const resolved = resolveCorpusFile(corpusRoot, filePath);
  if (!resolved) return 0;
  return sliceBytes(fs.readFileSync(resolved, "utf8"), offset, limit);
}

function isCursorInternalPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized === ".cursor" || normalized.startsWith(".cursor/") || normalized.includes("/.cursor/");
}

function unboundedRead(limit: number | null): boolean {
  return limit == null || limit <= 0 || limit > MAX_RANGED_LINES;
}

function isParentTranscriptTool(tool: TranscriptTool, parentAgentId: string | undefined): boolean {
  if (!tool.agentId) return true;
  if (!parentAgentId) return false;
  return tool.agentId === parentAgentId;
}

function transcriptParentStats(
  corpusRoot: string,
  tools: TranscriptTool[],
  parentAgentId: string | undefined,
  onlyParent: boolean,
): { bytes: number; parentDump: boolean; unboundedCorpusRead: boolean } {
  let bytes = 0;
  let parentDump = false;
  let unboundedCorpusRead = false;
  for (const tool of tools) {
    if (onlyParent && !isParentTranscriptTool(tool, parentAgentId)) continue;
    const args = toolArgs(tool);
    const name = tool.name.toLowerCase();
    if (name === "read") {
      const filePath = readPath(args);
      if (isCursorInternalPath(filePath)) continue;
      const limit = numeric(args.limit);
      const offset = numeric(args.offset);
      const resolved = resolveCorpusFile(corpusRoot, filePath);
      const fromFile = resolved ? sliceBytes(fs.readFileSync(resolved, "utf8"), offset, limit) : 0;
      bytes += fromFile > 0 ? fromFile : Buffer.byteLength(resultText(tool.result), "utf8");
      if (unboundedRead(limit)) {
        parentDump = true;
        if (resolved) unboundedCorpusRead = true;
      }
    } else if (name === "shell") {
      const command = typeof args.command === "string" ? args.command : "";
      if (!command || !isFileDump(command)) continue;
      const target = dumpTarget(command);
      if (target && isCursorInternalPath(target)) continue;
      bytes += Buffer.byteLength(resultText(tool.result), "utf8");
      parentDump = true;
      if (target && resolveCorpusFile(corpusRoot, target)) unboundedCorpusRead = true;
    }
  }
  return { bytes, parentDump, unboundedCorpusRead };
}

export function measureParentFileBytes(options: {
  corpusRoot: string;
  useHookLog: boolean;
  hookEvents: HookEvent[];
  tools: TranscriptTool[];
  parentAgentId?: string;
}): {
  parentFileBytes: number;
  denies: number;
  allows: number;
  failOpens: number;
  claudeReadEvents: number;
  grokReadEvents: number;
  parentDump: boolean;
  hookSilent: boolean;
  unboundedParentCorpusRead: boolean;
} {
  const { corpusRoot, useHookLog, hookEvents, tools } = options;
  let parentFileBytes = 0;
  let denies = 0;
  let allows = 0;
  let failOpens = 0;
  let claudeReadEvents = 0;
  let grokReadEvents = 0;
  let parentDump = false;
  let unboundedParentCorpusRead = false;

  const transcriptReads = tools.filter((tool) => tool.name.toLowerCase() === "read").length;

  if (useHookLog) {
    for (const event of hookEvents) {
      if (event.failOpen) failOpens += 1;
      if (event.permission === "deny") denies += 1;
      else if (event.permission === "allow" && !event.failOpen) allows += 1;

      const claude = isClaudeModel(event.model, event.modelId);
      const grok = isGrokModel(event.model, event.modelId);
      const toolName = (event.tool ?? "").toLowerCase();
      if (toolName === "read") {
        if (claude) claudeReadEvents += 1;
        if (grok) grokReadEvents += 1;
      }
      // An empty model is not Grok, so it counts as the parent.
      if (grok || event.permission !== "allow" || event.failOpen) continue;

      if (toolName === "read") {
        const filePath = event.path ?? "";
        if (isCursorInternalPath(filePath)) continue;
        const limit = event.limit ?? null;
        parentFileBytes += fileSliceBytes(corpusRoot, filePath, event.offset ?? null, limit);
        if (unboundedRead(limit)) parentDump = true;
      } else if (toolName === "shell" && event.command && isFileDump(event.command)) {
        const target = dumpTarget(event.command);
        if (!target || isCursorInternalPath(target)) continue;
        parentFileBytes += fileSliceBytes(corpusRoot, target, null, null);
        parentDump = true;
      }
    }
    const transcript = transcriptParentStats(corpusRoot, tools, options.parentAgentId, true);
    if (transcript.bytes > parentFileBytes) parentFileBytes = transcript.bytes;
    if (transcript.parentDump) parentDump = true;
    unboundedParentCorpusRead = transcript.unboundedCorpusRead;
  } else {
    const transcript = transcriptParentStats(corpusRoot, tools, options.parentAgentId, false);
    parentFileBytes = transcript.bytes;
    parentDump = transcript.parentDump;
    unboundedParentCorpusRead = transcript.unboundedCorpusRead;
  }

  return {
    parentFileBytes,
    denies,
    allows,
    failOpens,
    claudeReadEvents,
    grokReadEvents,
    parentDump,
    hookSilent: useHookLog && transcriptReads > 0 && hookEvents.length === 0,
    unboundedParentCorpusRead,
  };
}

function ordered(text: string, facts: string[]): boolean {
  let from = 0;
  for (const fact of facts) {
    const at = text.indexOf(fact, from);
    if (at < 0) return false;
    from = at + fact.length;
  }
  return true;
}

export function scoreAnswer(task: Task, finalText: string, corpusRoot: string): {
  quality: number;
  flags: string[];
} {
  const text = finalText ?? "";
  const forbiddenHit = task.forbiddenFacts.some((fact) => fact && text.includes(fact));
  const decoyOk = forbiddenHit ? 0 : 1;
  const flags: string[] = [];

  if (task.expectNotFound) {
    const notFound = NOT_FOUND.test(text);
    if (!notFound) flags.push("factMiss");
    const quality = notFound && decoyOk ? 100 : notFound ? 40 : 0;
    return { quality, flags };
  }

  const factHits = task.requiredFacts.filter((fact) => text.includes(fact)).length;
  const orderOk = !task.requiredOrder?.length || ordered(text, task.requiredOrder);
  const factDenom = task.requiredFacts.length + (task.requiredOrder?.length ? 1 : 0);
  const factNumer = factHits + (task.requiredOrder?.length && orderOk ? 1 : 0);
  const factRatio = factDenom === 0 ? 1 : factNumer / factDenom;
  const citationOk = citationHits(task, text, corpusRoot) ? 1 : 0;

  if (factRatio < 1) flags.push("factMiss");
  if (!citationOk) flags.push("badCitation");
  if (!decoyOk) flags.push("decoyHit");

  const quality = Math.round(100 * (0.5 * factRatio + 0.2 * decoyOk + 0.3 * citationOk));
  return { quality, flags };
}

function citationHits(task: Task, text: string, corpusRoot: string): boolean {
  const needles = task.citationMustContain.length > 0 ? task.citationMustContain : task.requiredFacts;
  if (needles.length === 0) return true;
  for (const match of text.matchAll(CITATION)) {
    const file = resolveCorpusFile(corpusRoot, match[1]);
    if (!file) continue;
    const start = Number(match[2]);
    const end = match[3] ? Number(match[3]) : start;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const lo = Math.max(1, Math.min(start, end));
    const hi = Math.max(start, end);
    const slice = lines.slice(lo - 1, hi).join("\n");
    if (needles.some((needle) => slice.includes(needle))) return true;
  }
  return false;
}

export function scoreTask(options: {
  task: Task;
  finalText: string;
  corpusRoot: string;
  useHookLog: boolean;
  policy: boolean;
  hookEvents: HookEvent[];
  tools: TranscriptTool[];
  cacheWriteTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  usage?: UsageSplit;
  durationMs?: number;
  incomplete?: boolean;
  sdkError?: string;
  parentAgentId?: string;
}): TaskScore {
  const answer = scoreAnswer(options.task, options.finalText, options.corpusRoot);
  const usage = options.usage ?? {
    claude: emptyTokenCounts(),
    grok: emptyTokenCounts(),
    unattributed: {
      inputTokens: options.inputTokens ?? 0,
      outputTokens: options.outputTokens ?? 0,
      cacheReadTokens: options.cacheReadTokens ?? 0,
      cacheWriteTokens: options.cacheWriteTokens ?? 0,
    },
  };
  const bytes = measureParentFileBytes(options);
  const delegation = options.tools.filter(isFileReaderCall).length;
  const workerTextBytes = options.tools
    .filter(isFileReaderCall)
    .reduce((sum, tool) => sum + Buffer.byteLength(resultText(tool.result), "utf8"), 0);

  const flags = [...answer.flags];
  if (bytes.parentDump) flags.push("parentDump");
  if (delegation === 0) flags.push("noDelegation");
  if (bytes.hookSilent) flags.push("hookSilent");

  const harnessReasons: string[] = [];
  if (options.sdkError) harnessReasons.push("sdkError");
  if (options.incomplete) harnessReasons.push("stalled");
  if (options.policy) {
    if (delegation === 0) harnessReasons.push("noDelegation");
    if (delegation > 0 && bytes.grokReadEvents === 0 && bytes.claudeReadEvents > 0) {
      harnessReasons.push("workerReadsLookLikeClaude");
    }
    if (bytes.hookSilent) harnessReasons.push("hookSilent");
    if (bytes.unboundedParentCorpusRead && bytes.denies === 0) harnessReasons.push("gateNotEnforced");
  }

  return {
    taskId: options.task.id,
    quality: answer.quality,
    parentFileBytes: bytes.parentFileBytes,
    workerTextBytes,
    delegation,
    denies: bytes.denies,
    allows: bytes.allows,
    failOpens: bytes.failOpens,
    cacheWriteTokens: usageTotal(usage, "cacheWriteTokens"),
    inputTokens: usageTotal(usage, "inputTokens"),
    usage,
    durationMs: options.durationMs ?? 0,
    flags,
    harnessReasons,
    incomplete: Boolean(options.incomplete),
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function efficiency(quality: number, parentFileBytes: number): number {
  return quality / Math.log10(parentFileBytes + 10);
}

export type BaselineComparison = {
  tier: string;
  beforeId: string;
  afterId: string;
  beforeQuality: number;
  afterQuality: number;
  qualityDelta: number;
  beforeParentFileBytes: number;
  afterParentFileBytes: number;
  parentFileBytesDelta: number;
  passed: boolean;
  reasons: string[];
};

export function compareToBaseline(before: SuiteRun, after: SuiteRun): BaselineComparison {
  const qualityDelta = after.medianQuality - before.medianQuality;
  const parentFileBytesDelta = after.medianParentFileBytes - before.medianParentFileBytes;
  const reasons: string[] = [];
  if (before.tier !== after.tier) reasons.push("tierMismatch");
  if (before.medianQuality - after.medianQuality > QUALITY_DROP_LIMIT) reasons.push("qualityDrop");
  if (after.medianParentFileBytes >= before.medianParentFileBytes) reasons.push("parentBytesUp");
  if (before.harnessFailure) reasons.push("baselineHarnessFailure");
  if (after.harnessFailure) reasons.push("harnessFailure");
  return {
    tier: after.tier,
    beforeId: before.id,
    afterId: after.id,
    beforeQuality: before.medianQuality,
    afterQuality: after.medianQuality,
    qualityDelta,
    beforeParentFileBytes: before.medianParentFileBytes,
    afterParentFileBytes: after.medianParentFileBytes,
    parentFileBytesDelta,
    passed: reasons.length === 0,
    reasons,
  };
}

export type SuiteRun = {
  id: string;
  variant: string;
  tier: string;
  parentModel: string;
  createdAt: string;
  repeats: number;
  policy: boolean;
  medianQuality: number;
  medianParentFileBytes: number;
  medianCacheWriteTokens: number;
  medianInputTokens: number;
  medianUsage: UsageSplit;
  medianDurationMs: number;
  efficiency: number;
  regression: boolean;
  regressionAgainst: string | null;
  harnessFailure: boolean;
  harnessReasons: string[];
  failOpens: number;
  tasks: Array<{
    taskId: string;
    title: string;
    kind: string;
    medianQuality: number;
    medianParentFileBytes: number;
    flags: string[];
    harnessReasons: string[];
  }>;
};

export function summarizeRun(options: {
  id: string;
  variant: string;
  tier: string;
  parentModel: string;
  createdAt: string;
  policy: boolean;
  taskMeta: Array<Pick<Task, "id" | "title" | "kind">>;
  repeatScores: TaskScore[][];
  previous: Pick<SuiteRun, "id" | "medianQuality" | "medianParentFileBytes"> | null;
}): SuiteRun {
  const repeatQuality = options.repeatScores.map((scores) => {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score.quality, 0) / scores.length;
  });
  const repeatBytes = options.repeatScores.map((scores) =>
    scores.reduce((sum, score) => sum + score.parentFileBytes, 0),
  );
  const repeatCache = options.repeatScores.map((scores) =>
    scores.reduce((sum, score) => sum + score.cacheWriteTokens, 0),
  );
  const repeatInput = options.repeatScores.map((scores) =>
    scores.reduce((sum, score) => sum + score.inputTokens, 0),
  );
  const repeatUsage = options.repeatScores.map((scores) => {
    const summed = emptyUsageSplit();
    for (const score of scores) {
      addTokenCounts(summed.claude, score.usage.claude);
      addTokenCounts(summed.grok, score.usage.grok);
      addTokenCounts(summed.unattributed, score.usage.unattributed);
    }
    return summed;
  });
  const repeatDuration = options.repeatScores.map((scores) =>
    scores.reduce((sum, score) => sum + score.durationMs, 0),
  );

  const medianQuality = median(repeatQuality);
  const medianParentFileBytes = median(repeatBytes);
  const previous = options.previous;
  const regression = Boolean(
    previous &&
      (previous.medianQuality - medianQuality > QUALITY_DROP_LIMIT ||
        medianParentFileBytes > previous.medianParentFileBytes),
  );

  const tasks = options.taskMeta.map((task) => {
    const samples = options.repeatScores.map(
      (scores) => scores.find((score) => score.taskId === task.id) ?? emptyScore(task.id),
    );
    const flags = [...new Set(samples.flatMap((score) => score.flags))];
    const harnessReasons = [...new Set(samples.flatMap((score) => score.harnessReasons))];
    return {
      taskId: task.id,
      title: task.title,
      kind: task.kind,
      medianQuality: median(samples.map((score) => score.quality)),
      medianParentFileBytes: median(samples.map((score) => score.parentFileBytes)),
      flags,
      harnessReasons,
    };
  });

  const harnessReasons = [...new Set(tasks.flatMap((task) => task.harnessReasons))];

  return {
    id: options.id,
    variant: options.variant,
    tier: options.tier,
    parentModel: options.parentModel,
    createdAt: options.createdAt,
    repeats: options.repeatScores.length,
    policy: options.policy,
    medianQuality,
    medianParentFileBytes,
    medianCacheWriteTokens: median(repeatCache),
    medianInputTokens: median(repeatInput),
    medianUsage: medianUsage(repeatUsage),
    medianDurationMs: median(repeatDuration),
    efficiency: efficiency(medianQuality, medianParentFileBytes),
    regression,
    regressionAgainst: regression && previous ? previous.id : null,
    harnessFailure: harnessReasons.length > 0,
    harnessReasons,
    failOpens: options.repeatScores.reduce(
      (sum, scores) => sum + scores.reduce((inner, score) => inner + score.failOpens, 0),
      0,
    ),
    tasks,
  };
}

function medianUsage(splits: UsageSplit[]): UsageSplit {
  const result = emptyUsageSplit();
  const buckets = ["claude", "grok", "unattributed"] as const;
  for (const bucket of buckets) {
    for (const field of TOKEN_FIELDS) {
      result[bucket][field] = median(splits.map((split) => split[bucket][field]));
    }
  }
  return result;
}

function emptyScore(taskId: string): TaskScore {
  return {
    taskId,
    quality: 0,
    parentFileBytes: 0,
    workerTextBytes: 0,
    delegation: 0,
    denies: 0,
    allows: 0,
    failOpens: 0,
    cacheWriteTokens: 0,
    inputTokens: 0,
    usage: emptyUsageSplit(),
    durationMs: 0,
    flags: [],
    harnessReasons: [],
    incomplete: true,
  };
}

export function loadTasks(tasksDir: string, tier: string): Task[] {
  const tasks = fs
    .readdirSync(tasksDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(tasksDir, name), "utf8")) as Task);
  return tasks.filter((task) => task.tiers.includes(tier));
}
