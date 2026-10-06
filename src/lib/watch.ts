// The Watch: warriors keep weekly hours in their own time zone. The database reports coverage by
// UTC hour of the week (0 = Monday 00:00 UTC); these helpers translate to and from local hours.

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const HOURS_IN_WEEK = 168;

/** UTC hour of the week (Monday-based) for a moment in time. */
export function utcHourOfWeek(d: Date) {
  return ((d.getUTCDay() + 6) % 7) * 24 + d.getUTCHours();
}

/** The UTC hour of the week a local weekly slot (0 = Sunday) falls on, using the week around `now`. */
export function slotToUtcHour(dow: number, hour: number, now = new Date()) {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + (dow - d.getDay()));
  return utcHourOfWeek(d);
}

/** "6 AM", "12 PM", "9 PM". */
export function hourLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}

/** "6 AM to 7 AM". */
export function hourRange(hour: number) {
  return `${hourLabel(hour)} to ${hourLabel((hour + 1) % 24)}`;
}

/** Warriors keeping each local hour of one day, from the database's UTC coverage rows. */
export function coverageForDay(rows: { utc_hour: number; warriors: number }[], dow: number, now = new Date()) {
  const byUtc = new Map(rows.map((r) => [r.utc_hour, r.warriors]));
  return Array.from({ length: 24 }, (_, hour) => byUtc.get(slotToUtcHour(dow, hour, now)) ?? 0);
}

export function isMyHourNow(mine: { dow: number; hour: number }[], now = new Date()) {
  return mine.some((m) => m.dow === now.getDay() && m.hour === now.getHours());
}

/** Today's date (YYYY-MM-DD) in a time zone, for adoption days. */
export function todayIn(timeZone: string, now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Which day of a 7-day adoption today is (1 to 7), or 0 when it has ended. */
export function adoptionDay(startedOn: string, today: string) {
  const n = Math.round((Date.parse(today) - Date.parse(startedOn)) / 86_400_000) + 1;
  return n >= 1 && n <= 7 ? n : 0;
}
