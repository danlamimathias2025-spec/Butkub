export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

/**
 * Triggers a subtle tactile haptic vibration when supported by the device browser.
 */
export function triggerHaptic(type: HapticType = 'light') {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(8);
          break;
        case 'medium':
          navigator.vibrate(16);
          break;
        case 'heavy':
          navigator.vibrate(25);
          break;
        case 'success':
          navigator.vibrate([15, 35, 25]);
          break;
        case 'error':
          navigator.vibrate([35, 40, 35]);
          break;
        default:
          navigator.vibrate(10);
      }
    } catch {
      // Ignore vibration errors gracefully
    }
  }
}
