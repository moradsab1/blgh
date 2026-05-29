// Haptic stubs — no external library required.
// On Android, the OS provides implicit touch feedback via ripples.
export const haptics = {
  toggle: (): void => {},
  press: (): void => {},
  success: (): void => {},
  warning: (): void => {},
  error: (): void => {},
  heavy: (): void => {},
};
