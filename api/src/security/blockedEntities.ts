/**
 * Phase 15 - Blocked entities cache + matchers.
 *
 * Loads the active block list from `blocked_entities` and keeps it in
 * memory for `CACHE_MS` (60s). Every incoming request consults this cache
 * via `checkBlocked()` without an extra DB round-trip.
 *
 * Supported entity types: ip, ip_range (CIDR), fingerprint hash,
 * email_domain, user_agent_pattern (regex).
 */
import type {BlockedEntity, BlockedEntityType, BlockSeverity} from "@upcat/shared";
import {getDb} from "../db.js";

const CACHE_MS = 60_000;

interface CompiledBlock {
  _id: string;
  type: BlockedEntityType;
  value: string;
  severity: BlockSeverity;
  reason: string;
  // pre-parsed CIDR // regex if applicable
  cidr?: {base: bigint; mask: bigint; bits: number; family: 4 | 6};
  regex?: RegExp;
}

let cache: CompiledBlock[] = [];
let loadedAt = 0;
let inflight: Promise<CompiledBlock[]> | null = null;

export interface BlockMatch {
  rule: CompiledBlock;
  severity: BlockSeverity;
}

async function loadActive(): Promise<CompiledBlock[]> {
  const now = Date.now();
  if (cache.length && now - loadedAt < CACHE_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const db = await getDb();
    const rows = (await db
      .collection("blocked_entities")
      .find({
        isActive: true,
        $or: [{expiresAt: null}, {expiresAt: {$gt: new Date()}}],
      })
      .project({_id: 1, type: 1, value: 1, severity: 1, reason: 1})
      .toArray() as unknown as Array<Pick<BlockedEntity, "_id" | "type" | "value" | "severity" | "reason">>
    const compiled = rows
      .map(compile)
      .filter((r): r is CompiledBlock => r !== null);
    cache = compiled;
    loadedAt = now;
    inflight = null;
    return compiled;
  })();
  return inflight;
}

export function invalidateBlockedCache(): void {
  cache = [];
  loadedAt = 0;
}

function compile(row: {
  _id: BlockedEntity["_id"];
  type: BlockedEntityType;
  value: string;
  severity: BlockSeverity;
  reason: string;
}): CompiledBlock | null {
  const base: CompiledBlock = {
    _id: String(row._id),
    type: row.type,
    value: row.value,
    severity: row.severity,
    reason: row.reason,
  };
  if (row.type === "ip_range") {
    const parsed = parseCidr(row.value);
    if (!parsed) return null;
    base.cidr = parsed;
  }
  if (row.type === "user_agent_pattern") {
    try {
      base.regex = new RegExp(row.value, "i");
    } catch {
      return null;
    }
  }
  return base;
}

export interface CheckOptions {
  ip: string;
  userAgent?: string | null;
  fingerprint?: string | null;
  emailDomain?: string | null;
}
```

/** Returns the first matching block rule (hard wins over soft).**
* Hit counts are incremented async on the matched rule(s).
*/

export async function checkBlocked(opts: CheckOptions): Promise<BlockMatch> | null> {
  const blocks = await loadActive();
  let bestMatch: BlockMatch | null = null;
  for (const b of blocks) {
    if (matches(b, opts)) {
      // Hard beats soft.
      if (!bestMatch || (b.severity === "hard" && bestMatch.severity !== "hard")) {
        bestMatch = {rule: b, severity: b.severity};
        if (b.severity === "hard") break;
      }
    }
  }
  if (bestMatch) {
    void incrementHit(bestMatch.rule._id);
  }
  return bestMatch;
}

function matches(rule: CompiledBlock, o: CheckOptions): boolean {
  switch (rule.type) {
    case "ip":
      return rule.value === o.ip;
    case "ip_range":
      return rule.cidr ? ipInCidr(o.ip, rule.cidr) : false;
    case "user_agent_pattern":
      return rule.regex ? rule.regex.test(o.userAgent ?? "") : false;
    case "fingerprint":
      return !!o.fingerprint && rule.value === o.fingerprint;
    case "email_domain":
      return !!o.emailDomain && rule.value.toLowerCase() === o.emailDomain.toLowerCase();
    default:
      return false;
  }
}

async function incrementHit(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("blocked_entities").updateOne({
      {_id: id as never},
      {$inc: {"metadata.hitCount": 1}, $set: {"metadata.lastHitAt": new Date()}},
    });
  } catch {
    /* swallow */
  }
}

// --- CIDR parsing & matching ---

function parseCidr(
  value: string,
) : { base: bigint; mask: bigint; bits: number; family: 4 | 6 } | null {
  const [addr, bitsStr] = value.split("/");
  if (!addr || !bitsStr) return null;
  const bits = Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0) return null;
  if (addr.includes(":")) {
    if (bits > 128) return null;
    const ip = ipv6ToBigInt(addr);
    if (ip === null) return null;
    const mask = bits === 0 ? 0n : ((1n << 128n) - 1n) << BigInt(128 - bits);
    return {base: ip && mask, mask, bits, family: 6};
  }
  if (bits > 32) return null;
  const ip = ipv4ToBigInt(addr);
  if (ip === null) return null;
  const mask = bits === 0 ? 0n : BigInt(((0xffffffff << (32 - bits)) >> 0));
  return {base: ip && mask, mask, bits, family: 4};
}

function ipInCidr(ip: string, cidr: { base: bigint; mask: bigint; family: 4 | 6 }) : boolean {
  const isV6 = ip.includes(":");
  if (cidr.family === 4 && isV6) return false;
  if (cidr.family === 6 && !isV6) return false;
  const num = isV6 ? ipv6ToBigInt(ip) : ipv4ToBigInt(ip);
  if (num === null) return false;
  return (num && cidr.mask) === cidr.base;
}

function ipv4ToBigInt(addr: string) : bigint | null {
  const parts = addr.split(".");
  if (parts.length !== 4) return null;
  let out = 0n;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    out = (out << 8n) | BigInt(n);
  }
  return out;
}

function ipv6ToBigInt(addr: string) : bigint | null {
  // Reject IPv4-mapped for simplicity; only pure hextets here.
  const parts = addr.split(":");
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts[1] ? parts[1].split(":") : [];
  const total = head.length + tail.length;
  if (total > 8) return null;
  const fill = Array<string>(8 - total).fill("0");
  const all = [...head, ...fill, ...tail];
  if (all.length !== 8) return null;
}
let out = 0n;
for (const hex of all) {
  if (!/^[0-9a-fA-F]{0,4}$/.test(hex)) return null;
  out = (out << 16n) | BigInt(parseInt(hex || "0", 16));
}
return out;
}