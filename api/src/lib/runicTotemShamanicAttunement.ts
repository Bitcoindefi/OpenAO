import crypto from "node:crypto";

/**
 * Shamanic Elemental Totem Placement, Leyline Resonance & Spirit Surge Engine for OpenAO MMORPG.
 * Simulates placing elemental totems (Earthwarden, Windfury, Tidal Wave), 12-tile area aura resonance,
 * 3-totem Elemental Storm Surge overloads (+50% potency), and totem durability/expiration tracking.
 */

export type ShamanicTotemType = "EARTHWARDEN_TOTEM" | "WINDFURY_TOTEM" | "TIDAL_WAVE_TOTEM";

export interface TotemData {
    totemType: ShamanicTotemType;
    baseBuffValue: number;
    statType: string;
    manaCost: number;
    lifespanSeconds: number;
}

export interface PlacedTotem {
    totemId: string;
    shamanPlayerId: string;
    totemType: ShamanicTotemType;
    location: { x: number; y: number };
    currentHp: number;
    maxHp: number;
    placedEpochMs: number;
    expiresEpochMs: number;
    isDestroyed: boolean;
}

export interface PartyMemberTarget {
    playerId: string;
    location: { x: number; y: number };
    activeTotemBuffs: Record<string, number>;
    isAlive: boolean;
}

export const TOTEM_CATALOG: Record<ShamanicTotemType, TotemData> = {
    EARTHWARDEN_TOTEM: { totemType: "EARTHWARDEN_TOTEM", baseBuffValue: 40, statType: "ARMOR_RATING", manaCost: 50, lifespanSeconds: 120 },
    WINDFURY_TOTEM: { totemType: "WINDFURY_TOTEM", baseBuffValue: 35, statType: "ATTACK_SPEED_PERCENT", manaCost: 60, lifespanSeconds: 120 },
    TIDAL_WAVE_TOTEM: { totemType: "TIDAL_WAVE_TOTEM", baseBuffValue: 80, statType: "HEALTH_REGEN_PER_SEC", manaCost: 70, lifespanSeconds: 120 },
};

export class RunicTotemShamanicAttunementEngine {
    public static readonly RESONANCE_RADIUS_TILES = 12;

    /**
     * Deploys an elemental shamanic totem at designated coordinates.
     */
    public static placeTotem(
        shamanPlayerId: string,
        totemType: ShamanicTotemType,
        locX = 0,
        locY = 0,
        currentEpochMs = Date.now()
    ): PlacedTotem {
        const data = TOTEM_CATALOG[totemType];
        if (!data) {
            throw new Error(`Unsupported totem type: ${String(totemType)}`);
        }

        const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${currentEpochMs}_${Math.random()}`;

        return {
            totemId: `totem_${totemType.toLowerCase()}_${uuid}`,
            shamanPlayerId,
            totemType,
            location: {
                x: Number.isFinite(locX) ? locX : 0,
                y: Number.isFinite(locY) ? locY : 0,
            },
            currentHp: 500,
            maxHp: 500,
            placedEpochMs: currentEpochMs,
            expiresEpochMs: currentEpochMs + data.lifespanSeconds * 1000,
            isDestroyed: false,
        };
    }

    /**
     * Checks if all 3 distinct elemental totems are active within mutual resonance range of the same shaman.
     */
    public static isElementalStormSurgeActive(
        totems: PlacedTotem[],
        currentEpochMs = Date.now()
    ): boolean {
        if (!Array.isArray(totems) || totems.length < 3) return false;

        const activeTotems = totems.filter(t => t && !t.isDestroyed && t.currentHp > 0 && currentEpochMs < t.expiresEpochMs);

        // Group by shaman
        const byShaman = new Map<string, PlacedTotem[]>();
        for (const t of activeTotems) {
            if (!byShaman.has(t.shamanPlayerId)) byShaman.set(t.shamanPlayerId, []);
            byShaman.get(t.shamanPlayerId)!.push(t);
        }

        for (const [, shamanTotems] of byShaman.entries()) {
            const earth = shamanTotems.find(t => t.totemType === "EARTHWARDEN_TOTEM");
            const wind = shamanTotems.find(t => t.totemType === "WINDFURY_TOTEM");
            const water = shamanTotems.find(t => t.totemType === "TIDAL_WAVE_TOTEM");

            if (earth && wind && water) {
                // Check mutual pairwise distances
                const dEW = Math.hypot(earth.location.x - wind.location.x, earth.location.y - wind.location.y);
                const dEWtr = Math.hypot(earth.location.x - water.location.x, earth.location.y - water.location.y);
                const dWWtr = Math.hypot(wind.location.x - water.location.x, wind.location.y - water.location.y);

                if (dEW <= this.RESONANCE_RADIUS_TILES && dEWtr <= this.RESONANCE_RADIUS_TILES && dWWtr <= this.RESONANCE_RADIUS_TILES) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Broadcasts totem aura buffs to party members within 12-tile resonance radius.
     */
    public static pulseTotemAuras(
        totems: PlacedTotem[],
        partyMembers: PartyMemberTarget[],
        currentEpochMs = Date.now()
    ): { affectedPartyCount: number; isStormSurgeActive: boolean } {
        if (!Array.isArray(totems) || !Array.isArray(partyMembers)) {
            return { affectedPartyCount: 0, isStormSurgeActive: false };
        }

        // Reset buffs on all members for fresh pulse
        for (const member of partyMembers) {
            if (member) member.activeTotemBuffs = {};
        }

        const isSurge = this.isElementalStormSurgeActive(totems, currentEpochMs);
        const surgeMultiplier = isSurge ? 1.50 : 1.0;

        const affectedMembers = new Set<string>();

        for (const totem of totems) {
            if (!totem || totem.isDestroyed || totem.currentHp <= 0 || currentEpochMs >= totem.expiresEpochMs) {
                continue;
            }

            const data = TOTEM_CATALOG[totem.totemType];
            const finalValue = Math.round(data.baseBuffValue * surgeMultiplier);

            for (const member of partyMembers) {
                if (!member || !member.isAlive) continue;

                const dx = totem.location.x - member.location.x;
                const dy = totem.location.y - member.location.y;
                const dist = Math.hypot(dx, dy);

                if (dist <= this.RESONANCE_RADIUS_TILES) {
                    if (!member.activeTotemBuffs) member.activeTotemBuffs = {};
                    member.activeTotemBuffs[data.statType] = (member.activeTotemBuffs[data.statType] || 0) + finalValue;
                    affectedMembers.add(member.playerId);
                }
            }
        }

        return {
            affectedPartyCount: affectedMembers.size,
            isStormSurgeActive: isSurge,
        };
    }

    /**
     * Applies damage to a totem, potentially destroying it.
     */
    public static damageTotem(
        totem: PlacedTotem,
        damageAmount: number
    ): { success: boolean; remainingHp: number; isDestroyed: boolean } {
        if (!totem || totem.isDestroyed) return { success: false, remainingHp: 0, isDestroyed: true };

        const dmg = Number.isFinite(damageAmount) ? Math.max(0, damageAmount) : 0;
        totem.currentHp = Math.max(0, totem.currentHp - dmg);

        if (totem.currentHp === 0) {
            totem.isDestroyed = true;
        }

        return {
            success: true,
            remainingHp: totem.currentHp,
            isDestroyed: totem.isDestroyed,
        };
    }
}