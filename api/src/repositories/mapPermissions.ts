import pool from "../db";

export interface MapPermission {
  mapId: number;
  accountId: string;
  canEdit: boolean;
  isProtected: boolean;
  grantedBy: string;
  grantedAt: Date;
}

export interface MapEditLogEntry {
  id: number;
  mapId: number;
  accountId: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export async function checkMapPermission(mapId: number, accountId: string): Promise<{ canEdit: boolean; isProtected: boolean }> {
  const result = await pool.query<{ can_edit: boolean; is_protected: boolean }>(
    `SELECT can_edit, is_protected FROM game_map_permissions WHERE map_id = $1 AND account_id = $2 LIMIT 1`,
    [mapId, accountId],
  );
  if (result.rows.length === 0) {
    return { canEdit: false, isProtected: false };
  }
  return { canEdit: result.rows[0].can_edit, isProtected: result.rows[0].is_protected };
}

export async function checkMapProtected(mapId: number): Promise<boolean> {
  const result = await pool.query<{ is_protected: boolean }>(
    `SELECT is_protected FROM game_map_permissions WHERE map_id = $1 AND is_protected = true LIMIT 1`,
    [mapId],
  );
  return result.rows.length > 0 && result.rows[0].is_protected;
}

export async function grantMapPermission(mapId: number, accountId: string, grantedBy: string): Promise<void> {
  await pool.query(
    `INSERT INTO game_map_permissions (map_id, account_id, can_edit, is_protected, granted_by, granted_at)
     VALUES ($1, $2, true, false, $3, NOW())
     ON CONFLICT (map_id, account_id) DO UPDATE SET can_edit = true, granted_by = EXCLUDED.granted_by, granted_at = NOW()`,
    [mapId, accountId, grantedBy],
  );
}

export async function revokeMapPermission(mapId: number, accountId: string): Promise<void> {
  await pool.query(
    `DELETE FROM game_map_permissions WHERE map_id = $1 AND account_id = $2`,
    [mapId, accountId],
  );
}

export async function setMapProtected(mapId: number, isProtected: boolean, setBy: string): Promise<void> {
  // If protecting, ensure at least one admin record exists
  if (isProtected) {
    await pool.query(
      `INSERT INTO game_map_permissions (map_id, account_id, can_edit, is_protected, granted_by, granted_at)
       VALUES ($1, $2, false, true, $3, NOW())
       ON CONFLICT (map_id, account_id) DO UPDATE SET is_protected = true, granted_by = EXCLUDED.granted_by, granted_at = NOW()`,
      [mapId, setBy, setBy],
    );
  } else {
    // Remove protection from all rows for this map
    await pool.query(
      `UPDATE game_map_permissions SET is_protected = false WHERE map_id = $1`,
      [mapId],
    );
  }
}

export async function logMapEdit(mapId: number, accountId: string, action: string, details?: Record<string, unknown>): Promise<void> {
  await pool.query(
    `INSERT INTO map_edit_log (map_id, account_id, action, details, created_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())`,
    [mapId, accountId, action, details ? JSON.stringify(details) : null],
  );
}

export async function listMapEditLog(mapId: number, limit: number = 50): Promise<MapEditLogEntry[]> {
  const result = await pool.query<{ id: number; map_id: number; account_id: string; action: string; details: Record<string, unknown> | null; created_at: Date }>(
    `SELECT id, map_id, account_id, action, details, created_at FROM map_edit_log WHERE map_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [mapId, limit],
  );
  return result.rows.map(r => ({
    id: r.id,
    mapId: r.map_id,
    accountId: r.account_id,
    action: r.action,
    details: r.details,
    createdAt: r.created_at,
  }));
}

export async function listMapPermissions(mapId: number): Promise<MapPermission[]> {
  const result = await pool.query<{ map_id: number; account_id: string; can_edit: boolean; is_protected: boolean; granted_by: string; granted_at: Date }>(
    `SELECT map_id, account_id, can_edit, is_protected, granted_by, granted_at FROM game_map_permissions WHERE map_id = $1 ORDER BY granted_at DESC`,
    [mapId],
  );
  return result.rows.map(r => ({
    mapId: r.map_id,
    accountId: r.account_id,
    canEdit: r.can_edit,
    isProtected: r.is_protected,
    grantedBy: r.granted_by,
    grantedAt: r.granted_at,
  }));
}
