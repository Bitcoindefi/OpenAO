import { Router } from 'express';
import { MapModerationService } from '../lib/mapModeration';
import { db } from '../db';

const router = Router();

// Middleware to check if user is moderator
const isModerator = async (req: any, res: any, next: any) => {
    const mod = await db.oneOrNone('SELECT 1 FROM moderators WHERE user_id = $1', [req.user.id]);
    if (!mod) return res.status(403).json({ error: "Unauthorized" });
    next();
};

// Get moderation queue
router.get('/queue', isModerator, async (req, res) => {
    const queue = await db.any('SELECT id, user_id, status, report_count FROM user_maps WHERE status IN ($1, $2) ORDER BY report_count DESC', 
        ['proposed', 'in_review']);
    res.json(queue);
});

// Preview map assets and metadata
router.get('/preview/:id', isModerator, async (req, res) => {
    const map = await db.one('SELECT data->\'meta\' as meta, data->\'npcs\' as npcs FROM user_maps WHERE id = $1', [req.params.id]);
    res.json(map);
});

// Submit review verdict
router.post('/review', isModerator, async (req, res) => {
    const { mapId, approved, reason } = req.body;
    await MapModerationService.reviewMap(mapId, req.user.id, approved, reason);
    res.json({ success: true });
});

// Report a map (Public)
router.post('/report/:id', async (req, res) => {
    const { reason } = req.body;
    await MapModerationService.reportMap(parseInt(req.params.id), req.user.id, reason);
    res.json({ success: true });
});

export default router;
