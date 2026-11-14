import { db } from '../db';
import { MapStatus } from '../types/map';
import { validateMapAutomated } from './mapValidation';

export class MapModerationService {
    static async proposeMap(mapId: number, userId: number) {
        const map = await db.one('SELECT * FROM user_maps WHERE id = $1 AND user_id = $2', [mapId, userId]);
        
        // Run automated checks
        const autoResult = await validateMapAutomated(map.data);
        
        if (!autoResult.isValid) {
            await db.none('UPDATE user_maps SET status = $1, rejection_reason = $2 WHERE id = $3', 
                [MapStatus.REJECTED, `Auto-reject: ${autoResult.errors.join(', ')}`, mapId]);
            return { success: false, errors: autoResult.errors };
        }

        await db.none('UPDATE user_maps SET status = $1 WHERE id = $2', [MapStatus.PROPOSED, mapId]);
        return { success: true };
    }

    static async reviewMap(mapId: number, moderatorId: number, approved: boolean, reason?: string) {
        const status = approved ? MapStatus.PUBLISHED : MapStatus.REJECTED;
        await db.none(`
            UPDATE user_maps 
            SET status = $1, 
                rejection_reason = $2, 
                moderator_id = $3, 
                last_reviewed_at = NOW() 
            WHERE id = $4`, 
            [status, reason, moderatorId, mapId]
        );
    }

    static async reportMap(mapId: number, reporterId: number, reason: string) {
        await db.tx(async t => {
            await t.none('INSERT INTO map_reports (map_id, reporter_id, reason) VALUES ($1, $2, $3)', [mapId, reporterId, reason]);
            const count = await t.one('UPDATE user_maps SET report_count = report_count + 1 WHERE id = $1 RETURNING report_count', [mapId]);
            
            // If reports exceed threshold, move back to review
            if (count.report_count >= 5) {
                await t.none('UPDATE user_maps SET status = $1 WHERE id = $2', [MapStatus.IN_REVIEW, mapId]);
            }
        });
    }

    static async unpublishMap(mapId: number, moderatorId: number) {
        await db.none('UPDATE user_maps SET status = $1, moderator_id = $2 WHERE id = $3', 
            [MapStatus.REJECTED, moderatorId, mapId]);
    }
}
