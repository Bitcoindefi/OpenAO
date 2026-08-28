/**
 * Mineral & Resource Vein Depletion & Respawn Tracker for OpenAO MMORPG.
 * Simulates ore extraction yields, mining skill scaling, exclusive node lock enforcement,
 * and randomized respawn tick scheduling.
 */

export type VeinType = "COPPER" | "IRON" | "SILVER" | "GOLD" | "MITHRIL";
export type VeinState = "PRISTINE" | "PARTIALLY_MINED" | "RESPAWNING";

export interface MineralVein {
    veinId: string;
    veinType: VeinType;
    mapId: number;
    x: number;
    y: number;
    state: VeinState;
    totalOreUnits: number;
    remainingOreUnits: number;
    activeMinerPlayerId: string | null;
    respawnTicksRemaining: number;
    baseRespawnTicks: number;
}

export interface MineAttemptParams {
    playerId: string;
    miningSkill: number; // 1 to 100
    pickaxeTier: number; // 1 (wood), 2 (iron), 3 (steel), 4 (mithril)
    rng?: () => number;
}

export interface MineAttemptResult {
    success: boolean;
    oreExtracted: number;
    veinDepleted: boolean;
    skillExperienceGained: number;
    reason?: string;
}

export const VEIN_CONFIGS: Record<
    VeinType,
    { minSkill: number; requiredPickaxeTier: number; baseRespawnTicks: number; maxUnits: number }
> = {
    COPPER: { minSkill: 1, requiredPickaxeTier: 1, baseRespawnTicks: 100, maxUnits: 10 },
    IRON: { minSkill: 20, requiredPickaxeTier: 2, baseRespawnTicks: 200, maxUnits: 8 },
    SILVER: { minSkill: 45, requiredPickaxeTier: 2, baseRespawnTicks: 350, maxUnits: 6 },
    GOLD: { minSkill: 65, requiredPickaxeTier: 3, baseRespawnTicks: 500, maxUnits: 5 },
    MITHRIL: { minSkill: 85, requiredPickaxeTier: 4, baseRespawnTicks: 800, maxUnits: 4 },
};

export class ResourceVeinTracker {
    private veins: Map<string, MineralVein> = new Map();

    public registerVein(vein: MineralVein): void {
        this.veins.set(vein.veinId, vein);
    }

    public getVein(veinId: string): MineralVein | undefined {
        return this.veins.get(veinId);
    }

    public acquireVeinLock(veinId: string, playerId: string): boolean {
        const vein = this.veins.get(veinId);
        if (!vein || vein.state === "RESPAWNING") {
            return false;
        }

        if (vein.activeMinerPlayerId && vein.activeMinerPlayerId !== playerId) {
            return false;
        }

        vein.activeMinerPlayerId = playerId;
        return true;
    }

    public releaseVeinLock(veinId: string, playerId: string): void {
        const vein = this.veins.get(veinId);
        if (vein && vein.activeMinerPlayerId === playerId) {
            vein.activeMinerPlayerId = null;
        }
    }

    public mineVein(veinId: string, params: MineAttemptParams): MineAttemptResult {
        const vein = this.veins.get(veinId);
        if (!vein) {
            return { success: false, oreExtracted: 0, veinDepleted: false, skillExperienceGained: 0, reason: "Vein not found" };
        }

        if (vein.state === "RESPAWNING" || vein.remainingOreUnits <= 0) {
            return { success: false, oreExtracted: 0, veinDepleted: true, skillExperienceGained: 0, reason: "Vein is depleted" };
        }

        // Strict lock holder verification
        if (vein.activeMinerPlayerId !== params.playerId) {
            return { success: false, oreExtracted: 0, veinDepleted: false, skillExperienceGained: 0, reason: "Player does not hold the lock for this vein" };
        }

        const config = VEIN_CONFIGS[vein.veinType];
        if (params.miningSkill < config.minSkill) {
            return { success: false, oreExtracted: 0, veinDepleted: false, skillExperienceGained: 0, reason: "Mining skill too low" };
        }

        if (params.pickaxeTier < config.requiredPickaxeTier) {
            return { success: false, oreExtracted: 0, veinDepleted: false, skillExperienceGained: 0, reason: "Pickaxe tier insufficient" };
        }

        const rng = params.rng || Math.random;
        const skillDelta = params.miningSkill - config.minSkill;
        const successChance = Math.min(0.95, 0.40 + (skillDelta / 100) * 0.50 + (params.pickaxeTier * 0.05));

        if (rng() > successChance) {
            return { success: false, oreExtracted: 0, veinDepleted: false, skillExperienceGained: 1, reason: "Missed strike" };
        }

        const extracted = 1;
        vein.remainingOreUnits -= extracted;

        const isDepleted = vein.remainingOreUnits <= 0;
        if (isDepleted) {
            vein.state = "RESPAWNING";
            const jitter = 0.85 + rng() * 0.30;
            vein.respawnTicksRemaining = Math.floor(config.baseRespawnTicks * jitter);
            vein.activeMinerPlayerId = null;
        } else {
            vein.state = "PARTIALLY_MINED";
        }

        return {
            success: true,
            oreExtracted: extracted,
            veinDepleted: isDepleted,
            skillExperienceGained: Math.floor(config.minSkill * 1.5),
        };
    }

    public tickRespawns(): number {
        let respawnedCount = 0;

        for (const vein of this.veins.values()) {
            if (vein.state === "RESPAWNING") {
                vein.respawnTicksRemaining--;

                if (vein.respawnTicksRemaining <= 0) {
                    vein.state = "PRISTINE";
                    vein.remainingOreUnits = vein.totalOreUnits;
                    vein.respawnTicksRemaining = 0;
                    vein.activeMinerPlayerId = null;
                    respawnedCount++;
                }
            }
        }

        return respawnedCount;
    }
}