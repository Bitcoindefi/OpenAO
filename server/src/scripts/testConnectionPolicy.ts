import assert from "node:assert/strict";
import { getDuplicateAccountIdlePenalizedClientIds } from "../connectionPolicy";

function asArray(result: Set<string>): string[] {
    return Array.from(result).sort();
}

// Cover CGNAT separation, same-account miner/scout, same-account non-miners, and missing account identity.
assert.deepEqual(
    asArray(
        getDuplicateAccountIdlePenalizedClientIds([
            { idUser: "alice", accountId: "account-a", miningActive: true },
            { idUser: "bob", accountId: "account-b", miningActive: false },
        ]),
    ),
    [],
    "different accounts must not be penalized together even when the runtime transport IP is shared",
);

assert.deepEqual(
    asArray(
        getDuplicateAccountIdlePenalizedClientIds([
            { idUser: "main", accountId: "same-account", miningActive: true },
            { idUser: "scout", accountId: "same-account", miningActive: false },
        ]),
    ),
    ["scout"],
    "same-account non-mining scout remains penalized when another session is mining",
);

assert.deepEqual(
    asArray(
        getDuplicateAccountIdlePenalizedClientIds([
            { idUser: "first", accountId: "same-account", miningActive: false },
            { idUser: "second", accountId: "same-account", miningActive: false },
        ]),
    ),
    [],
    "same-account sessions without an active miner keep the normal idle timeout",
);

assert.deepEqual(
    asArray(
        getDuplicateAccountIdlePenalizedClientIds([
            { idUser: "unknown-miner", accountId: undefined, miningActive: true },
            { idUser: "unknown-player", accountId: undefined, miningActive: false },
        ]),
    ),
    [],
    "missing account identity must never fall back to a shared transport identity",
);

console.log("connection policy tests passed");
