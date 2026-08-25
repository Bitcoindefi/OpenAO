import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { parse } from 'url';
import { verifyToken } from './auth.js';
import { getCharacterById, updateCharacterOnlineStatus } from './db.js';
import { handleMessage } from './messageHandler.js';
import { broadcastToMap, removePlayerFromMap } from './mapManager.js';
import { Player } from './types.js';

const PORT = parseInt(process.env.PORT || '7666', 10);
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TOKEN_AUTH = process.env.TOKEN_AUTH || 'changeme';

// Límite razonable de conexiones concurrentes por IP (defensa anti-abuso)
// Valor alto para no afectar CGNAT legítimo (ej. 100 conexiones por IP)
const MAX_CONNECTIONS_PER_IP = 100;

// Mapa de IP -> Set de conexiones (para límite concurrente por IP)
const connectionsByIp = new Map<string, Set<WebSocket>>();

// Mapa de accountId -> WebSocket (para regla "una sesión por cuenta")
const connectionsByAccount = new Map<number, WebSocket>();

// Mapa de WebSocket -> { accountId, characterId, ip }
const connectionMetadata = new Map<WebSocket, { accountId: number; characterId: number; ip: string }>();

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  
  // Verificar límite de conexiones por IP
  const ipConnections = connectionsByIp.get(ip) || new Set();
  if (ipConnections.size >= MAX_CONNECTIONS_PER_IP) {
    ws.close(4003, 'Too many connections from this IP');
    return;
  }
  
  // Parsear token de la query string
  const { query } = parse(req.url || '', true);
  const token = query.token as string;
  
  if (!token) {
    ws.close(4001, 'Authentication required');
    return;
  }
  
  let accountId: number;
  try {
    const payload = verifyToken(token, TOKEN_AUTH);
    accountId = payload.accountId;
  } catch {
    ws.close(4001, 'Invalid token');
    return;
  }
  
  // Regla: una sesión por cuenta
  // Si la cuenta ya tiene una conexión activa, cerrar la anterior
  const existingWs = connectionsByAccount.get(accountId);
  if (existingWs && existingWs.readyState === WebSocket.OPEN) {
    existingWs.close(4002, 'New login from same account');
    // La limpieza de existingWs se hará en su evento 'close'
  }
  
  // Obtener personaje activo de la cuenta
  let characterId: number;
  try {
    const character = await getCharacterById(accountId);
    if (!character) {
      ws.close(4004, 'No character found');
      return;
    }
    characterId = character.id;
  } catch {
    ws.close(500, 'Database error');
    return;
  }
  
  // Registrar conexión
  ipConnections.add(ws);
  connectionsByIp.set(ip, ipConnections);
  connectionsByAccount.set(accountId, ws);
  connectionMetadata.set(ws, { accountId, characterId, ip });
  
  // Marcar personaje como online en BD
  await updateCharacterOnlineStatus(characterId, true);
  
  // Inicializar jugador en el mapa
  const player: Player = {
    ws,
    accountId,
    characterId,
    ip,
    x: 0,
    y: 0,
    map: 0,
    // ... otros campos
  };
  
  ws.on('message', (data) => handleMessage(ws, data));
  
  ws.on('close', async () => {
    // Limpiar metadata
    const meta = connectionMetadata.get(ws);
    if (meta) {
      // Liberar slot de IP
      const ipConns = connectionsByIp.get(meta.ip);
      if (ipConns) {
        ipConns.delete(ws);
        if (ipConns.size === 0) {
          connectionsByIp.delete(meta.ip);
        }
      }
      
      // Liberar cuenta si sigue siendo nuestra conexión
      if (connectionsByAccount.get(meta.accountId) === ws) {
        connectionsByAccount.delete(meta.accountId);
      }
      
      // Marcar personaje como offline
      await updateCharacterOnlineStatus(meta.characterId, false);
      
      // Remover del mapa
      removePlayerFromMap(ws);
      
      connectionMetadata.delete(ws);
    }
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`Game server listening on port ${PORT}`);
});

// Exportar para tests
export { connectionsByIp, connectionsByAccount, connectionMetadata, MAX_CONNECTIONS_PER_IP };
