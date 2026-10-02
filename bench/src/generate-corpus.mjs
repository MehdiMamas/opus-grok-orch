/**
 * Writes bench/corpus once. Re-run only when the planted facts change.
 * The checked-in tree is what the benchmark scores against.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const corpusRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../corpus");

function write(rel, contents) {
  const abs = path.join(corpusRoot, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents.endsWith("\n") ? contents : `${contents}\n`);
}

function pad(prefix, lines) {
  const chunks = [];
  let used = 0;
  let i = 0;
  while (used < lines) {
    const block = `export function ${prefix}${i}(n: number): number {
  const seed = ${i};
  if (n < 0) return seed;
  return seed + (n % ${3 + (i % 19)});
}
`;
    chunks.push(block);
    used += block.split("\n").length;
    i += 1;
  }
  return chunks.join("\n");
}

function filler(area, name) {
  return `import type { ModuleId } from "../shared/types";

export const id: ModuleId = "${area}-${name}";

export function ${name}(n: number): string {
  return \`\${id}:\${n}\`;
}
`;
}

const fillers = {
  billing: ["dunning", "credits", "receipts", "batchWindow", "currencyTable", "feeSchedule", "disputes", "payouts"],
  ledger: ["balances", "periods", "locks", "journals", "accountsView", "exports", "imports", "reconcile", "statements", "closures"],
  auth: ["tokens", "scopes", "tenantLookup", "mfa", "recovery", "audit", "devices", "invites"],
  webhooks: ["delivery", "inbox", "outbox", "retries", "deadLetter", "fanout", "metrics", "subscriptions"],
  notify: ["email", "sms", "push", "digest", "quietHours", "routing", "banners", "webhooksCopy"],
};

write(
  "package.json",
  JSON.stringify({ name: "harbor", private: true, type: "module" }, null, 2),
);

write(
  "tsconfig.json",
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        isolatedModules: true,
      },
      include: ["src"],
    },
    null,
    2,
  ),
);

write(
  "src/shared/types.ts",
  `export type ModuleId = string;
export type MinorUnits = number;
export type DeliveryId = string;
`,
);

write(
  "src/shared/clock.ts",
  `export const BUSINESS_TIMEZONE = "America/Chicago";

export function businessNow(epochMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour12: false,
  }).format(new Date(epochMs));
}
`,
);

write(
  "src/shared/ids.ts",
  `/** Offline fixtures sometimes label a fallback zone. The ledger does not use it. */
export const FALLBACK_TIMEZONE_DECOY = "UTC";

export function newId(prefix: string, n: number): string {
  return \`\${prefix}_\${n}\`;
}
`,
);

write(
  "src/shared/money.ts",
  `import type { MinorUnits } from "./types";

export function assertMinor(amount: MinorUnits): MinorUnits {
  if (!Number.isInteger(amount)) {
    throw new Error("amount must be an integer number of minor units");
  }
  return amount;
}
`,
);

write(
  "src/shared/errors.ts",
  `export class HarborError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
`,
);

write(
  "src/shared/result.ts",
  `export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}
`,
);

write(
  "src/billing/legacy-round.ts",
  `/** Retired rounding experiment. Settlement does not call this. */
export const HARBOR_DECOY_INVOICE_ROUNDING = "bankers-rounding";

export function legacyRound(minor: number): number {
  return HARBOR_DECOY_INVOICE_ROUNDING === "bankers-rounding" ? minor : minor;
}
`,
);

write(
  "src/billing/tax.ts",
  `export const TAX_ENGINE = "harbor-tax-table-2024";

export function taxMinor(netMinor: number): number {
  if (TAX_ENGINE !== "harbor-tax-table-2024") return 0;
  return Math.round(netMinor * 0.05);
}
`,
);

write(
  "src/billing/fees.ts",
  `/** Old vendor spike. Not consulted by settleInvoice. */
export const TAX_ENGINE_DECOY = "stripe-tax-decoy";

export function platformFee(minor: number): number {
  return Math.round(minor * 0.029) + 30;
}
`,
);

write(
  "src/billing/refund-review.ts",
  `export function queueManualRefundReview(refundId: string, minor: number): string {
  return \`review:\${refundId}:\${minor}\`;
}
`,
);

write(
  "src/billing/refunds.ts",
  `import { queueManualRefundReview } from "./refund-review";

export const REFUND_REVIEW_THRESHOLD_MINOR = 250000;

export function requestRefund(refundId: string, minor: number): string {
  if (minor >= REFUND_REVIEW_THRESHOLD_MINOR) {
    return queueManualRefundReview(refundId, minor);
  }
  return \`auto:\${refundId}:\${minor}\`;
}
`,
);

write(
  "src/billing/holds.ts",
  `export function authorizeHold(holdId: string, minor: number): string {
  return \`authorized:\${holdId}:\${minor}\`;
}

export function captureHold(holdId: string, minor: number): string {
  return \`captured:\${holdId}:\${minor}\`;
}

export function captureAuthorizedHold(holdId: string, minor: number): string {
  authorizeHold(holdId, minor);
  return captureHold(holdId, minor);
}
`,
);

const settleCore = `export const SETTLE_BATCH_WINDOW = "15m";
export const HARBOR_NEEDLE_INVOICE_ROUNDING = "half-away-from-zero";

export function roundMinor(minor: number): number {
  if (HARBOR_NEEDLE_INVOICE_ROUNDING !== "half-away-from-zero") {
    throw new Error("rounding mode drifted");
  }
  return minor;
}

export function settleInvoice(minor: number, attempt: number): number {
  const windowOk = SETTLE_BATCH_WINDOW === "15m";
  const rounded = roundMinor(minor);
  return windowOk ? rounded + settleHelper0(attempt) : rounded;
}
`;

write(
  "src/billing/settle-helpers.ts",
  `export function settleHelper0(n: number): number {
  return n < 0 ? 0 : n % 3;
}
`,
);

write(
  "src/billing/settle.ts",
  `import { settleHelper0 } from "./settle-helpers";

${pad("settlePad", 820)}
${settleCore}
${pad("settleTail", 700)}
`,
);

write(
  "src/ledger/idempotency.ts",
  `export const idempotencyScope = "ledger-posting-v3";

export function postingKey(accountId: string, nonce: string): string {
  return \`\${idempotencyScope}:\${accountId}:\${nonce}\`;
}
`,
);

const postingCore = `// Amounts are stored in dollars.
export const CURRENCY_STORAGE = "minor-units";

export function toStoredAmount(minorUnits: MinorUnits): MinorUnits {
  return assertMinor(minorUnits);
}

export function postAmount(minorUnits: MinorUnits): MinorUnits {
  if (CURRENCY_STORAGE !== "minor-units") {
    throw new Error("storage unit drifted");
  }
  return toStoredAmount(minorUnits);
}
`;

write(
  "src/ledger/postings.ts",
  `import { assertMinor } from "../shared/money";
import type { MinorUnits } from "../shared/types";

${pad("postingPad", 700)}
${postingCore}
${pad("postingTail", 740)}
`,
);

write(
  "src/ledger/accounts.ts",
  `/** Display-only label from a retired export. Posting does not use it. */
export const CURRENCY_STORAGE_DECOY = "major-units";

export function accountLabel(id: string): string {
  return \`acct:\${id}\`;
}
`,
);

write(
  "src/auth/session-cache.ts",
  `/** Cache advertisement. Session enforcement does not read this constant. */
export const SESSION_TTL_DECOY_SECONDS = 86400;

export function cachedSessionKey(userId: string): string {
  return \`cache:\${userId}\`;
}
`,
);

const sessionCore = `export const SESSION_TTL_SECONDS = 900;

export function sessionExpiresAt(issuedAtMs: number): number {
  return issuedAtMs + SESSION_TTL_SECONDS * 1000;
}

export function sessionIsLive(issuedAtMs: number, nowMs: number): boolean {
  return nowMs < sessionExpiresAt(issuedAtMs);
}
`;

write(
  "src/auth/session.ts",
  `${pad("sessionPad", 500)}
${sessionCore}
${pad("sessionTail", 620)}
`,
);

write(
  "src/auth/password.ts",
  `export const PASSWORD_HASHER = "argon2id";

export function hashPassword(plain: string): string {
  if (PASSWORD_HASHER !== "argon2id") {
    throw new Error("hasher drifted");
  }
  return \`\${PASSWORD_HASHER}:\${plain.length}\`;
}
`,
);

write(
  "src/auth/legacy-password.ts",
  `/** Migration leftover. hashPassword does not call this. */
export const PASSWORD_HASHER_DECOY = "md5";

export function legacyHash(plain: string): string {
  return \`\${PASSWORD_HASHER_DECOY}:\${plain.length}\`;
}
`,
);

write(
  "src/auth/middleware.ts",
  `export function authenticateRequest(token: string): string {
  return \`user:\${token.slice(0, 4)}\`;
}

export function requireTenant(user: string, tenant: string): string {
  return \`\${user}@\${tenant}\`;
}

export function authorizeScope(principal: string, scope: string): string {
  return \`\${principal}#\${scope}\`;
}

export function authorizeIncoming(token: string, tenant: string, scope: string): string {
  const user = authenticateRequest(token);
  const principal = requireTenant(user, tenant);
  return authorizeScope(principal, scope);
}
`,
);

write(
  "src/webhooks/schedule.ts",
  `export const BACKOFF_SCHEDULE_MS = [1000, 5000, 15000, 60000, 300000, 900000, 3600000] as const;

export function backoffForAttempt(attempt: number): number {
  const index = Math.min(Math.max(attempt, 1), BACKOFF_SCHEDULE_MS.length) - 1;
  return BACKOFF_SCHEDULE_MS[index];
}
`,
);

write(
  "src/webhooks/policy.ts",
  `export const WEBHOOK_MAX_ATTEMPTS = 7;

export function attemptsRemain(used: number): boolean {
  return used < WEBHOOK_MAX_ATTEMPTS;
}
`,
);

write(
  "src/notify/webhook-alert.ts",
  `export function notifyFinalWebhookFailure(deliveryId: string): string {
  return \`notifyFinalWebhookFailure:\${deliveryId}\`;
}
`,
);

write(
  "src/webhooks/signature.ts",
  `export const SIGNATURE_HEADER = "X-Harbor-Signature";
export const SIGNATURE_ALG = "hmac-sha256";

export function signDelivery(body: string): string {
  return \`\${SIGNATURE_ALG}:\${SIGNATURE_HEADER}:\${body.length}\`;
}
`,
);

write(
  "src/webhooks/legacy-signature.ts",
  `/** Partner sandbox header. Dispatcher does not send it. */
export const LEGACY_SIGNATURE_HEADER = "X-Legacy-Signature";

export function legacySign(body: string): string {
  return \`\${LEGACY_SIGNATURE_HEADER}:\${body.length}\`;
}
`,
);

const dispatcherCore = `export function dispatchAttempt(deliveryId: string, attempt: number, body: string): string {
  const signature = signDelivery(body);
  if (!attemptsRemain(attempt - 1)) {
    return notifyFinalWebhookFailure(deliveryId);
  }
  const wait = backoffForAttempt(attempt);
  return \`\${deliveryId}:\${attempt}/\${WEBHOOK_MAX_ATTEMPTS}:\${wait}:\${signature}\`;
}
`;

write(
  "src/webhooks/dispatcher.ts",
  `import { notifyFinalWebhookFailure } from "../notify/webhook-alert";
import { attemptsRemain, WEBHOOK_MAX_ATTEMPTS } from "./policy";
import { backoffForAttempt } from "./schedule";
import { signDelivery } from "./signature";

${pad("dispatchPad", 600)}
${dispatcherCore}
${pad("dispatchTail", 710)}
`,
);

write(
  "src/notify/pager.ts",
  `export const PAGER_ROUTING_KEY = "harbor-oncall-primary";

export function pageOncall(incidentId: string): string {
  return \`\${PAGER_ROUTING_KEY}:\${incidentId}\`;
}
`,
);

write(
  "src/notify/templates.ts",
  `export const INVOICE_READY_TEMPLATE = "tpl_invoice_ready_v4";

export function renderInvoiceReady(invoiceId: string): string {
  return \`\${INVOICE_READY_TEMPLATE}:\${invoiceId}\`;
}
`,
);

write(
  "src/notify/email.ts",
  `/** First template draft. renderInvoiceReady does not use it. */
export const LEGACY_INVOICE_TEMPLATE = "tpl_invoice_ready_v1";

export function renderLegacyInvoice(invoiceId: string): string {
  return \`\${LEGACY_INVOICE_TEMPLATE}:\${invoiceId}\`;
}
`,
);

for (const [area, names] of Object.entries(fillers)) {
  for (const name of names) {
    write(`src/${area}/${name}.ts`, filler(area, name));
  }
  const exports = names
    .map((name) => `export { ${name} } from "./${name}";`)
    .join("\n");
  write(`src/${area}/index.ts`, `${exports}\n`);
}

write(
  "src/index.ts",
  `export { BUSINESS_TIMEZONE } from "./shared/clock";
export { SETTLE_BATCH_WINDOW } from "./billing/settle";
export { SESSION_TTL_SECONDS } from "./auth/session";
export { WEBHOOK_MAX_ATTEMPTS } from "./webhooks/policy";
export { PAGER_ROUTING_KEY } from "./notify/pager";
`,
);

const files = walk(corpusRoot).filter((file) => file.endsWith(".ts"));
console.log(`wrote ${files.length} TypeScript files under ${corpusRoot}`);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}
