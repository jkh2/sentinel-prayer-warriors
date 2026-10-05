import { describe, expect, it } from "vitest";
import { adoptionDay, coverageForDay, hourLabel, hourRange, isMyHourNow, slotToUtcHour, todayIn, utcHourOfWeek } from "../watch";

describe("watch hours", () => {
  it("numbers UTC hours of the week from Monday midnight", () => {
    expect(utcHourOfWeek(new Date("2026-10-05T00:00:00Z"))).toBe(0); // Monday
    expect(utcHourOfWeek(new Date("2026-10-11T23:00:00Z"))).toBe(167); // Sunday
  });

  it("maps a local weekly slot to the same UTC hour the database uses", () => {
    const now = new Date(2026, 9, 7, 12); // a Wednesday, local time
    const sundaySix = new Date(2026, 9, 4, 6); // that week's Sunday 6 AM, local time
    expect(slotToUtcHour(0, 6, now)).toBe(utcHourOfWeek(sundaySix));
  });

  it("builds a day's coverage from UTC rows", () => {
    const now = new Date(2026, 9, 7, 12);
    const rows = [{ utc_hour: slotToUtcHour(3, 9, now), warriors: 2 }];
    const day = coverageForDay(rows, 3, now);
    expect(day).toHaveLength(24);
    expect(day[9]).toBe(2);
    expect(day.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("knows when it is my hour", () => {
    const now = new Date(2026, 9, 7, 21, 30); // Wednesday 9:30 PM
    expect(isMyHourNow([{ dow: 3, hour: 21 }], now)).toBe(true);
    expect(isMyHourNow([{ dow: 3, hour: 22 }], now)).toBe(false);
  });

  it("labels hours plainly", () => {
    expect(hourLabel(0)).toBe("12 AM");
    expect(hourLabel(12)).toBe("12 PM");
    expect(hourRange(23)).toBe("11 PM to 12 AM");
  });
});

describe("adoption days", () => {
  it("counts days 1 to 7, then ends", () => {
    expect(adoptionDay("2026-10-05", "2026-10-05")).toBe(1);
    expect(adoptionDay("2026-10-05", "2026-10-11")).toBe(7);
    expect(adoptionDay("2026-10-05", "2026-10-12")).toBe(0);
  });

  it("finds today in another time zone", () => {
    const late = new Date("2026-10-06T03:00:00Z"); // still Oct 5 in Chicago
    expect(todayIn("America/Chicago", late)).toBe("2026-10-05");
    expect(todayIn("UTC", late)).toBe("2026-10-06");
  });
});
