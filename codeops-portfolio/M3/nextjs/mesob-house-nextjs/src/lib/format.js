/**
 * Shared formatters for money and time.
 *
 * Building an Intl formatter is relatively expensive, so each formatter is
 * created once and reused. The locale and the time zone are both explicit:
 * relying on the server's or browser's default is how hydration mismatches
 * and "server time vs Addis time" bugs happen.
 *
 * `en-ET` is used for the number/date shape. The label is English; the
 * Ethiopian calendar is a separate decision and is not attempted by Intl.
 */

export const etb = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

export const when = new Intl.DateTimeFormat("en-ET", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Addis_Ababa",
  hour12: false,
});

export const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** ISO-shaped Addis date, useful for filenames and report stamps. */
export const dateStamp = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Africa/Addis_Ababa",
});

/** Plain grouped number, for places that already print the currency code. */
export const number = new Intl.NumberFormat("en-ET");

const TIME_UNITS = [
  [60_000, "second", 1_000],
  [3_600_000, "minute", 60_000],
  [86_400_000, "hour", 3_600_000],
  [604_800_000, "day", 86_400_000],
  [2_592_000_000, "week", 604_800_000],
  [31_536_000_000, "month", 2_592_000_000],
  [Infinity, "year", 31_536_000_000],
];

/**
 * "12 minutes ago" / "in 2 hours" using the shared RelativeTimeFormat.
 * Returns an empty string for an invalid date instead of "Invalid Date".
 */
export function timeAgo(value, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const difference = timestamp - now;
  const absolute = Math.abs(difference);

  for (const [limit, unit, divisor] of TIME_UNITS) {
    if (absolute < limit) {
      return relative.format(Math.round(difference / divisor), unit);
    }
  }

  return "";
}
