import { describe, it, expect } from "vitest";
import { DungeonInstanceKeyGenerator, InstanceKeyParams } from "../lib/instanceKeyGenerator.js";

describe("DungeonInstanceKeyGenerator Strict Secret Requirement & Delimiter Guards", () => {
    const validParams: InstanceKeyParams = {
        dungeonId: "sunken_temple_01",
        difficulty: "HEROIC",
        partyLeaderId: "char_mage_99",
        partySize: 4,
        createdAtEpochMs: 1787740000000,
    };
    const secret = "production_vault_secret_2026";

    it("generates deterministic 128-bit signature key and verifies successfully", () => {
        const key = DungeonInstanceKeyGenerator.generateInstanceKey(validParams, secret);
        expect(key.startsWith("inst_sunken_temple_01:HEROIC:char_mage_99:4:1787740000000:")).toBe(true);

        const isValid = DungeonInstanceKeyGenerator.verifyInstanceKey(key, validParams, secret);
        expect(isValid).toBe(true);

        // Verification fails with different secret
        const isWrongSecret = DungeonInstanceKeyGenerator.verifyInstanceKey(key, validParams, "wrong_secret");
        expect(isWrongSecret).toBe(false);
    });

    it("throws an error when secret is absent without a forgeable fallback", () => {
        delete process.env.INSTANCE_KEY_SECRET;
        expect(() => {
            DungeonInstanceKeyGenerator.generateInstanceKey(validParams, "");
        }).toThrow("Instance key generation requires a non-empty server secret");
    });

    it("rejects parameters with unescaped delimiter to prevent payload spoofing", () => {
        const spoofedParams: InstanceKeyParams = {
            ...validParams,
            dungeonId: "sunken:temple",
        };

        expect(() => {
            DungeonInstanceKeyGenerator.generateInstanceKey(spoofedParams, secret);
        }).toThrow("Instance parameters must not contain delimiter ':'");
    });
});