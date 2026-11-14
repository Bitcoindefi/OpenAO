/**
 * Prevents experience gain and gold drops in user-created maps.
 */
import { MAP_RANGES } from '../constants/mapRanges';

export function isUserMap(mapId: number): boolean {
    return mapId >= MAP_RANGES.USER_MAPS.MIN && mapId <= MAP_RANGES.USER_MAPS.MAX;
}

export function shouldAllowRewards(mapId: number): boolean {
    // For the first version, user maps provide no EXP or Gold
    if (isUserMap(mapId)) {
        return false;
    }
    return true;
}
