/**
 * Spatial Quadtree Data Structure for OpenAO MMORPG.
 * Drastically optimizes 2D collision detection and Area of Effect (AoE) resolutions
 * with maximum depth bounds to prevent infinite recursion on stacked entities.
 */

export interface Point2D {
    x: number;
    y: number;
}

export interface SpatialEntity extends Point2D {
    entityId: string;
}

export class AABB {
    constructor(
        public centerX: number,
        public centerY: number,
        public halfWidth: number,
        public halfHeight: number
    ) {}

    public containsPoint(p: Point2D): boolean {
        return (
            p.x >= this.centerX - this.halfWidth &&
            p.x <= this.centerX + this.halfWidth &&
            p.y >= this.centerY - this.halfHeight &&
            p.y <= this.centerY + this.halfHeight
        );
    }

    public intersectsAABB(other: AABB): boolean {
        return !(
            other.centerX - other.halfWidth > this.centerX + this.halfWidth ||
            other.centerX + other.halfWidth < this.centerX - this.halfWidth ||
            other.centerY - other.halfHeight > this.centerY + this.halfHeight ||
            other.centerY + other.halfHeight < this.centerY - this.halfHeight
        );
    }
}

export class Quadtree {
    private static readonly CAPACITY = 4;
    private static readonly MAX_DEPTH = 8; // Prevents infinite recursion on stacked entities

    private entities: SpatialEntity[] = [];
    private divided = false;
    
    private northWest: Quadtree | null = null;
    private northEast: Quadtree | null = null;
    private southWest: Quadtree | null = null;
    private southEast: Quadtree | null = null;

    constructor(public boundary: AABB, private depth: number = 0) {}

    private subdivide(): void {
        const x = this.boundary.centerX;
        const y = this.boundary.centerY;
        const w = this.boundary.halfWidth;
        const h = this.boundary.halfHeight;
        const nextDepth = this.depth + 1;

        this.northWest = new Quadtree(new AABB(x - w / 2, y + h / 2, w / 2, h / 2), nextDepth);
        this.northEast = new Quadtree(new AABB(x + w / 2, y + h / 2, w / 2, h / 2), nextDepth);
        this.southWest = new Quadtree(new AABB(x - w / 2, y - h / 2, w / 2, h / 2), nextDepth);
        this.southEast = new Quadtree(new AABB(x + w / 2, y - h / 2, w / 2, h / 2), nextDepth);

        this.divided = true;
    }

    public insert(entity: SpatialEntity): boolean {
        if (!this.boundary.containsPoint(entity)) {
            return false;
        }

        // If below capacity OR reached max depth cap, store directly in this leaf
        if (this.entities.length < Quadtree.CAPACITY || this.depth >= Quadtree.MAX_DEPTH) {
            this.entities.push(entity);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        return (
            this.northWest!.insert(entity) ||
            this.northEast!.insert(entity) ||
            this.southWest!.insert(entity) ||
            this.southEast!.insert(entity)
        );
    }

    public remove(entityId: string): boolean {
        const idx = this.entities.findIndex(e => e.entityId === entityId);
        if (idx !== -1) {
            this.entities.splice(idx, 1);
            return true;
        }

        if (this.divided) {
            return (
                this.northWest!.remove(entityId) ||
                this.northEast!.remove(entityId) ||
                this.southWest!.remove(entityId) ||
                this.southEast!.remove(entityId)
            );
        }

        return false;
    }

    public clear(): void {
        this.entities = [];
        if (this.divided) {
            this.northWest?.clear();
            this.northEast?.clear();
            this.southWest?.clear();
            this.southEast?.clear();
            this.northWest = null;
            this.northEast = null;
            this.southWest = null;
            this.southEast = null;
            this.divided = false;
        }
    }

    public queryRange(range: AABB, found: SpatialEntity[] = []): SpatialEntity[] {
        if (!this.boundary.intersectsAABB(range)) {
            return found;
        }

        for (const entity of this.entities) {
            if (range.containsPoint(entity)) {
                found.push(entity);
            }
        }

        if (this.divided) {
            this.northWest!.queryRange(range, found);
            this.northEast!.queryRange(range, found);
            this.southWest!.queryRange(range, found);
            this.southEast!.queryRange(range, found);
        }

        return found;
    }
}