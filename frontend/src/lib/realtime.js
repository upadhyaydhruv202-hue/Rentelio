import { io } from 'socket.io-client';
import { API_ORIGIN } from '../services/api';

let socket = null;

function activeToken() {
  return (
    localStorage.getItem('rentelio_customer_token') ||
    localStorage.getItem('rentelio_vendor_token') ||
    localStorage.getItem('rentelio_token') ||
    ''
  );
}

export function connectRealtime({ onNotification, onReady } = {}) {
  const token = activeToken();
  if (!token) return null;

  if (socket) {
    socket.off('notification:new');
    socket.off('realtime:ready');
    if (socket.connected) {
      socket.on('realtime:ready', (payload) => onReady?.(payload));
      socket.on('notification:new', (payload) => onNotification?.(payload));
      return socket;
    }
  }

  socket = io(API_ORIGIN || window.location.origin, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1500,
  });

  socket.on('realtime:ready', (payload) => onReady?.(payload));
  socket.on('notification:new', (payload) => onNotification?.(payload));

  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getRealtimeSocket() {
  return socket;
}
