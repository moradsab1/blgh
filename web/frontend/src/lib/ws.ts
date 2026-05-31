import { WS_URL } from '../config';
import type { WsEvent } from './contracts';

export type WsState = 'connected' | 'reconnecting' | 'offline';

interface SubscribeFrame {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface WsOptions {
  deviceId: string;
  token?: string; // operator Bearer token — sent in auth frame, never in URL
  onEvent: (event: WsEvent) => void;
  onStateChange: (state: WsState) => void;
}

export function createWsClient(opts: WsOptions) {
  let ws: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let backoff = 1000;
  let currentFrame: SubscribeFrame | null = null;
  let destroyed = false;
  let authed = false;

  function sendSubscribeIfReady() {
    if (currentFrame && ws?.readyState === WebSocket.OPEN && authed) {
      ws.send(JSON.stringify({ type: 'subscribe', ...currentFrame }));
    }
  }

  function connect() {
    if (destroyed) return;
    authed = false;
    opts.onStateChange('reconnecting');
    // Never put the token in the URL query string
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      backoff = 1000;
      if (opts.token) {
        // Authenticate via first frame — token never leaves HTTP headers / WS frames
        ws?.send(JSON.stringify({ type: 'auth', token: opts.token }));
      } else {
        authed = true;
        opts.onStateChange('connected');
        sendSubscribeIfReady();
      }
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as { type?: string } & WsEvent;

        if (msg.type === 'auth_ok') {
          authed = true;
          opts.onStateChange('connected');
          sendSubscribeIfReady();
          return;
        }

        if (msg.type === 'ping') {
          ws?.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if ('t' in msg) {
          opts.onEvent(msg as WsEvent);
        }
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = () => {
      if (destroyed) return;
      opts.onStateChange('offline');
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function scheduleReconnect() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      backoff = Math.min(backoff * 2, 16_000);
      connect();
    }, backoff);
  }

  function subscribe(frame: SubscribeFrame) {
    currentFrame = frame;
    sendSubscribeIfReady();
  }

  function destroy() {
    destroyed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  }

  connect();
  return { subscribe, destroy };
}
