import { describe, expect, it } from "vitest";
import { pickThree, type Candidate } from "../myThree";

const mk = (id: string, categories: string[], prayer_count = 5, is_urgent = false): Candidate =>
  ({ id, categories, prayer_count, is_urgent, created_at: "2026-10-01T00:00:00Z" });

function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 2 ** 32; return seed / 2 ** 32; };
}

describe("pickThree", () => {
  const pool = [
    mk("food1", ["Food & hunger"]), mk("food2", ["Food & hunger"]), mk("grief", ["Grief & loss"]),
    mk("health", ["Health & healing"]), mk("lonely", ["Loneliness"], 0), mk("jobs", ["Jobs & finances"]),
  ];

  it("returns three distinct requests and skips ones already prayed for", () => {
    const picks = pickThree(pool, { interests: [], lived: [], mix: 50, prayedIds: new Set(["food1"]), random: seeded(1) });
    const ids = picks.map((p) => p.request.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain("food1");
  });

  it("always includes someone few have prayed for when one exists", () => {
    for (let s = 1; s < 50; s++) {
      const ids = pickThree(pool, { interests: ["Food & hunger"], lived: [], mix: 100, prayedIds: new Set(), random: seeded(s) }).map((p) => p.request.id);
      expect(ids).toContain("lonely");
    }
  });

  it("at full interest, fills the rest only from matching needs", () => {
    const covered = pool.map((c) => ({ ...c, prayer_count: 10 }));
    for (let s = 1; s < 30; s++) {
      const picks = pickThree(covered, { interests: ["Food & hunger"], lived: ["Grief & loss"], mix: 100, prayedIds: new Set(), random: seeded(s) });
      expect(picks.map((p) => p.request.id).sort()).toEqual(["food1", "food2", "grief"]);
    }
  });

  it("explains each pick", () => {
    const [p] = pickThree([mk("g", ["Grief & loss"])], { interests: [], lived: ["Grief & loss"], mix: 70, prayedIds: new Set(), random: seeded(3) });
    expect(p.reason).toMatch(/walked this road/);
  });

  it("returns fewer than three when the pool is small", () => {
    expect(pickThree([mk("a", [])], { interests: [], lived: [], mix: 0, prayedIds: new Set() })).toHaveLength(1);
  });
});
