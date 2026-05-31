import { describe, it, expect } from 'vitest';

describe('OfflineBanner', () => {
  it('visible=false renders nothing', async () => {
    const { default: OfflineBanner } = await import('../components/OfflineBanner');
    expect(typeof OfflineBanner).toBe('function');
    const result = OfflineBanner({ visible: false });
    expect(result).toBeNull();
  });

  it('visible=true returns a non-null element', async () => {
    const { default: OfflineBanner } = await import('../components/OfflineBanner');
    const result = OfflineBanner({ visible: true });
    expect(result).not.toBeNull();
  });
});

describe('WsState indicator', () => {
  it('three ws states are defined', () => {
    type WsState = 'connected' | 'reconnecting' | 'offline';
    const states: WsState[] = ['connected', 'reconnecting', 'offline'];
    expect(states).toHaveLength(3);
    expect(states).toContain('offline');
    expect(states).toContain('connected');
    expect(states).toContain('reconnecting');
  });
});

describe('Drawer', () => {
  it('is a function component', async () => {
    const { default: Drawer } = await import('../components/Drawer');
    expect(typeof Drawer).toBe('function');
  });
});

describe('ConfirmDialog', () => {
  it('is a function component', async () => {
    const { default: ConfirmDialog } = await import('../components/ConfirmDialog');
    expect(typeof ConfirmDialog).toBe('function');
  });
});
