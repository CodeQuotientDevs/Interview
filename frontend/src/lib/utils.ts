import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from "dayjs"
import duration from "dayjs/plugin/duration";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date/time to a readable format: "DD MMM YYYY, hh:mm A"
 * Example: "04 Nov 2024, 02:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "∞"
  return dayjs(date).format('DD MMM YYYY, hh:mm A')
}

/**
 * Formats a date to a readable format: "DD MMM YYYY"
 * Example: "04 Nov 2024"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return dayjs(date).format('DD MMM YYYY')
}

/**
 * Formats a time to a readable format: "hh:mm A"
 * Example: "02:30 PM"
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return dayjs(date).format('hh:mm A')
}


dayjs.extend(duration);

export function formatDurationDayjs(seconds:number) {
  const d = dayjs.duration(seconds, "seconds");

  const parts = [];
  if (d.hours()) parts.push(`${d.hours()} hours`);
  if (d.minutes()) parts.push(`${d.minutes()} minutes`);
  if (d.seconds()) parts.push(`${d.seconds()} seconds`);

  return parts.join(" ");
}

