import crypto from "node:crypto";

/**
 * Ancient Runic Chrono-Stasis, Temporal Distortion & Time-Dilation Field Engine for OpenAO MMORPG.
 * Simulates temporal distortion devices (Chrono Hourglass, Time-Warp Anchor, Singularity Core),
 * area of effect time-dilation bubbles (8 to 16 tiles), friendly Temporal Haste (+50% haste),
 * enemy Chrono Stasis locks (immobilization), field lifespan decay, and mana upkeep starvation.
 */

export type ChronoDeviceType = "CHRONO_HOURGLASS" | "TIME_WARP_ANCHOR" | "SINGULARITY_TEMPORAL_CORE";

export interface ChronoDeviceData {
    deviceType: ChronoDeviceType;
    fieldRadiusTiles: number;
    baseLifespanSeconds: number;
    upkeepManaPerSecond: number;
}

export interface ActiveTimeDilationField {
    fieldId: string;
    casterPlayerId: string;
    deviceType: ChronoDeviceType;
    centerLocation: { x: number; y: number };
    fieldRadiusTiles: number;
    remainingLifespanSeconds: number;
    isActive: boolean;
    createdEpochMs: number;
}

export interface ChronoCombatEntity {
    entityId: string;
    isFriendlyToCaster: boolean;
    location: { x: number; y: number };
    isAlive: boolean;
    activeChronoEffects: string[];
}

export const CHRONO_DEVICE_CATALOG: Record<ChronoDeviceType, ChronoDeviceData> = {
    CHRONO_HOURGLASS: { deviceType: "CHRONO_HOURGLASS", fieldRadiusTiles: 8, baseLifespanSeconds: 30, upkeepManaPerSecond: 10 },
    TIME_WARP_ANCHOR: { deviceType: "TIME_WARP_ANCHOR", fieldRadiusTiles: 12, baseLifespanSeconds: 45, upkeepManaPerSecond: 18 },
    SINGULARITY_TEMPORAL_CORE: { deviceType: "SINGULARITY_TEMPORAL_CORE", fieldRadiusTiles: 16, baseLifespanSeconds: 60, upkeepManaPerSecond: 25 },
};

export class AncientRunicChronoStasisEngine {
    /**
     * Deploys a new Time-Dilation Field at target coordinates.
     */
    public static deployTemporalField(
        casterPlayerId: string,
        deviceType: ChronoDeviceType,
        locX = 0,
        locY = 0,
        currentEpochMs = Date.now()
    ): ActiveTimeDilationField {
        const data = CHRONO_DEVICE_CATALOG[deviceType];
        if (!data) {
            throw new Error(`Unsupported chrono device: ${String(deviceType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            fieldId: `temporal_field_${deviceType.toLowerCase()}_${uuid}`,
            casterPlayerId,
            deviceType,
            centerLocation: {
                x: Number.isFinite(locX) ? locX : 0,
                y: Number.isFinite(locY) ? locY : 0,
            },
            fieldRadiusTiles: data.fieldRadiusTiles,
            remainingLifespanSeconds: data.baseLifespanSeconds,
            isActive: true,
            createdEpochMs: currentEpochMs,
        };
    }

    /**
     * Pulses temporal distortion effects on nearby entities within the field radius.
     */
    public static pulseTemporalField(
        field: ActiveTimeDilationField,
        entities: ChronoCombatEntity[]
    ): { success: boolean; affectedCount: number; hasteAppliedCount: number; stasisAppliedCount: number; reason?: string } {
        if (!field || !field.isActive || field.remainingLifespanSeconds <= 0) {
            return { success: false, affectedCount: 0, hasteAppliedCount: 0, stasisAppliedCount: 0, reason: "Temporal field is collapsed or invalid." };
        }

        if (!Array.isArray(entities)) {
            return { success: false, affectedCount: 0, hasteAppliedCount: 0, stasisAppliedCount: 0, reason: "Invalid entities array." };
        }

        let hasteCount = 0;
        let stasisCount = 0;

        for (const entity of entities) {
            if (!entity) continue;

            // Fresh pulse: remove existing chrono auras (even for dead entities)
            entity.activeChronoEffects = entity.activeChronoEffects
                ? entity.activeChronoEffects.filter(e => e !== "TEMPORAL_HASTE_50" && e !== "CHRONO_STASIS_LOCK")
                : [];

            if (!entity.isAlive) continue;

            const dist = Math.hypot(field.centerLocation.x - entity.location.x, field.centerLocation.y - entity.location.y);

            if (dist <= field.fieldRadiusTiles) {
                if (entity.isFriendlyToCaster) {
                    entity.activeChronoEffects.push("TEMPORAL_HASTE_50");
                    hasteCount++;
                } else {
                    entity.activeChronoEffects.push("CHRONO_STASIS_LOCK");
                    stasisCount++;
                }
            }
        }

        return {
            success: true,
            affectedCount: hasteCount + stasisCount,
            hasteAppliedCount: hasteCount,
            stasisAppliedCount: stasisCount,
        };
    }

    /**
     * Ticks field lifespan and consumes caster mana upkeep. Collapses if caster runs out of mana.
     */
    public static tickFieldLifespan(
        field: ActiveTimeDilationField,
        elapsedSeconds = 1,
        availableCasterMana = Number.POSITIVE_INFINITY
    ): { success: boolean; remainingSeconds: number; remainingMana: number; isCollapsed: boolean; collapseReason?: string } {
        if (!field || !field.isActive) {
            return { success: false, remainingSeconds: 0, remainingMana: availableCasterMana, isCollapsed: true, collapseReason: "Field already inactive." };
        }

        const sec = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 1;
        const billableSec = Math.min(sec, field.remainingLifespanSeconds);
        const deviceData = CHRONO_DEVICE_CATALOG[field.deviceType];
        const manaCost = billableSec * deviceData.upkeepManaPerSecond;

        if (Number.isFinite(availableCasterMana) && availableCasterMana < manaCost) {
            field.isActive = false;
            return {
                success: true,
                remainingSeconds: field.remainingLifespanSeconds,
                remainingMana: availableCasterMana,
                isCollapsed: true,
                collapseReason: `Mana starvation: required ${manaCost} mana, had ${availableCasterMana}.`,
            };
        }

        const remainingMana = Number.isFinite(availableCasterMana) ? availableCasterMana - manaCost : availableCasterMana;
        field.remainingLifespanSeconds = Math.max(0, field.remainingLifespanSeconds - sec);

        if (field.remainingLifespanSeconds === 0) {
            field.isActive = false;
        }

        return {
            success: true,
            remainingSeconds: field.remainingLifespanSeconds,
            remainingMana,
            isCollapsed: !field.isActive,
            collapseReason: !field.isActive ? "Duration expired." : undefined,
        };
    }
}