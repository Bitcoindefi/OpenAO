/**
 * Bitcoindefi/OpenAO - Map NPC Placement & Patrol Generator (Issue #8)
 */
export interface NpcPlacementConfig {
  npcId: number;
  mapId: number;
  x: number;
  y: number;
  heading: number;
  patrolRadius?: number;
}

export interface PatrolCoordinate {
  x: number;
  y: number;
  step: number;
}

export function generatePatrolWaypoints(
  startX: number,
  startY: number,
  radius: number = 3,
  mapBounds: { minX: number; maxX: number; minY: number; maxY: number } = { minX: 1, maxX: 100, minY: 1, maxY: 100 }
): PatrolCoordinate[] {
  const waypoints: PatrolCoordinate[] = [];
  const offsets = [
    { dx: 0, dy: 0 },
    { dx: radius, dy: 0 },
    { dx: radius, dy: radius },
    { dx: 0, dy: radius },
    { dx: -radius, dy: radius },
    { dx: -radius, dy: 0 },
    { dx: -radius, dy: -radius },
    { dx: 0, dy: -radius },
    { dx: radius, dy: -radius }
  ];

  let step = 0;
  for (const off of offsets) {
    const targetX = Math.min(Math.max(startX + off.dx, mapBounds.minX), mapBounds.maxX);
    const targetY = Math.min(Math.max(startY + off.dy, mapBounds.minY), mapBounds.maxY);
    waypoints.push({ x: targetX, y: targetY, step: step++ });
  }

  return waypoints;
}
