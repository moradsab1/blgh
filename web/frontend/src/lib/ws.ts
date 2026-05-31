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
  onEvent: (event: WsEvent) => void;
  onStateChange: (state: WsState) => void;
}

export function createWsClient(opts: WsOptions) {
  let ws: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let backoff = 1000;
  let currentFrame: SubscribeFrame | null = null;
  let destroyed = false;

  function connect() {
    if (destroyed) return;
    opts.onStateChange('reconnecting');
    ws = new WebSocket(`${WS_URL}?deviceId=${opts.deviceId}`);

    ws.onopen = () => {
      backoff = 1000;
      opts.onStateChange('connected');
      if (currentFrame) {
        ws?.send(JSON.stringify({ type: 'subscribe', ...currentFrame }));
      }
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as { type?: string } & WsEvent;
        if ('type' in msg && msg.type === 'ping') {
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
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', ...frame }));
    }
  }

  function destroy() {
    destroyed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  }

  connect();
  return { subscribe, destroy };
}
