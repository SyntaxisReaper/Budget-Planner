import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import toastLib from 'react-hot-toast';
import { playSuccessSound, playErrorSound, playCelebrationSound } from './audio.js';

export const impactLight = async () => {
  if (Capacitor.isNativePlatform()) try { await Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
};

export const impactMedium = async () => {
  if (Capacitor.isNativePlatform()) try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
};

export const impactHeavy = async () => {
  if (Capacitor.isNativePlatform()) try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
};

export const notificationSuccess = async () => {
  if (Capacitor.isNativePlatform()) try { await Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
};

// Wraps toast to play sound and haptics automatically
const toast = new Proxy(toastLib, {
  get(target, prop) {
    if (prop === 'success' || prop === 'error') {
      return (...args) => {
        if (prop === 'error') {
          impactHeavy();
          playErrorSound();
        } else {
          notificationSuccess();
          playSuccessSound();
        }
        return target[prop](...args);
      }
    }
    return target[prop];
  }
});

// Helper for celebrations (goal complete, debt paid)
export const triggerCelebration = () => {
  impactHeavy();
  playCelebrationSound();
};

export default toast;
