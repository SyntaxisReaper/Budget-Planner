export function computeCycleBounds(monthStr, settings) {
  if (!monthStr) return { start: '', end: '' };
  const [year, month] = monthStr.split('-');
  const requestYear = Number(year);
  const requestMonth = Number(month);

  let startStr, endStr;

  if (settings && settings.cycle_start_date) {
    const cycleDay = new Date(settings.cycle_start_date).getUTCDate();
    const startDate = new Date(Date.UTC(requestYear, requestMonth - 1, cycleDay));
    startStr = startDate.toISOString().split('T')[0];
    
    const cycleLength = settings.cycle_days || 30;
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + cycleLength - 1);
    endStr = endDate.toISOString().split('T')[0];
  } else {
    startStr = `${year}-${month}-01`;
    const endDate = new Date(Date.UTC(requestYear, requestMonth, 0));
    endStr = endDate.toISOString().split('T')[0];
  }

  return { start: startStr, end: endStr };
}
