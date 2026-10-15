import { io, Socket } from 'socket.io-client';
import { StoreSubscription } from '../types';

let socket: Socket | null = null;
let currentToken: string | null = null;

export type RealtimeEventCallback = (data: any) => void;

const listeners: Map<string, Set<RealtimeEventCallback>> = new Map();

export function getSocket(): Socket | null {
  return socket;
}

export function isSocketConnected(): boolean {
  return !!socket && socket.connected;
}

export function connectSocket(token: string) {
  if (!token) return;

  if (socket && currentToken === token && (socket.connected || socket.active)) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  const rawApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : '').trim().replace(/\/$/, '');
  const envApiUrl = rawApiUrl
    ? (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') ? rawApiUrl : `https://${rawApiUrl}`)
    : '';
  const url = envApiUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    notifyListeners('connect', { connected: true, id: socket?.id });
  });

  socket.on('disconnect', (reason) => {
    notifyListeners('disconnect', { reason });
  });

  socket.on('connect_error', (err) => {
    notifyListeners('connect_error', { error: err.message });
  });

  socket.on('ACCOUNT_SUSPENDED', (data) => {
    notifyListeners('ACCOUNT_SUSPENDED', data);
  });

  socket.on('ACCOUNT_ACTIVATED', (data) => {
    notifyListeners('ACCOUNT_ACTIVATED', data);
  });

  socket.on('PAYMENT_APPROVED', (data: { paymentId: string; subscription: StoreSubscription; message?: string }) => {
    notifyListeners('PAYMENT_APPROVED', data);
  });

  socket.on('PAYMENT_REJECTED', (data: { paymentId: string; reason?: string; message?: string }) => {
    notifyListeners('PAYMENT_REJECTED', data);
  });

  socket.on('SUBSCRIPTION_ACTIVATED', (data: { subscription: StoreSubscription }) => {
    notifyListeners('SUBSCRIPTION_ACTIVATED', data);
  });

  socket.on('SUBSCRIPTION_UPDATED', (data: { subscription: StoreSubscription }) => {
    notifyListeners('SUBSCRIPTION_UPDATED', data);
  });

  socket.on('SUBSCRIPTION_EXPIRED', (data) => {
    notifyListeners('SUBSCRIPTION_EXPIRED', data);
  });

  socket.on('USER_SUSPENDED', (data: { userId: string; storeId?: string; message?: string }) => {
    notifyListeners('USER_SUSPENDED', data);
  });

  socket.on('USER_ACTIVATED', (data: { userId: string; storeId?: string; message?: string }) => {
    notifyListeners('USER_ACTIVATED', data);
  });

  socket.on('USER_UPDATED', (data: { userId: string; storeId?: string; user?: any }) => {
    notifyListeners('USER_UPDATED', data);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

export function subscribeToRealtimeEvent(event: string, callback: RealtimeEventCallback): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  return () => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        listeners.delete(event);
      }
    }
  };
}

function notifyListeners(event: string, data: any) {
  const eventListeners = listeners.get(event);
  if (eventListeners) {
    eventListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[Socket Client] Error in listener for "${event}":`, err);
      }
    });
  }
}
