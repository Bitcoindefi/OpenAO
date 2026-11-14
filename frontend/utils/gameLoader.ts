import { MAP_RANGES } from '../../api/src/constants/mapRanges';

export const getMapType = (mapId: number) => {
  if (mapId >= MAP_RANGES.OFFICIAL.MIN && mapId <= MAP_RANGES.OFFICIAL.MAX) return 'official';
  if (mapId >= MAP_RANGES.STATIC_LOCAL.MIN && mapId <= MAP_RANGES.STATIC_LOCAL.MAX) return 'local';
  if (mapId >= MAP_RANGES.CHALLENGES.MIN && mapId <= MAP_RANGES.CHALLENGES.MAX) return 'challenge';
  if (mapId >= MAP_RANGES.DYNAMIC_INSTANCES.MIN && mapId <= MAP_RANGES.DYNAMIC_INSTANCES.MAX) return 'dynamic';
  if (mapId >= MAP_RANGES.USER_MAPS.MIN && mapId <= MAP_RANGES.USER_MAPS.MAX) return 'user';
  return 'unknown';
};

export const getMapAssetPath = (mapId: number, fileName: string) => {
  const type = getMapType(mapId);
  
  if (type === 'user') {
    // User maps are fetched from the dynamic storage API
    return `/api/maps/user/${mapId}/${fileName}`;
  }
  
  // Default routing for official maps
  return `/assets/maps/mapa_${mapId}/${fileName}`;
};
