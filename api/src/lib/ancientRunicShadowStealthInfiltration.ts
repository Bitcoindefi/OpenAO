/**
 * Ancient Runic Shadow Stealth, Camouflage & Infiltration Engine for OpenAO MMORPG.
 * Simulates rogue shadow stealth cloaks (Shadowveil Shroud, Umbral Stalker, Void Phantom Cowl),
 * environmental illumination levels (0 to 100), guard vision cones (90 deg), backstab ambushes (3.0x multiplier),
 * and smoke bomb diversion screens.
 */

export type StealthCloakType = "SHADOWVEIL_SHROUD" | "UMBRAL_STALKER_CLOAK" | "VOID_PHANTOM_COWL";

export interface CloakData {
    cloakType: StealthCloakType;
    baseStealthRating: number; // 0 to 100
    speedMultiplier: number;
    backstabBonusMultiplier: number;
}

export interface InfiltrationRogue {
    rogueId: string;
    cloakType: StealthCloakType;
    location: { x: number; y: number };
    isStealthed: boolean;
    currentEnergy: number;
    maxEnergy: number;
}

export interface DungeonPatrolGuard {
    guardId: string;
    location: { x: number; y: number };
    facingAngleDegrees: number; // 0 to 359
    visionRangeTiles: number;
    perceptionRating: number;
    currentHp: number;
    isAlerted: boolean;
    isAlive: boolean;
}

export const CLOAK_CATALOG: Record<StealthCloakType, CloakData> = {
    SHADOWVEIL_SHROUD: { cloakType: "SHADOWVEIL_SHROUD", baseStealthRating: 80, speedMultiplier: 1.0, backstabBonusMultiplier: 3.0 },
    UMBRAL_STALKER_CLOAK: { cloakType: "UMBRAL_STALKER_CLOAK", baseStealthRating: 90, speedMultiplier: 1.15, backstabBonusMultiplier: 3.5 },
    VOID_PHANTOM_COWL: { cloakType: "VOID_PHANTOM_COWL", baseStealthRating: 100, speedMultiplier: 1.30, backstabBonusMultiplier: 4.0 },
};

export class AncientRunicShadowStealthInfiltrationEngine {
    public static readonly GUARD_VISION_CONE_HALF_ANGLE_DEGREES = 45; // 90 deg total cone

    /**
     * Equips and initializes an infiltration rogue.
     */
    public static createRogue(
        rogueId: string,
        cloakType: StealthCloakType,
        locX = 0,
        locY = 0
    ): InfiltrationRogue {
        const data = CLOAK_CATALOG[cloakType];
        if (!data) {
            throw new Error(`Unsupported cloak type: ${String(cloakType)}`);
        }

        return {
            rogueId,
            cloakType,
            location: {
                x: Number.isFinite(locX) ? locX : 0,
                y: Number.isFinite(locY) ? locY : 0,
            },
            isStealthed: true,
            currentEnergy: 100,
            maxEnergy: 100,
        };
    }

    /**
     * Checks if a guard detects the rogue based on vision cone, distance, ambient light level, and stealth.
     */
    public static isRogueDetectedByGuard(
        rogue: InfiltrationRogue,
        guard: DungeonPatrolGuard,
        ambientLightLevel = 50,
        isInsideSmokeScreen = false
    ): boolean {
        if (!rogue || !guard || !guard.isAlive) {
            return false;
        }

        if (isInsideSmokeScreen) {
            return false; // Smoke screen grants 100% visual concealment
        }

        const dx = rogue.location.x - guard.location.x;
        const dy = rogue.location.y - guard.location.y;
        const dist = Math.hypot(dx, dy);

        if (dist > guard.visionRangeTiles) {
            return false; // Out of visual range
        }

        // Angle from guard to rogue
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * (180 / Math.PI) + 360) % 360;

        const facing = (guard.facingAngleDegrees % 360 + 360) % 360;
        const angleDiff = Math.min(Math.abs(angleDeg - facing), 360 - Math.abs(angleDeg - facing));

        if (angleDiff > this.GUARD_VISION_CONE_HALF_ANGLE_DEGREES) {
            return false; // Rogue is behind or outside guard vision cone
        }

        // Non-stealthed rogue in vision cone is always detected
        if (!rogue.isStealthed) {
            return true;
        }

        // Inside vision cone while stealthed: check perception vs stealth modified by light level
        const cloak = CLOAK_CATALOG[rogue.cloakType];
        const light = Math.max(0, Math.min(100, Number.isFinite(ambientLightLevel) ? ambientLightLevel : 50));

        const detectionThreshold = guard.perceptionRating * (light / 50);
        return detectionThreshold > cloak.baseStealthRating;
    }

    /**
     * Executes a stealth ambush attack against a target guard.
     */
    public static executeAmbushAttack(
        rogue: InfiltrationRogue,
        guard: DungeonPatrolGuard,
        baseWeaponDamage = 100
    ): { success: boolean; isBackstab: boolean; damageDealt: number; remainingGuardHp: number; reason?: string } {
        if (!rogue) {
            return { success: false, isBackstab: false, damageDealt: 0, remainingGuardHp: guard?.currentHp ?? 0, reason: "Rogue is invalid." };
        }

        if (!guard || !guard.isAlive || guard.currentHp <= 0) {
            return { success: false, isBackstab: false, damageDealt: 0, remainingGuardHp: 0, reason: "Guard is already defeated or invalid." };
        }

        const dx = rogue.location.x - guard.location.x;
        const dy = rogue.location.y - guard.location.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 3) {
            return { success: false, isBackstab: false, damageDealt: 0, remainingGuardHp: guard.currentHp, reason: "Target is out of melee strike range (max 3 tiles)." };
        }

        const cloak = CLOAK_CATALOG[rogue.cloakType];
        const baseDmg = Number.isFinite(baseWeaponDamage) ? Math.max(1, baseWeaponDamage) : 100;

        // Check if behind guard (outside 90 deg vision cone)
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * (180 / Math.PI) + 360) % 360;
        const facing = (guard.facingAngleDegrees % 360 + 360) % 360;
        const angleDiff = Math.min(Math.abs(angleDeg - facing), 360 - Math.abs(angleDeg - facing));

        const isBehind = angleDiff > this.GUARD_VISION_CONE_HALF_ANGLE_DEGREES;
        const isBackstab = rogue.isStealthed && isBehind;

        const multiplier = isBackstab ? cloak.backstabBonusMultiplier : (rogue.isStealthed ? 1.5 : 1.0);
        const totalDamage = Math.round(baseDmg * multiplier);
        const actualDamage = Math.min(guard.currentHp, totalDamage);

        guard.currentHp -= actualDamage;
        if (guard.currentHp === 0) {
            guard.isAlive = false;
        } else {
            guard.isAlerted = true;
        }

        rogue.isStealthed = false; // Stealth breaks on attack

        return {
            success: true,
            isBackstab,
            damageDealt: actualDamage,
            remainingGuardHp: guard.currentHp,
        };
    }
}