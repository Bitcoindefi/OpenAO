/**
 * Crowd Control (CC) Diminishing Returns & Stunlock Immunity Engine for OpenAO MMORPG.
 * Simulates independent DR category tracking, duration decay (100% -> 50% -> 25% -> Immune),
 * and natural 15-second decay timers without spam immunity extension.
 */

export type CCCategory = "STUN" | "ROOT" | "SILENCE" | "DISARM" | "FEAR";

export interface CCApplicationRecord {
    targetId: string;
    category: CCCategory;
    applicationCount: number; // 0, 1, 2, 3+
    lastEndEpochMs: number;
}

export interface CCApplyResult {
    effectiveDurationMs: number;
    drTier: number; // 0 = 100%, 1 = 50%, 2 = 25%, 3 = Immune (0%)
    isImmune: boolean;
}

export class DiminishingReturnsEngine {
    public static readonly DR_RESET_WINDOW_MS = 15000; // 15 seconds after last CC ends

    private records: Map<string, CCApplicationRecord> = new Map();

    private getKey(targetId: string, category: CCCategory): string {
        return `${targetId}:${category}`;
    }

    /**
     * Calculates the effective duration for an incoming crowd control effect.
     */
    public applyCC(
        targetId: string,
        category: CCCategory,
        baseDurationMs: number,
        currentEpochMs: number
    ): CCApplyResult {
        const key = this.getKey(targetId, category);
        let record = this.records.get(key);

        // Check if existing record has decayed past 15s reset window
        if (record && currentEpochMs - record.lastEndEpochMs >= DiminishingReturnsEngine.DR_RESET_WINDOW_MS) {
            record = undefined;
            this.records.delete(key);
        }

        const count = record ? record.applicationCount : 0;
        let multiplier = 1.0;
        let tier = 0;
        let isImmune = false;

        switch (count) {
            case 0:
                multiplier = 1.0;
                tier = 0;
                break;
            case 1:
                multiplier = 0.50;
                tier = 1;
                break;
            case 2:
                multiplier = 0.25;
                tier = 2;
                break;
            case 3:
            default:
                multiplier = 0.0;
                tier = 3;
                isImmune = true;
                break;
        }

        const effectiveDuration = Math.floor(baseDurationMs * multiplier);

        // Update record ONLY if not immune (immune re-applications do not push out reset window)
        if (!isImmune) {
            const nextEnd = currentEpochMs + effectiveDuration;
            if (!record) {
                record = {
                    targetId,
                    category,
                    applicationCount: 1,
                    lastEndEpochMs: nextEnd,
                };
                this.records.set(key, record);
            } else {
                record.applicationCount += 1;
                record.lastEndEpochMs = nextEnd;
            }
        }

        return {
            effectiveDurationMs: effectiveDuration,
            drTier: tier,
            isImmune,
        };
    }

    /**
     * Clears all tracking records.
     */
    public clear(): void {
        this.records.clear();
    }
}