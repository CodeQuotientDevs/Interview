import dayjs from "dayjs"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Formats a date/time to a readable format: "DD MMM YYYY, hh:mm A"
 * Example: "04 Nov 2024, 02:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined,timeZone?: string): string {
  if (!date) return "∞"
  return dayjs(date).tz(timeZone).format('DD MMM YYYY, hh:mm A')
}