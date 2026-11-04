export interface LiveMapSnapshot {
  mapId: number;
  version: number;
  width: number;
  height: number;
  checksumSha256: string;
  tiles: Uint16Array;
}

export class LiveMapHotReloader {
  private readonly activeMaps = new Map<number, LiveMapSnapshot>();

  getMap(mapId: number): LiveMapSnapshot | undefined {
    return this.activeMaps.get(mapId);
  }

  publishLiveMap(next: LiveMapSnapshot): { reloaded: boolean; version: number } {
    if (next.width <= 0 || next.height <= 0 || next.tiles.length !== next.width * next.height) {
      throw new Error(`Invalid dimensions for map ${next.mapId}`);
    }
    const prev = this.activeMaps.get(next.mapId);
    if (prev && prev.checksumSha256 === next.checksumSha256) {
      return { reloaded: false, version: prev.version };
    }
    this.activeMaps.set(next.mapId, next);
    return { reloaded: true, version: next.version };
  }
}
