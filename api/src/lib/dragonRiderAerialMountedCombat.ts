import crypto from "node:crypto";

/**
 * Aerial Dragon Riding, Mounted Aerial Combat & Thermal Breath Engine for OpenAO MMORPG.
 * Simulates dragon mounts (Crimson Fire Drake, Azure Frost Wyrm, Obsidian Void Dragon),
 * flight altitude states (Grounded, Low Flight, High Altitude Swoop), stamina depletion,
 * and high-velocity aerial breath cone attacks.
 */

export type DragonBreedType = "CRIMSON_FIRE_DRAKE" | "AZURE_FROST_WYRM" | "OBSIDIAN_VOID_DRAGON";
export type FlightAltitudeState = "GROUNDED" | "LOW_FLIGHT" | "HIGH_ALTITUDE_SWOOP";

export interface DragonBreedData {
    breedType: DragonBreedType;
    breathDamage: number;
    flightSpeed: number;
    breathElement: string;
    specialEffect?: string;
}

export interface ActiveDragonMount {
    mountId: string;
    riderPlayerId: string;
    breed: DragonBreedType;
    altitudeState: FlightAltitudeState;
    currentStamina: number; // 0 to 100
    maxStamina: number;
    isAirborne: boolean;
    isSwoopEmpowered: boolean;
}

export interface AerialCombatTarget {
    targetId: string;
    currentHp: number;
    isAlive: boolean;
    statusEffects: string[];
}

export const DRAGON_CATALOG: Record<DragonBreedType, DragonBreedData> = {
    CRIMSON_FIRE_DRAKE: { breedType: "CRIMSON_FIRE_DRAKE", breathDamage: 120, flightSpeed: 140, breathElement: "FLAME", specialEffect: "IGNITE" },
    AZURE_FROST_WYRM: { breedType: "AZURE_FROST_WYRM", breathDamage: 90, flightSpeed: 120, breathElement: "FROST", specialEffect: "FROSTBITE_SLOW_40" },
    OBSIDIAN_VOID_DRAGON: { breedType: "OBSIDIAN_VOID_DRAGON", breathDamage: 180, flightSpeed: 160, breathElement: "VOID", specialEffect: "VOID_CORROSION" },
};

export class DragonRiderAerialMountedCombatEngine {
    public static readonly TAKEOFF_STAMINA_COST = 15;
    public static readonly SWOOP_STAMINA_COST = 25;

    /**
     * Summons and mounts a dragon companion.
     */
    public static summonDragonMount(
        riderPlayerId: string,
        breed: DragonBreedType,
        currentEpochMs = Date.now()
    ): ActiveDragonMount {
        const breedData = DRAGON_CATALOG[breed];
        if (!breedData) {
            throw new Error(`Unsupported dragon breed: ${String(breed)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            mountId: `dragon_${breed.toLowerCase()}_${uuid}`,
            riderPlayerId,
            breed,
            altitudeState: "GROUNDED",
            currentStamina: 100,
            maxStamina: 100,
            isAirborne: false,
            isSwoopEmpowered: false,
        };
    }

    /**
     * Changes altitude state between Grounded, Low Flight, and High Altitude Swoop.
     */
    public static setAltitudeState(
        mount: ActiveDragonMount,
        targetState: FlightAltitudeState
    ): { success: boolean; newState: FlightAltitudeState; remainingStamina: number; reason?: string } {
        if (!mount) {
            return { success: false, newState: "GROUNDED", remainingStamina: 0, reason: "Mount is invalid." };
        }

        if (targetState === mount.altitudeState) {
            return { success: true, newState: mount.altitudeState, remainingStamina: mount.currentStamina };
        }

        if (targetState === "LOW_FLIGHT") {
            if (mount.altitudeState === "GROUNDED") {
                if (mount.currentStamina < this.TAKEOFF_STAMINA_COST) {
                    return { success: false, newState: mount.altitudeState, remainingStamina: mount.currentStamina, reason: "Insufficient stamina for takeoff." };
                }
                mount.currentStamina -= this.TAKEOFF_STAMINA_COST;
            }
            mount.altitudeState = "LOW_FLIGHT";
            mount.isAirborne = true;
            mount.isSwoopEmpowered = false;
        } else if (targetState === "HIGH_ALTITUDE_SWOOP") {
            const cost = this.SWOOP_STAMINA_COST + (mount.altitudeState === "GROUNDED" ? this.TAKEOFF_STAMINA_COST : 0);
            if (mount.currentStamina < cost) {
                return { success: false, newState: mount.altitudeState, remainingStamina: mount.currentStamina, reason: "Insufficient stamina for high altitude swoop ascent." };
            }
            mount.currentStamina -= cost;
            mount.altitudeState = "HIGH_ALTITUDE_SWOOP";
            mount.isAirborne = true;
            mount.isSwoopEmpowered = true;
        } else {
            // GROUNDED
            mount.altitudeState = "GROUNDED";
            mount.isAirborne = false;
            mount.isSwoopEmpowered = false;
        }

        return {
            success: true,
            newState: mount.altitudeState,
            remainingStamina: mount.currentStamina,
        };
    }

    /**
     * Unleashes the dragon's aerial breath weapon upon an aerial or ground target.
     */
    public static unleashDragonBreath(
        mount: ActiveDragonMount,
        target: AerialCombatTarget
    ): { success: boolean; damageDealt: number; appliedEffect?: string; remainingTargetHp: number; reason?: string } {
        if (!mount) {
            return { success: false, damageDealt: 0, remainingTargetHp: target?.currentHp ?? 0, reason: "Mount is invalid." };
        }

        if (!target || !target.isAlive || target.currentHp <= 0) {
            return { success: false, damageDealt: 0, remainingTargetHp: 0, reason: "Target is already dead or invalid." };
        }

        const breedData = DRAGON_CATALOG[mount.breed];
        let baseDmg = breedData.breathDamage;

        if (mount.isSwoopEmpowered) {
            baseDmg = Math.round(baseDmg * 1.50); // +50% swoop dive bomb bonus
            mount.isSwoopEmpowered = false; // Consumes swoop empowerment
            mount.altitudeState = "LOW_FLIGHT"; // Dives down to low flight
        }

        const actualDamage = Math.min(target.currentHp, baseDmg);
        target.currentHp -= actualDamage;

        if (target.currentHp === 0) {
            target.isAlive = false;
        }

        if (breedData.specialEffect) {
            if (!target.statusEffects) target.statusEffects = [];
            target.statusEffects.push(breedData.specialEffect);
        }

        return {
            success: true,
            damageDealt: actualDamage,
            appliedEffect: breedData.specialEffect,
            remainingTargetHp: target.currentHp,
        };
    }

    /**
     * Restores dragon mount stamina while grounded or gliding in low flight.
     */
    public static restStamina(
        mount: ActiveDragonMount,
        recoveryAmount = 30
    ): { success: boolean; newStamina: number } {
        if (!mount || mount.altitudeState === "HIGH_ALTITUDE_SWOOP") {
            return { success: false, newStamina: mount?.currentStamina ?? 0 };
        }

        const rec = Number.isFinite(recoveryAmount) ? Math.max(0, recoveryAmount) : 30;
        mount.currentStamina = Math.min(mount.maxStamina, mount.currentStamina + rec);

        return {
            success: true,
            newStamina: mount.currentStamina,
        };
    }
}