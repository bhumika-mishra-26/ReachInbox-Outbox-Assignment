import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import Papa from 'papaparse';

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Format a date string into a human-friendly timestamp like "Tue 9:15 AM"
 */
export function formatEmailTimestamp(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'EEE h:mm a');
  } catch {
    return dateStr;
  }
}

/**
 * Format a date for display in detail views
 */
export function formatFullDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, h:mm a');
  } catch {
    return dateStr;
  }
}

/**
 * Format relative time e.g. "2 hours ago"
 */
export function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

/**
 * Format date for datetime-local input value
 */
export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ─── CSV parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV/TXT file and extract all valid email addresses
 */
export async function parseEmailsFromFile(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const emails: string[] = [];

      // Try CSV parse first
      const result = Papa.parse(text, { skipEmptyLines: true });
      for (const row of result.data as string[][]) {
        for (const cell of row) {
          const trimmed = cell.trim();
          if (isValidEmail(trimmed)) {
            emails.push(trimmed);
          }
        }
      }

      // If no emails found, try splitting by newlines/commas
      if (emails.length === 0) {
        const tokens = text.split(/[\n,;]+/);
        for (const token of tokens) {
          const trimmed = token.trim();
          if (isValidEmail(trimmed)) {
            emails.push(trimmed);
          }
        }
      }

      resolve([...new Set(emails)]); // deduplicate
    };
    reader.readAsText(file);
  });
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

/**
 * Strip HTML tags from a string (for body preview)
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Get initials from a name for avatar fallback
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
}

/**
 * Get a consistent color index (0-5) from a string for avatar bg colors
 */
export function getColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 6;
}

// ─── Quick-schedule helpers ───────────────────────────────────────────────────

export interface QuickScheduleOption {
  label: string;
  value: Date;
}

export function getQuickScheduleOptions(): QuickScheduleOption[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const makeTomorrow = (h: number, m = 0) => {
    const d = new Date(tomorrow);
    d.setHours(h, m, 0, 0);
    return d;
  };

  return [
    { label: 'Tomorrow', value: makeTomorrow(9, 0) },
    { label: 'Tomorrow, 10:00 AM', value: makeTomorrow(10, 0) },
    { label: 'Tomorrow, 11:00 AM', value: makeTomorrow(11, 0) },
    { label: 'Tomorrow, 3:00 PM', value: makeTomorrow(15, 0) },
  ];
}
