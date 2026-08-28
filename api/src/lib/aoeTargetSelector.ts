/**
 * 2D Area of Effect (AoE) Geometric Target Selector for OpenAO MMORPG.
 * Simulates circular blasts, directional cones, linear beams, and ring/donut spells
 * with faction filtering, friendly fire protection, and line-of-sight wall obstruction raycasting.
 */

export type AoEShapeType = "CIRCLE" | "CONE_SECTOR" | "LINEAR_BEAM" | "DONUT_RING";

export interface Point2D {
    x: number;
    y: number;
}

export interface TargetEntity extends Point2D {
    entityId: string;
    faction?: string;
    isAlive: boolean;
}

export interface AoEShapeParameters {
    shapeType: AoEShapeType;
    origin: Point2D;
    radius?: number;             // For CIRCLE, DONUT_RING, CONE_SECTOR
    innerRadius?: number;        // For DONUT_RING
    facingAngleRad?: number;     // Direction angle in radians for CONE_SECTOR and LINEAR_BEAM
    coneSpreadAngleRad?: number; // Spread angle (e.g. PI/3 = 60 deg) for CONE_SECTOR
    beamLength?: number;         // For LINEAR_BEAM
    beamWidth?: number;          // For LINEAR_BEAM
    casterEntityId?: string;     // Optional caster ID for self-harm filtering
    casterFaction?: string;      // Optional faction for friendly-fire filtering
    allowFriendlyFire?: boolean; // Defaults to false
    allowSelfHarm?: boolean;     // Defaults to false
}

export class AoETargetSelector {
    /**
     * Normalizes an angle in radians to [-PI, PI].
     */
    private static normalizeAngle(angle: number): number {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    /**
     * Checks if a point falls within the geometric bounds of the specified AoE shape.
     */
    public static isPointInShape(point: Point2D, params: AoEShapeParameters): boolean {
        const dx = point.x - params.origin.x;
        const dy = point.y - params.origin.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        switch (params.shapeType) {
            case "CIRCLE": {
                const radius = params.radius ?? 5;
                return dist <= radius;
            }

            case "DONUT_RING": {
                const outer = params.radius ?? 5;
                const inner = params.innerRadius ?? 2;
                return dist >= inner && dist <= outer;
            }

            case "CONE_SECTOR": {
                const radius = params.radius ?? 5;
                if (dist > radius) return false;
                if (dist === 0) return true;

                const targetAngle = Math.atan2(dy, dx);
                const facing = params.facingAngleRad ?? 0;
                const halfSpread = (params.coneSpreadAngleRad ?? Math.PI / 3) / 2;

                const diff = Math.abs(this.normalizeAngle(targetAngle - facing));
                return diff <= halfSpread;
            }

            case "LINEAR_BEAM": {
                const length = params.beamLength ?? 10;
                const width = params.beamWidth ?? 2;
                const facing = params.facingAngleRad ?? 0;

                // Rotate point into beam local space
                const cos = Math.cos(-facing);
                const sin = Math.sin(-facing);
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;

                return localX >= 0 && localX <= length && Math.abs(localY) <= width / 2;
            }

            default:
                return false;
        }
    }

    /**
     * Selects all valid target entities inside the AoE shape with team/friendly-fire protection
     * and line-of-sight wall obstruction checking.
     */
    public static selectTargets(
        entities: TargetEntity[],
        params: AoEShapeParameters,
        blockedTiles?: Set<string>
    ): TargetEntity[] {
        return entities.filter((entity) => {
            if (!entity.isAlive) return false;

            // Self-harm filter
            if (!params.allowSelfHarm && params.casterEntityId && entity.entityId === params.casterEntityId) {
                return false;
            }

            // Friendly-fire filter
            if (!params.allowFriendlyFire && params.casterFaction && entity.faction && entity.faction === params.casterFaction) {
                return false;
            }

            if (!this.isPointInShape(entity, params)) return false;

            // Line of sight check if blocked tiles are provided
            if (blockedTiles && blockedTiles.size > 0) {
                if (this.isLineOfSightBlocked(params.origin, entity, blockedTiles)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Bresenham raycasting line-of-sight check between origin and target.
     */
    public static isLineOfSightBlocked(from: Point2D, to: Point2D, blockedTiles: Set<string>): boolean {
        let x0 = Math.round(from.x);
        let y0 = Math.round(from.y);
        const x1 = Math.round(to.x);
        const y1 = Math.round(to.y);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            // Check current tile (ignore origin and destination)
            if ((x0 !== Math.round(from.x) || y0 !== Math.round(from.y)) &&
                (x0 !== x1 || y0 !== y1)) {
                if (blockedTiles.has(`${x0},${y0}`)) {
                    return true;
                }
            }

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return false;
    }
}