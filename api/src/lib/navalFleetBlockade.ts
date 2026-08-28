import crypto from "node:crypto";

/**
 * Oceanic Fleet Blockade, Harpoon Cannons & Cargo Interception Engine for OpenAO MMORPG.
 * Simulates establishing naval blockade chokepoints, harpoon grappling hooks,
 * broadside cannon salvos, and toll tax enforcement on passing vessels.
 */

export type SeaChokepoint = "STORM_STRAIT" | "SIREN_ARCHIPELAGO" | "SKULL_REEF" | "KRAKEN_ABYSS";
export type WarshipClass = "WAR_GALLEON" | "ARMORED_FRIGATE" | "DREADNOUGHT_IRONCLAD";

export interface WarshipData {
    className: WarshipClass;
    baseHullHp: number;
    cannonPower: number;
    harpoonRangeTiles: number;
}

export interface ActiveNavalBlockade {
    blockadeId: string;
    admiralPlayerId: string;
    warshipClass: WarshipClass;
    chokepoint: SeaChokepoint;
    anchorLocation: { x: number; y: number };
    controlRadiusTiles: number;
    currentHullHp: number;
    maxHullHp: number;
    tollTaxGoldAmount: number;
    isDestroyed: boolean;
}

export interface InterceptedVessel {
    vesselId: string;
    captainPlayerId: string;
    currentHullHp: number;
    maxHullHp: number;
    cargoGoldValue: number;
    isGrappled: boolean;
    isSunken: boolean;
}

export const WARSHIP_CATALOG: Record<WarshipClass, WarshipData> = {
    WAR_GALLEON: { className: "WAR_GALLEON", baseHullHp: 3000, cannonPower: 250, harpoonRangeTiles: 25 },
    ARMORED_FRIGATE: { className: "ARMORED_FRIGATE", baseHullHp: 4500, cannonPower: 380, harpoonRangeTiles: 35 },
    DREADNOUGHT_IRONCLAD: { className: "DREADNOUGHT_IRONCLAD", baseHullHp: 7000, cannonPower: 550, harpoonRangeTiles: 45 },
};

export class NavalFleetBlockadeEngine {
    /**
     * Establishes a new oceanic naval blockade at a sea chokepoint.
     */
    public static establishBlockade(
        admiralPlayerId: string,
        warshipClass: WarshipClass,
        chokepoint: SeaChokepoint,
        anchorX = 100,
        anchorY = 100,
        controlRadiusTiles = 30,
        tollTaxGoldAmount = 50
    ): ActiveNavalBlockade {
        const data = WARSHIP_CATALOG[warshipClass];
        if (!data) {
            throw new Error(`Unsupported warship class: ${String(warshipClass)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
        const radius = Number.isFinite(controlRadiusTiles) ? Math.max(10, Math.min(100, controlRadiusTiles)) : 30;
        const toll = Number.isFinite(tollTaxGoldAmount) ? Math.max(0, Math.floor(tollTaxGoldAmount)) : 50;

        return {
            blockadeId: `blockade_${warshipClass.toLowerCase()}_${uuid}`,
            admiralPlayerId,
            warshipClass,
            chokepoint,
            anchorLocation: {
                x: Number.isFinite(anchorX) ? anchorX : 0,
                y: Number.isFinite(anchorY) ? anchorY : 0,
            },
            controlRadiusTiles: radius,
            currentHullHp: data.baseHullHp,
            maxHullHp: data.baseHullHp,
            tollTaxGoldAmount: toll,
            isDestroyed: false,
        };
    }

    /**
     * Checks if a target vessel is within the blockade's territorial waters.
     */
    public static isVesselInBlockadeZone(
        blockade: ActiveNavalBlockade,
        vesselX: number,
        vesselY: number
    ): boolean {
        if (!blockade || blockade.isDestroyed) return false;

        const vx = Number.isFinite(vesselX) ? vesselX : 0;
        const vy = Number.isFinite(vesselY) ? vesselY : 0;

        const dx = blockade.anchorLocation.x - vx;
        const dy = blockade.anchorLocation.y - vy;
        const dist = Math.hypot(dx, dy);

        return dist <= blockade.controlRadiusTiles;
    }

    /**
     * Fires harpoon grappling hook to tether and intercept an intruder vessel, validated against warship harpoon range.
     */
    public static fireHarpoonGrapple(
        blockade: ActiveNavalBlockade,
        vessel: InterceptedVessel,
        vesselX: number,
        vesselY: number
    ): { success: boolean; isGrappled: boolean; reason?: string } {
        if (!blockade || blockade.isDestroyed) {
            return { success: false, isGrappled: false, reason: "Blockade warship is destroyed or invalid." };
        }

        if (!vessel || vessel.isSunken) {
            return { success: false, isGrappled: false, reason: "Target vessel is already sunken or invalid." };
        }

        const vx = Number.isFinite(vesselX) ? vesselX : 0;
        const vy = Number.isFinite(vesselY) ? vesselY : 0;
        const dist = Math.hypot(blockade.anchorLocation.x - vx, blockade.anchorLocation.y - vy);

        const data = WARSHIP_CATALOG[blockade.warshipClass];
        const harpoonRange = data.harpoonRangeTiles;

        if (dist > harpoonRange || !this.isVesselInBlockadeZone(blockade, vesselX, vesselY)) {
            return { success: false, isGrappled: false, reason: "Target vessel is beyond blockade harpoon perimeter." };
        }

        vessel.isGrappled = true;
        return { success: true, isGrappled: true };
    }

    /**
     * Fires broadside cannon salvo at an intercepted vessel.
     */
    public static fireBroadsideSalvo(
        blockade: ActiveNavalBlockade,
        vessel: InterceptedVessel,
        targetArmorRating = 0
    ): { success: boolean; damageDealt: number; remainingVesselHp: number; isSunken: boolean; plunderGoldAwarded: number } {
        if (!blockade || blockade.isDestroyed || !vessel || vessel.isSunken) {
            return { success: false, damageDealt: 0, remainingVesselHp: vessel?.currentHullHp ?? 0, isSunken: vessel?.isSunken ?? true, plunderGoldAwarded: 0 };
        }

        const data = WARSHIP_CATALOG[blockade.warshipClass];
        const armor = Number.isFinite(targetArmorRating) ? Math.max(0, targetArmorRating) : 0;
        const armorMitigation = 100 / (100 + armor);

        const damageDealt = Math.max(20, Math.floor(data.cannonPower * armorMitigation));
        vessel.currentHullHp = Math.max(0, vessel.currentHullHp - damageDealt);

        let isSunken = false;
        let plunderGold = 0;

        if (vessel.currentHullHp === 0) {
            vessel.isSunken = true;
            vessel.isGrappled = false;
            isSunken = true;
            plunderGold = Math.floor(vessel.cargoGoldValue * 0.75); // 75% salvaged from wreckage
        }

        return {
            success: true,
            damageDealt,
            remainingVesselHp: vessel.currentHullHp,
            isSunken,
            plunderGoldAwarded: plunderGold,
        };
    }
}