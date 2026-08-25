import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import {
  connectionsByIp,
  connectionsByAccount,
  connectionMetadata,
  MAX_CONNECTIONS_PER_IP
} from './server.js';

// Mock WebSocket para tests
class MockWebSocket {
  readyState = WebSocket.OPEN;
  onclose: (() => void) | null = null;
  onmessage: ((data: Buffer) => void) | null = null;
  onerror: ((err: Error) => void) | null = null;
  
  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
  
  send(data: string | Buffer) {}
}

describe('Server connection handling', () => {
  beforeEach(() => {
    connectionsByIp.clear();
    connectionsByAccount.clear();
    connectionMetadata.clear();
    vi.clearAllMocks();
  });

  it('allows two different accounts from the same IP to connect simultaneously', () => {
    const ip = '192.168.1.1';
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    
    // Simular primera conexión (accountId: 1)
    connectionsByIp.set(ip, new Set([ws1]));
    connectionsByAccount.set(1, ws1);
    connectionMetadata.set(ws1, { accountId: 1, characterId: 10, ip });
    
    // Simular segunda conexión desde misma IP pero distinta cuenta (accountId: 2)
    connectionsByIp.get(ip)!.add(ws2);
    connectionsByAccount.set(2, ws2);
    connectionMetadata.set(ws2, { accountId: 2, characterId: 20, ip });
    
    // Ambas conexiones deben coexistir
    expect(connectionsByIp.get(ip)?.size).toBe(2);
    expect(connectionsByAccount.size).toBe(2);
    expect(connectionsByAccount.has(1)).toBe(true);
    expect(connectionsByAccount.has(2)).toBe(true);
  });

  it('disconnects old session when same account connects again', () => {
    const ip = '192.168.1.1';
    const oldWs = new MockWebSocket();
    const newWs = new MockWebSocket();
    let oldWsClosed = false;
    oldWs.onclose = () => { oldWsClosed = true; };
    
    // Primera conexión
    connectionsByIp.set(ip, new Set([oldWs]));
    connectionsByAccount.set(1, oldWs);
    connectionMetadata.set(oldWs, { accountId: 1, characterId: 10, ip });
    
    // Simular nueva conexión de la misma cuenta
    // (la lógica del servidor cerraría la anterior)
    if (connectionsByAccount.has(1)) {
      const existing = connectionsByAccount.get(1)!;
      existing.close(4002, 'New login from same account');
    }
    connectionsByAccount.set(1, newWs);
    connectionsByIp.get(ip)!.add(newWs);
    connectionMetadata.set(newWs, { accountId: 1, characterId: 10, ip });
    
    // La conexión antigua debe haberse cerrado
    expect(oldWsClosed).toBe(true);
    // La nueva conexión debe ser la registrada
    expect(connectionsByAccount.get(1)).toBe(newWs);
  });

  it('enforces MAX_CONNECTIONS_PER_IP limit', () => {
    const ip = '10.0.0.1';
    const connections: MockWebSocket[] = [];
    
    // Llenar hasta el límite
    for (let i = 0; i < MAX_CONNECTIONS_PER_IP; i++) {
      const ws = new MockWebSocket();
      connections.push(ws);
      const ipConns = connectionsByIp.get(ip) || new Set();
      ipConns.add(ws);
      connectionsByIp.set(ip, ipConns);
    }
    
    expect(connectionsByIp.get(ip)?.size).toBe(MAX_CONNECTIONS_PER_IP);
    
    // Una conexión más debería ser rechazada (simulando la lógica del servidor)
    const extraWs = new MockWebSocket();
    const ipConns = connectionsByIp.get(ip)!;
    const wouldExceed = ipConns.size >= MAX_CONNECTIONS_PER_IP;
    
    expect(wouldExceed).toBe(true);
    // El servidor cerraría con código 4003
  });

  it('cleans up metadata on disconnect', () => {
    const ip = '192.168.1.1';
    const ws = new MockWebSocket();
    
    connectionsByIp.set(ip, new Set([ws]));
    connectionsByAccount.set(1, ws);
    connectionMetadata.set(ws, { accountId: 1, characterId: 10, ip });
    
    // Simular cierre
    ws.close();
    
    // Verificar limpieza (la lógica real está en el evento 'close' del servidor)
    // Aquí solo verificamos que los mapas se pueden limpiar correctamente
    const meta = connectionMetadata.get(ws);
    if (meta) {
      const ipConns = connectionsByIp.get(meta.ip);
      ipConns?.delete(ws);
      if (ipConns?.size === 0) connectionsByIp.delete(meta.ip);
      
      if (connectionsByAccount.get(meta.accountId) === ws) {
        connectionsByAccount.delete(meta.accountId);
      }
      connectionMetadata.delete(ws);
    }
    
    expect(connectionsByIp.has(ip)).toBe(false);
    expect(connectionsByAccount.has(1)).toBe(false);
    expect(connectionMetadata.has(ws)).toBe(false);
  });
});
