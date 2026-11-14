import { MAP_RANGES, USER_QUOTAS } from '../constants/mapRanges';
import { db } from '../db';

export class UserMapService {
    static async canEdit(accountId: number, mapId: number): Promise<boolean> {
        if (mapId < MAP_RANGES.USER_MAPS.MIN || mapId > MAP_RANGES.USER_MAPS.MAX) {
            return false;
        }
        
        const map = await db.oneOrNone(
            'SELECT owner_id FROM user_maps WHERE id = $1',
            [mapId]
        );
        
        return map && map.owner_id === accountId;
    }

    static async checkQuotas(accountId: number): Promise<{ allowed: boolean; reason?: string }> {
        const count = await db.one(
            'SELECT count(*) FROM user_maps WHERE owner_id = $1',
            [accountId]
        );

        if (parseInt(count.count) >= USER_QUOTAS.MAX_MAPS_PER_USER) {
            return { allowed: false, reason: 'Maximum number of maps reached' };
        }

        return { allowed: true };
    }

    static validateMapContent(npcs: any[], objs: any[]): { valid: boolean; error?: string } {
        if (npcs.length > USER_QUOTAS.MAX_NPCS_PER_MAP) {
            return { valid: false, error: 'Too many NPCs' };
        }
        if (objs.length > USER_QUOTAS.MAX_OBJS_PER_MAP) {
            return { valid: false, error: 'Too many objects' };
        }

        // Economy Isolation: Check for forbidden items or gold
        const forbiddenItems = [1, 2]; // Example: Gold, High-tier items
        const hasForbidden = objs.some(obj => forbiddenItems.includes(obj.id));
        
        if (hasForbidden) {
            return { valid: false, error: 'Map contains restricted items' };
        }

        return { valid: true };
    }
}
