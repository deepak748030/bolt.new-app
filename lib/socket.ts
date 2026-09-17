// Socket.IO client for the bid-app (React Native / Expo).
// Auto-authenticates using the stored auth token and re-connects when the token changes.
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

let socket: Socket | null = null;
let currentToken: string | null = null;

export async function getSocket(): Promise<Socket> {
  const token = (await getToken()) || null;
  if (socket && currentToken === token && socket.connected) return socket;
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }
  currentToken = token;
  if (!socket) {
    socket = io(BASE_URL, {
      auth: { token: token || undefined },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1500,
      timeout: 10000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; currentToken = null; }
}

// React hook — subscribe to a realtime event for the lifetime of a component.
export function useRealtime<T = any>(event: string, handler: (payload: T) => void, enabled: boolean = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    let s: Socket | null = null;
    const cb = (p: T) => ref.current(p);
    getSocket().then((sock) => { if (!mounted) return; s = sock; s.on(event, cb); });
    return () => { mounted = false; if (s) s.off(event, cb); };
  }, [event, enabled]);
}

// Join / leave an auction room (auto-cleanup on unmount).
export function useAuctionRoom(auctionId: string | null | undefined) {
  useEffect(() => {
    if (!auctionId) return;
    let s: Socket | null = null;
    let mounted = true;
    getSocket().then((sock) => {
      if (!mounted) return;
      s = sock;
      s.emit('auction:join', auctionId);
    });
    return () => {
      mounted = false;
      if (s) s.emit('auction:leave', auctionId);
    };
  }, [auctionId]);
}
