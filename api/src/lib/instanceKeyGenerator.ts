import crypto from "node:crypto";

/**
 * Deterministic Dungeon Instance Key Generator for OpenAO MMORPG.
 * Generates HMAC-SHA256 authenticated instance access keys with difficulty
 * and party scaling parameters, featuring safe constant-time verification
 * and strictly required server secret configuration.
 */

export type DungeonDifficulty = "NORMAL" | "HEROIC" | "MYTHIC";

export interface InstanceKeyParams {
    dungeonId: string;
    difficulty: DungeonDifficulty;
    partyLeaderId: string;
    partySize: number; // 1 to 5
    createdAtEpochMs: number;
}

export interface InstanceScalingModifiers {
    healthMultiplier: number;
    damageMultiplier: number;
    lootQualityBonusPercent: number;
}

export class DungeonInstanceKeyGenerator {
    private static readonly SIGNATURE_HEX_LENGTH = 32; // 128-bit truncated HMAC

    private static sanitizeField(field: string): string {
        if (!field || typeof field !== "string") {
            throw new Error("Invalid string parameter for instance key");
        }
        if (field.includes(":")) {
            throw new Error("Instance parameters must not contain delimiter ':'");
        }
        return field.trim();
    }

    private static resolveSecret(serverSecret?: string): string {
        const secret = serverSecret || process.env.INSTANCE_KEY_SECRET;
        if (!secret || secret.trim().length === 0) {
            throw new Error("Instance key generation requires a non-empty server secret or INSTANCE_KEY_SECRET environment variable.");
        }
        return secret;
    }

    /**
     * Generates a tamper-proof instance token string with strictly required secret.
     */
    public static generateInstanceKey(
        params: InstanceKeyParams,
        serverSecret?: string
    ): string {
        const secret = this.resolveSecret(serverSecret);
        const safeDungeonId = this.sanitizeField(params.dungeonId);
        const safeLeaderId = this.sanitizeField(params.partyLeaderId);

        const payload = `${safeDungeonId}:${params.difficulty}:${safeLeaderId}:${params.partySize}:${params.createdAtEpochMs}`;
        const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
        const signature = hmac.slice(0, this.SIGNATURE_HEX_LENGTH);

        return `inst_${payload}:${signature}`;
    }

    /**
     * Safely verifies token authenticity and integrity using length-guarded timingSafeEqual.
     */
    public static verifyInstanceKey(
        instanceKey: string,
        params: InstanceKeyParams,
        serverSecret?: string
    ): boolean {
        if (!instanceKey || typeof instanceKey !== "string") {
            return false;
        }

        try {
            const expectedKey = this.generateInstanceKey(params, serverSecret);
            const aBuf = Buffer.from(instanceKey, "utf8");
            const bBuf = Buffer.from(expectedKey, "utf8");

            if (aBuf.length !== bBuf.length) {
                return false;
            }

            return crypto.timingSafeEqual(aBuf, bBuf);
        } catch {
            return false;
        }
    }

    /**
     * Computes the parametric combat and loot scaling modifiers for the instance.
     */
    public static computeScalingModifiers(
        difficulty: DungeonDifficulty,
        partySize: number
    ): InstanceScalingModifiers {
        const clampedParty = Math.min(5, Math.max(1, partySize));

        let baseHealthMult = 1.0;
        let baseDamageMult = 1.0;
        let baseLootBonus = 0;

        switch (difficulty) {
            case "HEROIC":
                baseHealthMult = 1.8;
                baseDamageMult = 1.4;
                baseLootBonus = 25;
                break;
            case "MYTHIC":
                baseHealthMult = 3.0;
                baseDamageMult = 2.2;
                baseLootBonus = 60;
                break;
            case "NORMAL":
            default:
                baseHealthMult = 1.0;
                baseDamageMult = 1.0;
                baseLootBonus = 0;
                break;
        }

        const partyHpFactor = 1.0 + (clampedParty - 1) * 0.20;
        const partyDmgFactor = 1.0 + (clampedParty - 1) * 0.05;

        return {
            healthMultiplier: Math.round(baseHealthMult * partyHpFactor * 100) / 100,
            damageMultiplier: Math.round(baseDamageMult * partyDmgFactor * 100) / 100,
            lootQualityBonusPercent: baseLootBonus + (clampedParty - 1) * 5,
        };
    }
}