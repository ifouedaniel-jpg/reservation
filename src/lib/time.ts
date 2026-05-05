import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

export const PARIS_TZ = 'Europe/Paris';

export function parisToUtc(date: Date | string): Date {
  return fromZonedTime(date, PARIS_TZ);
}

export function utcToParis(date: Date): Date {
  return toZonedTime(date, PARIS_TZ);
}

export function formatParis(date: Date, pattern: string): string {
  return formatInTimeZone(date, PARIS_TZ, pattern);
}
