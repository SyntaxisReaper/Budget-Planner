import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { parseISO, isBefore, addDays, differenceInDays } from 'date-fns';

let channelsCreated = false;

async function setupChannels() {
  if (!Capacitor.isNativePlatform()) return;
  if (channelsCreated) return;
  
  try {
    await LocalNotifications.createChannel({ id: 'bills', name: 'Bills & Reminders', importance: 4, visibility: 1 });
    await LocalNotifications.createChannel({ id: 'alerts', name: 'Low Balance Alerts', importance: 5, visibility: 1 });
    await LocalNotifications.createChannel({ id: 'celebrations', name: 'Celebrations', importance: 4, visibility: 1 });
    channelsCreated = true;
  } catch(e) {
    console.error('Failed to create notification channels', e);
  }
}

export async function requestNotificationPermissions() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await setupChannels();
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

export async function scheduleUpcomingReminders(subscriptions = [], debts = [], trips = [], contacts = []) {
  if (!Capacitor.isNativePlatform()) return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  try {
    // Clear pending to avoid duplicates
    await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });

    const notificationsToSchedule = [];
    let idCounter = 1;
    const today = new Date();
    const currentYear = today.getFullYear();

    const addReminder = (title, body, dueDate) => {
      const scheduleDate = addDays(parseISO(dueDate || new Date().toISOString()), -1);
      scheduleDate.setHours(10, 0, 0, 0);

      if (isBefore(today, scheduleDate)) {
        notificationsToSchedule.push({
          id: idCounter++,
          title,
          body,
          schedule: { at: scheduleDate },
          channelId: 'bills'
        });
      }
    };

    const addYearlyReminder = (title, body, dateStr) => {
      if (!dateStr) return;
      const originalDate = parseISO(dateStr);
      if (isNaN(originalDate.getTime())) return;
      
      let eventDate = new Date(currentYear, originalDate.getMonth(), originalDate.getDate());
      if (isBefore(eventDate, today)) {
        eventDate = new Date(currentYear + 1, originalDate.getMonth(), originalDate.getDate());
      }

      const scheduleDate = addDays(eventDate, -1);
      scheduleDate.setHours(10, 0, 0, 0);

      if (differenceInDays(scheduleDate, today) <= 30 && !isBefore(scheduleDate, today)) {
        notificationsToSchedule.push({
          id: idCounter++,
          title,
          body,
          schedule: { at: scheduleDate },
          channelId: 'celebrations'
        });
      }
    };

    subscriptions.forEach(sub => {
      if (sub.status === 'active' && sub.next_date) {
        addReminder('Upcoming Bill', `${sub.name} is due tomorrow! (₹${sub.amount})`, sub.next_date);
      }
    });

    debts.forEach(debt => {
      if (debt.status === 'active' && debt.kind === 'rent' && debt.due_date) {
        addReminder('Rent Reminder', `${debt.name} is due tomorrow! (₹${debt.amount})`, debt.due_date);
      }
    });

    trips.forEach(trip => {
      if (trip.status === 'planned' && trip.start_date) {
        addReminder('Upcoming Trip', `Get ready! ${trip.name} starts tomorrow.`, trip.start_date);
      }
    });

    contacts.forEach(contact => {
      if (contact.birthday) {
        addYearlyReminder('Birthday Tomorrow 🎂', `It's ${contact.name}'s birthday tomorrow! Don't forget to wish them.`, contact.birthday);
      }
      if (contact.anniversary) {
        addYearlyReminder('Anniversary Tomorrow 🎉', `It's ${contact.name}'s anniversary tomorrow!`, contact.anniversary);
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
        schedule: { at: new Date(new Date().getTime() + 1000) },
        channelId: 'celebrations'
      }]
    });
  } catch (e) {}
}

export async function checkLowBalance(accounts) {
  if (!Capacitor.isNativePlatform()) return;
  const thresholdStr = localStorage.getItem('low_balance_threshold');
  if (!thresholdStr) return;

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
          body: `Your account "${acc.name}" has dropped below your warning threshold of ₹${threshold}.`,
          schedule: { at: new Date(new Date().getTime() + 1000) },
          channelId: 'alerts'
        });
      }
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } catch (e) {}
}
