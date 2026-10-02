import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decide, logDecision } from "../../hooks/gate-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("claude unbounded read is denied", () => {
  const decision = decide({
    model: "claude-opus-5",
    tool_name: "Read",
    tool_input: { path: "src/billing/settle.ts" },
  });
  assert.equal(decision.permission, "deny");
  assert.match(decision.agent_message, /file-reader/);
});

test("claude ranged read at the limit is allowed", () => {
  const decision = decide({
    model_id: "claude-sonnet",
    tool_name: "Read",
    tool_input: { path: "src/notify/pager.ts", limit: 80 },
  });
  assert.equal(decision.permission, "allow");
});

test("claude read above 80 lines is denied", () => {
  const decision = decide({
    model: "claude-opus-5",
    tool_name: "Read",
    tool_input: { limit: 81, path: "src/billing/settle.ts" },
  });
  assert.equal(decision.permission, "deny");
});

test("grok unbounded read is allowed", () => {
  const decision = decide({
    model: "grok-4.7-high",
    tool_name: "Read",
    tool_input: { path: "src/billing/settle.ts" },
  });
  assert.equal(decision.permission, "allow");
});

test("non-claude models are allowed", () => {
  const decision = decide({
    model: "composer-2.5",
    tool_name: "Read",
    tool_input: { path: "src/billing/settle.ts" },
  });
  assert.equal(decision.permission, "allow");
});

test("claude shell dumps are denied and rg is allowed", () => {
  const dumped = decide({
    model: "claude-opus-5",
    tool_name: "Shell",
    tool_input: { command: "cat src/billing/settle.ts" },
  });
  assert.equal(dumped.permission, "deny");
  for (const command of ["head -n 20 src/a.ts", "Get-Content src/a.ts", "gc .\\a.ts", "type src\\a.ts"]) {
    assert.equal(
      decide({ model: "claude", tool_name: "Shell", tool_input: { command } }).permission,
      "deny",
      command,
    );
  }
  assert.equal(
    decide({
      model: "claude-opus-5",
      tool_name: "Shell",
      tool_input: { command: "rg SESSION_TTL src" },
    }).permission,
    "allow",
  );
  assert.equal(
    decide({
      model: "claude-opus-5",
      tool_name: "Shell",
      tool_input: { command: "cat <<EOF\nhello\nEOF" },
    }).permission,
    "allow",
  );
});

test("GATE_LOG_PATH writes JSONL and skips the text log", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-log-"));
  const logPath = path.join(dir, "events.jsonl");
  const previous = process.env.GATE_LOG_PATH;
  process.env.GATE_LOG_PATH = logPath;
  try {
    logDecision(
      {
        model: "claude-opus-5",
        model_id: "claude-opus-5",
        tool_name: "Read",
        tool_input: { path: "src/billing/settle.ts", limit: 80, offset: 10 },
      },
      { permission: "allow" },
    );
  } finally {
    if (previous == null) delete process.env.GATE_LOG_PATH;
    else process.env.GATE_LOG_PATH = previous;
  }
  const record = JSON.parse(fs.readFileSync(logPath, "utf8").trim());
  assert.equal(record.tool, "Read");
  assert.equal(record.model, "claude-opus-5");
  assert.equal(record.permission, "allow");
  assert.equal(record.path, "src/billing/settle.ts");
  assert.equal(record.limit, 80);
  assert.equal(record.offset, 10);
  assert.equal(record.failOpen, false);
});

test("invalid hook input fail-opens and records failOpen", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-fail-"));
  const logPath = path.join(dir, "events.jsonl");
  const result = spawnSync(process.execPath, ["hooks/gate-parent-reads.mjs"], {
    cwd: repoRoot,
    input: "{not json",
    encoding: "utf8",
    env: { ...process.env, GATE_LOG_PATH: logPath },
  });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).permission, "allow");
  const record = JSON.parse(fs.readFileSync(logPath, "utf8").trim());
  assert.equal(record.failOpen, true);
  assert.equal(record.permission, "allow");
});
