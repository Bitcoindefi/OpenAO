import crypto from "node:crypto";

/**
 * Ancient Runic Mining Excavation, Deep Ore Vein Prospecting & Geode Cracking Engine for OpenAO MMORPG.
 * Simulates mining pickaxes (Adamantite Pick, Mithril Excavator, Void Sunderer), deep ore veins (Arcane Silver, Mithril Crystal, Void Obsidian),
 * geode cracking gem extraction (Ruby, Sapphire, Diamond, Void Amethyst), pickaxe durability wear, and whetstone field sharpening.
 */

export type MiningPickaxeType = "ADAMANTITE_MINING_PICK" | "MITHRIL_EXCAVATOR_PICK" | "VOID_SUNDERER_PICK";
export type OreVeinType = "ARCANE_SILVER_VEIN" | "MITHRIL_CRYSTAL_VEIN" | "VOID_OBSIDIAN_VEIN";
export type GemstoneType = "RUNIC_RUBY" | "DEEP_SAPPHIRE" | "PRISMATIC_DIAMOND" | "VOID_AMETHYST";

export interface PickaxeData {
    pickaxeType: MiningPickaxeType;
    maxDurability: number;
    miningHardnessThreshold: number;
    yieldMultiplier: number;
    geodeDiscoveryRatePercent: number;
}

export interface OreVeinData {
    veinType: OreVeinType;
    hardnessLevel: number;
    baseOreYield: number;
    oreItemName: string;
}

export interface ActiveMiningPickaxe {
    pickaxeId: string;
    minerPlayerId: string;
    pickaxeType: MiningPickaxeType;
    currentDurability: number;
    maxDurability: number;
    isBroken: boolean;
}

export interface OreVeinDeposit {
    veinId: string;
    veinType: OreVeinType;
    location: { x: number; y: number };
    remainingOreCapacity: number;
    isDepleted: boolean;
}

export const PICKAXE_CATALOG: Record<MiningPickaxeType, PickaxeData> = {
    ADAMANTITE_MINING_PICK: { pickaxeType: "ADAMANTITE_MINING_PICK", maxDurability: 120, miningHardnessThreshold: 40, yieldMultiplier: 1.0, geodeDiscoveryRatePercent: 20 },
    MITHRIL_EXCAVATOR_PICK: { pickaxeType: "MITHRIL_EXCAVATOR_PICK", maxDurability: 180, miningHardnessThreshold: 70, yieldMultiplier: 1.5, geodeDiscoveryRatePercent: 35 },
    VOID_SUNDERER_PICK: { pickaxeType: "VOID_SUNDERER_PICK", maxDurability: 250, miningHardnessThreshold: 100, yieldMultiplier: 2.0, geodeDiscoveryRatePercent: 60 },
};

export const VEIN_CATALOG: Record<OreVeinType, OreVeinData> = {
    ARCANE_SILVER_VEIN: { veinType: "ARCANE_SILVER_VEIN", hardnessLevel: 30, baseOreYield: 5, oreItemName: "Arcane Silver Ore" },
    MITHRIL_CRYSTAL_VEIN: { veinType: "MITHRIL_CRYSTAL_VEIN", hardnessLevel: 60, baseOreYield: 10, oreItemName: "Mithril Crystal Ore" },
    VOID_OBSIDIAN_VEIN: { veinType: "VOID_OBSIDIAN_VEIN", hardnessLevel: 90, baseOreYield: 15, oreItemName: "Void Obsidian Slab" },
};

export const GEMSTONE_VALUES: Record<GemstoneType, number> = {
    RUNIC_RUBY: 50,
    DEEP_SAPPHIRE: 75,
    PRISMATIC_DIAMOND: 150,
    VOID_AMETHYST: 300,
};

export class AncientRunicMiningExcavationEngine {
    public static readonly DURABILITY_LOSS_PER_EXCAVATION = 5;

    /**
     * Forges a new mining pickaxe.
     */
    public static forgePickaxe(
        minerPlayerId: string,
        pickaxeType: MiningPickaxeType,
        currentEpochMs = Date.now()
    ): ActiveMiningPickaxe {
        const data = PICKAXE_CATALOG[pickaxeType];
        if (!data) {
            throw new Error(`Unsupported pickaxe type: ${String(pickaxeType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            pickaxeId: `pickaxe_${pickaxeType.toLowerCase()}_${uuid}`,
            minerPlayerId,
            pickaxeType,
            currentDurability: data.maxDurability,
            maxDurability: data.maxDurability,
            isBroken: false,
        };
    }

    /**
     * Excavates ore from a vein deposit.
     */
    public static excavateVein(
        pickaxe: ActiveMiningPickaxe,
        vein: OreVeinDeposit,
        rng: () => number = Math.random
    ): { success: boolean; oreExtracted: number; oreName?: string; discoveredGeode: boolean; remainingDurability: number; reason?: string } {
        if (!pickaxe || pickaxe.isBroken || pickaxe.currentDurability < this.DURABILITY_LOSS_PER_EXCAVATION) {
            return { success: false, oreExtracted: 0, discoveredGeode: false, remainingDurability: pickaxe?.currentDurability ?? 0, reason: "Pickaxe is broken or lacks durability." };
        }

        if (!vein || vein.isDepleted || vein.remainingOreCapacity <= 0) {
            return { success: false, oreExtracted: 0, discoveredGeode: false, remainingDurability: pickaxe.currentDurability, reason: "Ore vein is depleted or invalid." };
        }

        const pickData = PICKAXE_CATALOG[pickaxe.pickaxeType];
        const veinData = VEIN_CATALOG[vein.veinType];

        if (pickData.miningHardnessThreshold < veinData.hardnessLevel) {
            return {
                success: false,
                oreExtracted: 0,
                discoveredGeode: false,
                remainingDurability: pickaxe.currentDurability,
                reason: `Pickaxe hardness threshold (${pickData.miningHardnessThreshold}) is too low for vein hardness (${veinData.hardnessLevel}).`,
            };
        }

        // Deduct durability
        pickaxe.currentDurability -= this.DURABILITY_LOSS_PER_EXCAVATION;
        if (pickaxe.currentDurability === 0) {
            pickaxe.isBroken = true;
        }

        const scaledYield = Math.round(veinData.baseOreYield * pickData.yieldMultiplier);
        const actualExtracted = Math.min(vein.remainingOreCapacity, scaledYield);

        vein.remainingOreCapacity -= actualExtracted;
        if (vein.remainingOreCapacity === 0) {
            vein.isDepleted = true;
        }

        const geodeRoll = rng() * 100;
        const discoveredGeode = geodeRoll < pickData.geodeDiscoveryRatePercent;

        return {
            success: true,
            oreExtracted: actualExtracted,
            oreName: veinData.oreItemName,
            discoveredGeode,
            remainingDurability: pickaxe.currentDurability,
        };
    }

    /**
     * Cracks open a discovered geode to reveal gemstones.
     */
    public static crackGeode(
        gemRoll = Math.random()
    ): { gemstone: GemstoneType; goldValue: number } {
        const roll = Number.isFinite(gemRoll) ? Math.max(0, Math.min(1, gemRoll)) : Math.random();

        let gem: GemstoneType = "RUNIC_RUBY";
        if (roll >= 0.90) {
            gem = "VOID_AMETHYST";
        } else if (roll >= 0.70) {
            gem = "PRISMATIC_DIAMOND";
        } else if (roll >= 0.40) {
            gem = "DEEP_SAPPHIRE";
        }

        return {
            gemstone: gem,
            goldValue: GEMSTONE_VALUES[gem],
        };
    }

    /**
     * Sharpens and repairs pickaxe durability using a whetstone (cannot revive completely broken pickaxes).
     */
    public static sharpenPickaxe(
        pickaxe: ActiveMiningPickaxe,
        repairAmount = 60
    ): { success: boolean; newDurability: number; isBroken: boolean } {
        if (!pickaxe || pickaxe.isBroken) return { success: false, newDurability: pickaxe?.currentDurability ?? 0, isBroken: true };

        const amt = Number.isFinite(repairAmount) ? Math.max(0, repairAmount) : 60;
        pickaxe.currentDurability = Math.min(pickaxe.maxDurability, pickaxe.currentDurability + amt);

        return {
            success: true,
            newDurability: pickaxe.currentDurability,
            isBroken: false,
        };
    }
}