/**
 * Bitcoindefi/OpenAO - Map Layer Serializer
 */
export interface SerializedMapLayer {
  layerIndex: number;
  tiles: Array<{ x: number; y: number; grhIndex: number; blocked?: boolean }>;
}

export function serializeMapLayers(layers: SerializedMapLayer[]): string {
  const sorted = layers.map(l => ({
    layerIndex: l.layerIndex,
    tiles: [...l.tiles].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
  }));
  return JSON.stringify({ version: '1.0', layers: sorted }, null, 2);
}
