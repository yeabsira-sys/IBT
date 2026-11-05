export const ADDIS_TIME_ZONE = "Africa/Addis_Ababa";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type LocalTimeParts = {
  dayOfWeek: number;
  minutes: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

/** Returns the local weekday (0 = Sunday) and minute of day for an instant. */
export function localTimeParts(
  at: Date,
  timeZone = ADDIS_TIME_ZONE,
): LocalTimeParts {
  const parts = formatterFor(timeZone).formatToParts(at);
  const lookup = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = WEEKDAYS.indexOf(
    lookup("weekday").slice(0, 3) as (typeof WEEKDAYS)[number],
  );
  const hour = Number(lookup("hour") || 0) % 24;
  const minute = Number(lookup("minute") || 0);
  return {
    dayOfWeek: weekday >= 0 ? weekday : 0,
    minutes: hour * 60 + minute,
  };
}

/** Parses HH:MM into minutes after midnight. Invalid input returns null. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Matches a time window. A window whose end is before its start is treated as
 * overnight (for example 22:00–02:00).
 */
export function isWithinTimeWindow(
  from: string,
  until: string,
  minutes: number,
): boolean {
  const start = parseTimeToMinutes(from);
  const end = parseTimeToMinutes(until);
  if (start === null || end === null) return false;
  if (start === end) return true;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export function isWithinDateWindow(
  at: Date,
  validFrom?: Date | null,
  validUntil?: Date | null,
): boolean {
  const instant = at.getTime();
  if (validFrom && instant < validFrom.getTime()) return false;
  if (validUntil && instant >= validUntil.getTime()) return false;
  return true;
}

/** Start of the current business day in Addis Ababa (UTC+3, no DST). */
export function startOfAddisDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ADDIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "01";
  return new Date(
    `${part("year")}-${part("month")}-${part("day")}T00:00:00+03:00`,
  );
}

export function addisDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ADDIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
