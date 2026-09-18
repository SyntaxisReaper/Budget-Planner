import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import toastLib from 'react-hot-toast';

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

const toast = new Proxy(toastLib, {
  get(target, prop) {
    if (prop === 'success' || prop === 'error') {
      return (...args) => {
        if (prop === 'error') impactHeavy();
        else notificationSuccess();
        return target[prop](...args);
      }
    }
    return target[prop];
  }
});

export default toast;
