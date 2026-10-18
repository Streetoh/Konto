/**
 * Emite una micro-vibración háptica sutil de confirmación (15ms por defecto).
 * Intenta primero a través del puente nativo de Android (AndroidBridge.vibrate)
 * y como respaldo a través de la Web Haptics API (navigator.vibrate).
 */
export const vibrate = (ms = 15): void => {
  try {
    if (typeof window !== 'undefined') {
      if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
        window.AndroidBridge.vibrate(ms);
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms);
      }
    }
  } catch {
    // Silencioso en plataformas o navegadores sin soporte de vibración
  }
};
