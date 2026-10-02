/**
 * Deny unbounded file reads from Claude so raw file bodies stay out of its
 * transcript. Grok (the file-reader subagent) and small ranged reads are allowed.
 * Fail open: unexpected errors print allow and exit 0.
 *
 * Set GATE_LOG_PATH to append JSONL there instead of the default text log.
 */
import { decide, logDecision } from "./gate-lib.mjs";

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

try {
  const raw = (await readStdin()).replace(/^\uFEFF/, "").trim();
  const input = JSON.parse(raw || "{}");
  const decision = decide(input);
  logDecision(input, decision);
  process.stdout.write(JSON.stringify(decision));
} catch (error) {
  process.stderr.write(`gate-parent-reads fail-open: ${error}\n`);
  try {
    logDecision({}, { permission: "allow" }, { failOpen: true });
  } catch (logError) {
    process.stderr.write(`gate-parent-reads log failed: ${logError}\n`);
  }
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}
