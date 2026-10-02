/**
 * Pure decisions for the parent-read gate. The CLI wrapper imports this so
 * tests can call decide() without reading stdin.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const MAX_READ_LINES = 80;
export const DEFAULT_LOG_PATH = path.join(os.homedir(), ".cursor", "hooks", "gate-parent-reads.log");

export function asObject(value) {
  if (value && typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

export function modelText(input) {
  return [input.model, input.model_id].filter(Boolean).join(" ");
}

export function isGrok(input) {
  return /grok/i.test(modelText(input));
}

export function isClaude(input) {
  return /claude/i.test(modelText(input));
}

export function isFileDump(command) {
  const segments = String(command).split(/\n|&&|\|\||[|;&]/);
  return segments.some((segment) => {
    const line = segment.trim();
    if (/^cat\b/i.test(line) && !/^cat\s*<</i.test(line)) return true;
    if (/^(head|tail)\b/i.test(line)) return true;
    if (/^(Get-Content|gc)\b/i.test(line)) return true;
    const typeArg = line.match(/^type\s+(?!-)(\S+)/i)?.[1];
    return Boolean(typeArg && /[\\/]|\.[a-z0-9]{1,8}$/i.test(typeArg));
  });
}

export function decide(input) {
  if (isGrok(input) || !isClaude(input)) {
    return { permission: "allow" };
  }

  const toolName = input.tool_name;
  const toolInput = asObject(input.tool_input);

  if (toolName === "Read") {
    const limit = Number(toolInput.limit);
    if (Number.isFinite(limit) && limit > 0 && limit <= MAX_READ_LINES) {
      return { permission: "allow" };
    }
    const filepath = toolInput.path || toolInput.file_path || "that file";
    return {
      permission: "deny",
      user_message: "Blocked a full-file read so Claude's context stays small. file-reader should answer this.",
      agent_message: `Do not read the whole file ${filepath}. Call the file-reader subagent with that path and a specific question. It returns a short answer with line citations. You may Read a cited slice only when limit is ${MAX_READ_LINES} lines or fewer.`,
    };
  }

  if (toolName === "Shell" && isFileDump(toolInput.command)) {
    return {
      permission: "deny",
      user_message: "Blocked a shell file dump so Claude's context stays small. file-reader should answer this.",
      agent_message:
        "Do not dump file contents with cat, type, Get-Content, head, or tail. Call the file-reader subagent with a path and a specific question, or use rg for a symbol search.",
    };
  }

  return { permission: "allow" };
}

export function logRecord(input, decision, { failOpen = false } = {}) {
  const toolInput = asObject(input?.tool_input);
  const limit = toolInput.limit;
  const offset = toolInput.offset;
  return {
    ts: new Date().toISOString(),
    tool: input?.tool_name || "",
    model: input?.model || "",
    modelId: input?.model_id || "",
    permission: decision.permission,
    path: toolInput.path || toolInput.file_path || "",
    limit: limit == null || limit === "" ? null : Number(limit),
    offset: offset == null || offset === "" ? null : Number(offset),
    command: typeof toolInput.command === "string" ? toolInput.command.slice(0, 500) : "",
    failOpen: Boolean(failOpen),
    cwd: process.cwd(),
  };
}

export function jsonLogPath() {
  try {
    const marker = path.resolve(".cursor/gate-log-path.txt");
    if (fs.existsSync(marker)) {
      const fromMarker = fs.readFileSync(marker, "utf8").trim();
      if (fromMarker) return fromMarker;
    }
  } catch {
    // Fall through to the env path.
  }
  return process.env.GATE_LOG_PATH || null;
}

export function logDecision(input, decision, options = {}) {
  const record = logRecord(input, decision, options);
  const target = record.path || record.command || "";
  const textLine = [
    record.ts,
    `tool=${record.tool}`,
    `model=${record.model}`,
    `model_id=${record.modelId}`,
    `permission=${record.permission}`,
    `target=${String(target).replace(/\s+/g, " ").slice(0, 180)}`,
  ].join(" ");
  process.stderr.write(`gate-parent-reads ${textLine}\n`);
  const jsonPath = jsonLogPath();
  try {
    if (jsonPath) {
      fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
      fs.appendFileSync(jsonPath, `${JSON.stringify(record)}\n`);
    } else {
      fs.mkdirSync(path.dirname(DEFAULT_LOG_PATH), { recursive: true });
      fs.appendFileSync(DEFAULT_LOG_PATH, `${textLine}\n`);
    }
  } catch (error) {
    process.stderr.write(`gate-parent-reads log failed: ${error}\n`);
  }
  return record;
}
