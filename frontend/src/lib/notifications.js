import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { parseISO, isBefore, addDays, differenceInDays } from 'date-fns';

export async function requestNotificationPermissions() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      permStatus = await LocalNotifications.requestPermissions();
    }
    return permStatus.display === 'granted';
  } catch (e) {
    console.error('Failed to request notification permissions', e);
    return false;
  }
}

export async function scheduleSubscriptionReminders(subscriptions) {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    // Clear pending to avoid duplicates
    await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });

    const notificationsToSchedule = [];
    let idCounter = 1;
    const today = new Date();

    subscriptions.forEach(sub => {
      if (sub.status !== 'active') return;
      const dueDate = parseISO(sub.next_date);
      // If it's due exactly tomorrow or within a day, or upcoming
      // Actually let's just schedule a notification for 1 day before the due date at 10 AM.
      // But if it's already overdue or due today, we don't schedule a future one.
      
      const scheduleDate = addDays(dueDate, -1);
      scheduleDate.setHours(10, 0, 0, 0);

      if (isBefore(today, scheduleDate)) {
        notificationsToSchedule.push({
          id: idCounter++,
          title: 'Upcoming Bill',
          body: `${sub.name} is due tomorrow! (${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(sub.amount)})`,
          schedule: { at: scheduleDate },
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: null
        });
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } catch (e) {
    console.error('Failed to schedule notifications', e);
  }
}

export async function notifyDebtPaid(debtName) {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 100000) + 10000,
        title: 'Debt Free! 🎉',
        body: `You just fully paid off ${debtName}! Great job.`,
        schedule: { at: new Date(new Date().getTime() + 1000) } // 1 second from now
      }]
    });
  } catch (e) {}
}

export async function checkLowBalance(accounts) {
  if (!Capacitor.isNativePlatform()) return;
  const thresholdStr = localStorage.getItem('low_balance_threshold');
  if (!thresholdStr) return; // Feature disabled if not set

  const threshold = parseFloat(thresholdStr);
  if (isNaN(threshold)) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    const notificationsToSchedule = [];
    accounts.forEach(acc => {
      if (acc.balance < threshold) {
        notificationsToSchedule.push({
          id: Math.floor(Math.random() * 100000) + 20000,
          title: 'Low Balance Alert 📉',
          body: `Your account "${acc.name}" has dropped below your warning threshold of ₹${threshold}. (Current balance: ₹${acc.balance})`,
          schedule: { at: new Date(new Date().getTime() + 1000) }
        });
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } catch (e) {}
}
