import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/server.ts"), "utf8");
const start = source.indexOf("function trackClientActivity");
const end = source.indexOf("\n}\n\n(async () => {", start);

assert.ok(start >= 0 && end > start, "trackClientActivity must remain present");

const fn = source.slice(start, end + 2);
const pingMatch = fn.match(/if \(isPingPacket\) \{([\s\S]*?)\n    \}/);
assert.ok(pingMatch, "ping branch must remain explicit");

const pingBranch = pingMatch[1];
assert.match(fn, /ws\.packetCount = Number\(ws\.packetCount \?\? 0\) \+ 1;/, "all packets increment packetCount");
assert.match(pingBranch, /ws\.lastPingAt = now;/, "ping must refresh transport liveness");
assert.ok(!pingBranch.includes("lastActivityAt"), "ping must not reset real player activity");
assert.match(pingBranch, /return;/, "ping must return before non-ping accounting");

for (const forbidden of [
    "lastPacketAt",
    "packetCountNonPing",
    "recentPacketTimestamps",
    "recentPacketIntervalsMs",
    "packetTypeCounts",
]) {
    assert.ok(!pingBranch.includes(forbidden), `ping must not mutate non-ping metric: ${forbidden}`);
}

const pingBlockEnd = fn.indexOf("}", fn.indexOf("if (isPingPacket)"));
const nonPingTail = fn.slice(pingBlockEnd + 1);
assert.match(nonPingTail, /ws\.lastPacketAt = now;/, "non-ping packets still refresh lastPacketAt");
assert.match(nonPingTail, /ws\.lastActivityAt = now;/, "non-ping packets still refresh real activity");

const helperStart = source.indexOf("function getClientLivenessReferenceAt");
const helperEnd = source.indexOf("\n}\n\nfunction getScoutIdleReferenceAt", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "liveness helper must remain present");
const helperFn = source.slice(helperStart, helperEnd + 2);
assert.match(helperFn, /client\.lastActivityAt/, "real activity contributes to liveness");
assert.match(helperFn, /client\.lastPingAt/, "keepalive ping contributes to liveness");
assert.match(helperFn, /Math\.max\(lastActivityAt, lastPingAt, connectedAt\)/, "freshest liveness signal wins");

const idleStart = source.indexOf("function processIdleCharactersTick");
const idleEnd = source.indexOf("\n}\n\nfunction getClientLivenessReferenceAt", idleStart);
assert.ok(idleStart >= 0 && idleEnd > idleStart, "idle sweep must remain present");
const idleFn = source.slice(idleStart, idleEnd + 2);
assert.match(idleFn, /getClientLivenessReferenceAt\(client, now\)/, "normal sessions use transport liveness");
assert.match(idleFn, /getScoutIdleReferenceAt\(client, user\)/, "duplicate scouts keep real-activity policy");

console.log("client activity policy tests passed");
