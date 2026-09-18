import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import toastLib from 'react-hot-toast';

export const triggerHaptic = async (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    try { await Haptics.impact({ style }); } catch(e) {}
  }
};

const toast = new Proxy(toastLib, {
  get(target, prop) {
    if (prop === 'success' || prop === 'error') {
      return (...args) => {
        triggerHaptic(prop === 'error' ? ImpactStyle.Heavy : ImpactStyle.Light);
        return target[prop](...args);
      }
    }
    return target[prop];
  }
});

export default toast;
