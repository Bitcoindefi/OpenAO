/**
 * Ancient Relic Excavation, Archaeology Surveying & Artifact Restoration Engine for OpenAO MMORPG.
 * Simulates survey triangulation pulses, delicate brush unearthing with fragility thresholds,
 * dig site excavation state tracking, fragment reconstruction into ancient artifacts, and museum curation exhibition points.
 */

export type DigSiteTheme = "DESERT_TOMB" | "FROZEN_GLACIER" | "SUNKEN_ATLANTIS" | "VOLCANIC_RUINS";
export type SurveyDistanceCue = "COLD" | "WARM" | "HOT" | "EXCAVATION_NODE_FOUND";

export interface ArchaeologyDigSite {
    siteId: string;
    theme: DigSiteTheme;
    targetRelicLocation: { x: number; y: number };
    totalFragmentsRemaining: number;
    isFullyExcavated: boolean;
}

export interface ExcavationFragmentSession {
    sessionId: string;
    siteId: string;
    fragilityThreshold: number; // Max pressure before shattering (e.g. 80)
    currentPressureAccumulated: number;
    unearthProgressPercent: number; // 0 to 100
    isShattered: boolean;
    isSuccessfullyUnearthed: boolean;
}

export interface RestoredArtifact {
    artifactId: string;
    artifactName: string;
    theme: DigSiteTheme;
    fragmentsCombinedCount: number;
    museumExhibitionPoints: number;
}

export class RelicExcavationArchaeologyEngine {
    /**
     * Conducts a surveying triangulation pulse from the player's coordinate.
     */
    public static surveyTriangulation(
        site: ArchaeologyDigSite,
        playerX: number,
        playerY: number
    ): { cue: SurveyDistanceCue; distanceTiles: number } {
        if (!site || site.isFullyExcavated || site.totalFragmentsRemaining <= 0) {
            return { cue: "COLD", distanceTiles: 999 };
        }

        const px = Number.isFinite(playerX) ? playerX : 0;
        const py = Number.isFinite(playerY) ? playerY : 0;

        const dx = site.targetRelicLocation.x - px;
        const dy = site.targetRelicLocation.y - py;
        const distanceTiles = Math.round(Math.hypot(dx, dy));

        if (distanceTiles === 0) return { cue: "EXCAVATION_NODE_FOUND", distanceTiles: 0 };
        if (distanceTiles <= 20) return { cue: "HOT", distanceTiles };
        if (distanceTiles <= 50) return { cue: "WARM", distanceTiles };
        return { cue: "COLD", distanceTiles };
    }

    /**
     * Starts an archaeological excavation session on a found node.
     */
    public static startExcavationSession(
        site: ArchaeologyDigSite,
        fragilityThreshold = 80
    ): { success: boolean; session?: ExcavationFragmentSession; reason?: string } {
        if (!site || site.isFullyExcavated || site.totalFragmentsRemaining <= 0) {
            return { success: false, reason: "Dig site is already fully excavated." };
        }

        const session: ExcavationFragmentSession = {
            sessionId: `excav_${site.siteId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            siteId: site.siteId,
            fragilityThreshold: Math.max(20, Math.min(100, fragilityThreshold)),
            currentPressureAccumulated: 0,
            unearthProgressPercent: 0,
            isShattered: false,
            isSuccessfullyUnearthed: false,
        };

        return { success: true, session };
    }

    /**
     * Applies a brush stroke to unearth the fragment, prioritizing 100% completion and mutating dig site state.
     */
    public static applyBrushStroke(
        session: ExcavationFragmentSession,
        brushTechnique: "DELICATE" | "STANDARD" | "AGGRESSIVE",
        site?: ArchaeologyDigSite
    ): { success: boolean; progress: number; pressure: number; isShattered: boolean; isUnearthed: boolean; reason?: string } {
        if (!session || session.isShattered || session.isSuccessfullyUnearthed) {
            return { success: false, progress: session?.unearthProgressPercent ?? 0, pressure: session?.currentPressureAccumulated ?? 0, isShattered: session?.isShattered ?? false, isUnearthed: session?.isSuccessfullyUnearthed ?? false, reason: "Session is already finished." };
        }

        let progressGain = 15;
        let pressureGain = 10;

        if (brushTechnique === "DELICATE") {
            progressGain = 10;
            pressureGain = 5;
        } else if (brushTechnique === "AGGRESSIVE") {
            progressGain = 35;
            pressureGain = 30;
        }

        session.currentPressureAccumulated += pressureGain;
        session.unearthProgressPercent = Math.min(100, session.unearthProgressPercent + progressGain);

        if (session.unearthProgressPercent >= 100) {
            session.isSuccessfullyUnearthed = true;

            // Mutate site state if provided
            if (site && site.siteId === session.siteId) {
                site.totalFragmentsRemaining = Math.max(0, site.totalFragmentsRemaining - 1);
                if (site.totalFragmentsRemaining === 0) {
                    site.isFullyExcavated = true;
                }
            }

            return {
                success: true,
                progress: session.unearthProgressPercent,
                pressure: session.currentPressureAccumulated,
                isShattered: false,
                isUnearthed: true,
            };
        }

        if (session.currentPressureAccumulated > session.fragilityThreshold) {
            session.isShattered = true;
            return {
                success: false,
                progress: session.unearthProgressPercent,
                pressure: session.currentPressureAccumulated,
                isShattered: true,
                isUnearthed: false,
                reason: "Pressure exceeded fragility threshold! The fragment shattered into dust.",
            };
        }

        return {
            success: true,
            progress: session.unearthProgressPercent,
            pressure: session.currentPressureAccumulated,
            isShattered: false,
            isUnearthed: false,
        };
    }

    /**
     * Restores an ancient relic artifact from collected fragments with unique entropy ID.
     */
    public static restoreArtifact(
        theme: DigSiteTheme,
        fragmentCount: number,
        artifactName: string
    ): { success: boolean; artifact?: RestoredArtifact; reason?: string } {
        const count = Number.isFinite(fragmentCount) ? Math.floor(fragmentCount) : 0;
        if (count < 4) {
            return { success: false, reason: `Artifact restoration requires at least 4 fragments. Provided: ${count}.` };
        }

        const museumPoints = count * 150;
        const uniqueSuffix = Math.random().toString(36).substring(2, 7);
        const artifact: RestoredArtifact = {
            artifactId: `relic_${theme.toLowerCase()}_${Date.now()}_${uniqueSuffix}`,
            artifactName: artifactName || `Ancient ${theme} Relic`,
            theme,
            fragmentsCombinedCount: count,
            museumExhibitionPoints: museumPoints,
        };

        return {
            success: true,
            artifact,
        };
    }
}