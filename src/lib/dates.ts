/**
 * Parses date inputs supporting three specific formats:
 * 1. YYYY-MM-DD (e.g., "2026-06-10")
 * 2. DD/MM/YYYY (e.g., "10/06/2026")
 * 3. Month Name D, YYYY (e.g., "June 5, 2026")
 */
export function parseCleanDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput !== 'string') {
    return null;
  }

  const trimmed = dateInput.trim();
  if (!trimmed) return null;

  // Format 1: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Format 2: DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // JS Months are 0-indexed
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Format 3: General parsing (works for "June 5, 2026" and standard ISO strings)
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d;
  }

  return null;
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatDateToString(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns boundaries of the current week (Monday 00:00:00 to Sunday 23:59:59)
 */
export function getThisWeekBoundaries() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // How many days back to Monday
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday };
}

/**
 * Returns true if the completed date falls in the current week (Mon-Sun)
 */
export function isCompletedThisWeek(completedDate: string | Date | null): boolean {
  if (!completedDate) return false;
  
  const compDate = completedDate instanceof Date ? completedDate : new Date(completedDate);
  if (isNaN(compDate.getTime())) return false;
  
  const { monday, sunday } = getThisWeekBoundaries();
  return compDate >= monday && compDate <= sunday;
}
