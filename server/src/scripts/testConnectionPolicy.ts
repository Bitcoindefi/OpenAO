import assert from "node:assert/strict";
import { getDuplicateAccountIdlePenalizedClientIds } from "../connectionPolicy";

function asArray(result: Set<string>): string[] {
    return Array.from(result).sort();
}

assert.deepEqual(
    asArray(
        getDuplicateAccountIdlePenalizedClientIds([
            {
                idUser: "alice",
                accountId: "account-a",
                ip: "203.0.113.10",
                miningActive: true,
            },
            {
                idUser: "bob",
                accountId: "account-b",
                ip: "203.0.113.10",
                miningActive: false,
            },
        ]),
    ),
    [],
    "different accounts sharing a public IP must not penalize each other",
);

assert.deepEqual(
    asArray(
        getDuplicateAccountIdlePenalizedClientIds([
            {
                idUser: "main",
                accountId: "same-account",
                miningActive: true,
            },
            {
                idUser: "scout",
                accountId: "same-account",
                miningActive: false,
            },
        ]),
    ),
    ["scout"],
    "same-account non-mining scout remains penalized when another session is mining",
);

assert.deepEqual(
    asArray(
        getDuplicateAccountIdlePenalizedClientIds([
            {
                idUser: "first",
                accountId: "same-account",
                miningActive: false,
            },
            {
                idUser: "second",
                accountId: "same-account",
                miningActive: false,
            },
        ]),
    ),
    [],
    "same-account sessions without an active miner should keep the normal idle timeout",
);

console.log("connection policy tests passed");
