import dayjs from "dayjs"


/**
 * Formats a date/time to a readable format: "DD MMM YYYY, hh:mm A"
 * Example: "04 Nov 2024, 02:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "∞"
  return dayjs(date).format('DD MMM YYYY, hh:mm A')
}