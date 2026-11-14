import { MapValidationResult } from '../types/map';
import { checkProfanity } from './text'; // Assuming this exists in lib/text.ts

export async function validateMapAutomated(mapData: any): Promise<MapValidationResult> {
    const errors: string[] = [];

    // 1. Profanity Check
    if (checkProfanity(mapData.meta.name)) {
        errors.push("Map name contains forbidden words.");
    }

    // 2. Quota Validation
    const MAX_NPCS = 50;
    if (mapData.npcs && mapData.npcs.length > MAX_NPCS) {
        errors.push(`Exceeds NPC quota (Max: ${MAX_NPCS})`);
    }

    // 3. Pathfinding / Connectivity Check (BFS)
    // Ensures all walkable tiles are reachable from the entry point
    const isTrapped = checkConnectivity(mapData.terrain);
    if (isTrapped) {
        errors.push("Map contains isolated regions or traps (unreachable walkable areas).");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

function checkConnectivity(terrain: any): boolean {
    const width = terrain.width;
    const height = terrain.height;
    const grid = terrain.layers[0]; // Assuming layer 0 is base terrain
    const walkable = terrain.walkable; // Boolean array or bitmask
    
    // Start BFS from entry point (usually center or defined in meta)
    const startNode = { x: Math.floor(width/2), y: Math.floor(height/2) };
    const visited = new Set();
    const queue = [startNode];
    
    let reachableCount = 0;
    let totalWalkable = walkable.filter((w: boolean) => w).length;

    while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        const key = `${x},${y}`;
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited.has(key) || !walkable[y * width + x]) {
            continue;
        }

        visited.add(key);
        reachableCount++;

        queue.push({ x: x + 1, y });
        queue.push({ x: x - 1, y });
        queue.push({ x, y: y + 1 });
        queue.push({ x, y: y - 1 });
    }

    // If reachable walkable tiles < total walkable tiles, there are isolated "pockets"
    return reachableCount < totalWalkable;
}
