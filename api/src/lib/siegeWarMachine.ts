/**
 * Guild Siege War Machine & Fortification Assault Engine for OpenAO MMORPG.
 * Simulates deployment of Catapults, Ballistas, and Battering Rams, ammunition damage modifiers,
 * fortification gate armor penetration, reload timers enforcement, and operator crew attachment mechanics.
 */

export type SiegeMachineType = "CATAPULT" | "BALLISTA" | "BATTERING_RAM";
export type SiegeAmmoType = "HEAVY_BOULDER" | "FIRE_POT" | "IRON_BOLT";
export type StructureMaterial = "STONE_WALL" | "WOODEN_GATE" | "REINFORCED_IRON_GATE";

export interface SiegeMachineDefinition {
    machineType: SiegeMachineType;
    baseDamage: number;
    reloadTimeSeconds: number;
    maxHp: number;
    supportedAmmo: SiegeAmmoType[];
}

export interface ActiveSiegeMachine {
    instanceId: string;
    machineType: SiegeMachineType;
    guildId: string;
    operatorPlayerId?: string;
    currentHp: number;
    maxHp: number;
    loadedAmmo?: SiegeAmmoType;
    lastFiredEpochMs: number;
}

export interface SiegeAttackResult {
    damageDealt: number;
    isTargetDestroyed: boolean;
    remainingStructureHp: number;
    wasEffectiveMaterialBonus: boolean;
    isOnCooldown?: boolean;
    reason?: string;
}

export const SIEGE_MACHINE_SPECS: Record<SiegeMachineType, SiegeMachineDefinition> = {
    CATAPULT: {
        machineType: "CATAPULT",
        baseDamage: 800,
        reloadTimeSeconds: 6,
        maxHp: 2000,
        supportedAmmo: ["HEAVY_BOULDER", "FIRE_POT"],
    },
    BALLISTA: {
        machineType: "BALLISTA",
        baseDamage: 450,
        reloadTimeSeconds: 3,
        maxHp: 1200,
        supportedAmmo: ["IRON_BOLT", "FIRE_POT"],
    },
    BATTERING_RAM: {
        machineType: "BATTERING_RAM",
        baseDamage: 1200,
        reloadTimeSeconds: 8,
        maxHp: 3000,
        supportedAmmo: ["HEAVY_BOULDER"],
    },
};

export class SiegeWarMachineEngine {
    /**
     * Deploys a new siege engine for a guild.
     */
    public static deployMachine(
        instanceId: string,
        machineType: SiegeMachineType,
        guildId: string,
        operatorPlayerId?: string
    ): ActiveSiegeMachine {
        const spec = SIEGE_MACHINE_SPECS[machineType];
        return {
            instanceId,
            machineType,
            guildId,
            operatorPlayerId,
            currentHp: spec.maxHp,
            maxHp: spec.maxHp,
            loadedAmmo: spec.supportedAmmo[0],
            lastFiredEpochMs: 0,
        };
    }

    /**
     * Calculates the damage multiplier based on ammunition and target structure material.
     */
    public static getMaterialDamageMultiplier(ammo: SiegeAmmoType, material: StructureMaterial): { multiplier: number; isBonus: boolean } {
        if (ammo === "HEAVY_BOULDER" && material === "STONE_WALL") {
            return { multiplier: 1.5, isBonus: true };
        }
        if (ammo === "FIRE_POT" && material === "WOODEN_GATE") {
            return { multiplier: 2.0, isBonus: true };
        }
        if (ammo === "IRON_BOLT" && material === "REINFORCED_IRON_GATE") {
            return { multiplier: 0.5, isBonus: false }; // Ineffective
        }
        return { multiplier: 1.0, isBonus: false };
    }

    /**
     * Executes a siege engine strike against a fortification structure, enforcing reload cooldowns.
     */
    public static fireAtStructure(
        machine: ActiveSiegeMachine,
        targetStructureHp: number,
        targetStructureArmor: number,
        targetMaterial: StructureMaterial,
        currentEpochMs: number
    ): SiegeAttackResult {
        const spec = SIEGE_MACHINE_SPECS[machine.machineType];

        // Enforce reload cooldown
        const reloadMs = spec.reloadTimeSeconds * 1000;
        if (machine.lastFiredEpochMs > 0 && currentEpochMs - machine.lastFiredEpochMs < reloadMs) {
            const remainingCooldown = reloadMs - (currentEpochMs - machine.lastFiredEpochMs);
            return {
                damageDealt: 0,
                isTargetDestroyed: false,
                remainingStructureHp: targetStructureHp,
                wasEffectiveMaterialBonus: false,
                isOnCooldown: true,
                reason: `Machine is currently reloading. Cooldown remaining: ${Math.ceil(remainingCooldown / 1000)}s.`,
            };
        }

        const ammo = machine.loadedAmmo ?? spec.supportedAmmo[0];
        const { multiplier, isBonus } = this.getMaterialDamageMultiplier(ammo, targetMaterial);

        // Armor mitigation formula: RawDamage * (100 / (100 + armor))
        const armorFactor = 100 / (100 + Math.max(0, targetStructureArmor));
        const rawDamage = spec.baseDamage * multiplier;
        const finalDamage = Math.max(50, Math.floor(rawDamage * armorFactor));

        const remainingHp = Math.max(0, targetStructureHp - finalDamage);
        machine.lastFiredEpochMs = currentEpochMs;

        return {
            damageDealt: finalDamage,
            isTargetDestroyed: remainingHp === 0,
            remainingStructureHp: remainingHp,
            wasEffectiveMaterialBonus: isBonus,
            isOnCooldown: false,
        };
    }
}