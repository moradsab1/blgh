import { offlineBannerState } from '../../src/presentation/components/OfflineBanner';
import { useNetStore } from '../../src/domain/stores/net';

describe('offline banner state machine', () => {
  it('shows the offline banner while disconnected', () => {
    expect(offlineBannerState(false, false)).toBe('offline');
    expect(offlineBannerState(false, true)).toBe('offline');
  });

  it('shows the reconnected toast right after coming back online', () => {
    expect(offlineBannerState(true, true)).toBe('reconnected');
  });

  it('is hidden when connected and never having been offline', () => {
    expect(offlineBannerState(true, false)).toBe('hidden');
  });
});

describe('net store latch', () => {
  beforeEach(() => {
    useNetStore.setState({ isConnected: true, wasOffline: false });
  });

  it('latches wasOffline once a disconnect is seen', () => {
    useNetStore.getState().setConnected(false);
    expect(useNetStore.getState().isConnected).toBe(false);
    expect(useNetStore.getState().wasOffline).toBe(true);

    useNetStore.getState().setConnected(true);
    expect(useNetStore.getState().isConnected).toBe(true);
    // Stays latched so the UI can show the reconnected toast.
    expect(useNetStore.getState().wasOffline).toBe(true);
  });
});
