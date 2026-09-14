export function computeCycleBounds(monthStr, settings) {
  // monthStr is expected to be 'YYYY-MM'
  const [year, month] = monthStr.split('-');
  const requestYear = Number(year);
  const requestMonth = Number(month);

  let startStr, endStr;

  if (settings && settings.cycle_start_date) {
    // Custom cycle based on the user's defined day of month
    // We map the requested month to a cycle that starts in that month.
    const cycleDay = new Date(settings.cycle_start_date).getUTCDate();
    
    // Construct the start date for this cycle using UTC to avoid timezone shifts
    const startDate = new Date(Date.UTC(requestYear, requestMonth - 1, cycleDay));
    startStr = startDate.toISOString().split('T')[0];
    
    const cycleLength = settings.cycle_days || 30;
    
    // Construct the end date
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + cycleLength - 1);
    endStr = endDate.toISOString().split('T')[0];
  } else {
    // Default Calendar Month
    startStr = `${year}-${month}-01`;
    // Get the last day of the month
    const endDate = new Date(Date.UTC(requestYear, requestMonth, 0));
    endStr = endDate.toISOString().split('T')[0];
  }

  return { start: startStr, end: endStr };
}
