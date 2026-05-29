// Haptic stubs — no external library required.
// On Android, the OS provides implicit touch feedback via ripples.
export const haptics = {
  toggle: (): void => {},
  press: (): void => {},
  success: (): void => {},
  warning: (): void => {},
  error: (): void => {},
  heavy: (): void => {},
  // Impact and selection feedback (used by Map screen)
  impact: (): void => {},
  selection: (): void => {},
};
