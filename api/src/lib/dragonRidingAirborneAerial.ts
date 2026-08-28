/**
 * Aerial Dragon Mount, Flight Stamina & Breath Weapon Engine for OpenAO MMORPG.
 * Simulates dragon mount summoning, altitude transitions (Grounded, Gliding, High Altitude Flight),
 * flight stamina decay meters, aerial breath weapon attacks, and emergency glide landings.
 */

export type DragonSpecies = "INFERNAL_DRAKE" | "STORM_WYVERN" | "FROST_DRAGON" | "CELESTIAL_SERAPH";
export type FlightAltitudeState = "GROUNDED" | "GLIDING" | "HIGH_ALTITUDE_FLIGHT" | "EMERGENCY_GLIDE_LANDING";

export interface DragonSpeciesData {
    species: DragonSpecies;
    elementalType: string;
    maxFlightSpeedKnots: number;
    breathDamage: number;
    maxStamina: number;
}

export interface ActiveDragonMount {
    mountId: string;
    ownerPlayerId: string;
    species: DragonSpecies;
    altitudeState: FlightAltitudeState;
    altitudeMeters: number;
    currentStamina: number;
    maxStamina: number;
    lastStaminaDecayEpochMs: number;
    isSummoned: boolean;
}

export const DRAGON_SPECIES_CATALOG: Record<DragonSpecies, DragonSpeciesData> = {
    INFERNAL_DRAKE: {
        species: "INFERNAL_DRAKE",
        elementalType: "FIRE",
        maxFlightSpeedKnots: 45,
        breathDamage: 450,
        maxStamina: 100,
    },
    STORM_WYVERN: {
        species: "STORM_WYVERN",
        elementalType: "LIGHTNING",
        maxFlightSpeedKnots: 55,
        breathDamage: 400,
        maxStamina: 90,
    },
    FROST_DRAGON: {
        species: "FROST_DRAGON",
        elementalType: "FROST",
        maxFlightSpeedKnots: 40,
        breathDamage: 500,
        maxStamina: 110,
    },
    CELESTIAL_SERAPH: {
        species: "CELESTIAL_SERAPH",
        elementalType: "HOLY",
        maxFlightSpeedKnots: 60,
        breathDamage: 600,
        maxStamina: 120,
    },
};

export class DragonRidingAirborneAerialEngine {
    /**
     * Summons a dragon mount for a player.
     */
    public static summonDragon(
        ownerPlayerId: string,
        species: DragonSpecies,
        currentEpochMs = Date.now()
    ): ActiveDragonMount {
        const data = DRAGON_SPECIES_CATALOG[species];
        if (!data) {
            throw new Error(`Unsupported dragon species: ${String(species)}`);
        }

        return {
            mountId: `mount_${species.toLowerCase()}_${currentEpochMs}_${Math.random().toString(36).substring(2, 7)}`,
            ownerPlayerId,
            species,
            altitudeState: "GROUNDED",
            altitudeMeters: 0,
            currentStamina: data.maxStamina,
            maxStamina: data.maxStamina,
            lastStaminaDecayEpochMs: currentEpochMs,
            isSummoned: true,
        };
    }

    /**
     * Transitions dragon mount to a target altitude state, settling pending stamina before resetting timer.
     */
    public static changeAltitude(
        mount: ActiveDragonMount,
        targetState: FlightAltitudeState,
        targetAltitudeMeters: number,
        currentEpochMs = Date.now()
    ): { success: boolean; newState: FlightAltitudeState; altitudeMeters: number; reason?: string } {
        if (!mount || !mount.isSummoned) {
            return { success: false, newState: mount?.altitudeState ?? "GROUNDED", altitudeMeters: 0, reason: "Dragon mount is not summoned." };
        }

        // Settle pending stamina decay/regen before switching states
        DragonRidingAirborneAerialEngine.updateFlightStamina(mount, currentEpochMs);

        if (mount.altitudeState === "EMERGENCY_GLIDE_LANDING" && targetState !== "GROUNDED") {
            return { success: false, newState: mount.altitudeState, altitudeMeters: mount.altitudeMeters, reason: "Mount is currently forced into emergency glide landing until grounded." };
        }

        if (targetState === "HIGH_ALTITUDE_FLIGHT" && mount.currentStamina < 15) {
            return { success: false, newState: mount.altitudeState, altitudeMeters: mount.altitudeMeters, reason: "Insufficient stamina to ascend to high altitude flight." };
        }

        const alt = Number.isFinite(targetAltitudeMeters) ? Math.max(0, Math.min(500, targetAltitudeMeters)) : 0;

        mount.altitudeState = targetState;
        mount.altitudeMeters = targetState === "GROUNDED" ? 0 : alt;
        mount.lastStaminaDecayEpochMs = currentEpochMs;

        return {
            success: true,
            newState: mount.altitudeState,
            altitudeMeters: mount.altitudeMeters,
        };
    }

    /**
     * Updates flight stamina based on elapsed seconds and current altitude state.
     */
    public static updateFlightStamina(
        mount: ActiveDragonMount,
        currentEpochMs = Date.now()
    ): { currentStamina: number; isForcedLanding: boolean } {
        if (!mount || !mount.isSummoned) {
            return { currentStamina: 0, isForcedLanding: false };
        }

        const elapsedSeconds = Math.max(0, (currentEpochMs - mount.lastStaminaDecayEpochMs) / 1000);
        mount.lastStaminaDecayEpochMs = currentEpochMs;

        if (mount.altitudeState === "HIGH_ALTITUDE_FLIGHT") {
            // Consumes 5 stamina per second
            const drain = elapsedSeconds * 5;
            mount.currentStamina = Math.max(0, mount.currentStamina - drain);

            if (mount.currentStamina === 0) {
                mount.altitudeState = "EMERGENCY_GLIDE_LANDING";
                mount.altitudeMeters = Math.min(15, mount.altitudeMeters);
                return { currentStamina: 0, isForcedLanding: true };
            }
        } else if (mount.altitudeState === "GROUNDED" || mount.altitudeState === "GLIDING") {
            // Recovers 2 stamina per second
            const regen = elapsedSeconds * 2;
            mount.currentStamina = Math.min(mount.maxStamina, mount.currentStamina + regen);
        }

        return { currentStamina: Math.round(mount.currentStamina * 10) / 10, isForcedLanding: false };
    }

    /**
     * Executes an aerial breath weapon attack against a target.
     */
    public static breathWeaponAttack(
        mount: ActiveDragonMount,
        targetArmorRating = 0
    ): { success: boolean; damageDealt: number; remainingStamina: number; reason?: string } {
        if (!mount || !mount.isSummoned) {
            return { success: false, damageDealt: 0, remainingStamina: 0, reason: "Dragon mount is not summoned." };
        }

        if (mount.currentStamina < 20) {
            return { success: false, damageDealt: 0, remainingStamina: mount.currentStamina, reason: "Insufficient stamina to channel breath weapon (requires 20 stamina)." };
        }

        const data = DRAGON_SPECIES_CATALOG[mount.species];
        const armor = Number.isFinite(targetArmorRating) ? Math.max(0, targetArmorRating) : 0;
        const armorMitigation = 100 / (100 + armor);

        const damageDealt = Math.max(25, Math.floor(data.breathDamage * armorMitigation));
        mount.currentStamina -= 20;

        return {
            success: true,
            damageDealt,
            remainingStamina: Math.round(mount.currentStamina * 10) / 10,
        };
    }
}