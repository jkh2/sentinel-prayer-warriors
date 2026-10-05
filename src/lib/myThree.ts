// Picks three people for a warrior to pray for.
// Coverage comes first: requests few people have prayed for get much more weight, and when any
// such request exists at least one of the three is from them. Then the warrior's interests and
// lived experience, then urgency. Randomness keeps every draw different.
export type Candidate = {
  id: string;
  categories: string[];
  prayer_count: number;
  is_urgent: boolean;
  created_at: string;
};
export type Pick<T extends Candidate> = { request: T; reason: string };

export const COVERAGE_GOAL = 3;

export function weightFor(c: Candidate, interests: Set<string>, lived: Set<string>, mix: number) {
  const m = Math.min(Math.max(mix, 0), 100) / 100;
  const interestHit = c.categories.some((x) => interests.has(x));
  const livedHit = c.categories.some((x) => lived.has(x));
  const coverage = c.prayer_count === 0 ? 6 : c.prayer_count < COVERAGE_GOAL ? 3 : 1;
  const match = livedHit ? 1 + 15 * m : interestHit ? 1 + 10 * m : 1;
  return coverage * match * (c.is_urgent ? 1.6 : 1);
}

export function reasonFor(c: Candidate, interests: Set<string>, lived: Set<string>) {
  const lh = c.categories.filter((x) => lived.has(x));
  if (lh.length) return `You have walked this road: ${lh.join(", ")}`;
  const ih = c.categories.filter((x) => interests.has(x));
  if (ih.length) return `Matches your heart for ${ih.join(", ")}`;
  if (c.prayer_count === 0) return "No one has prayed for this yet";
  return "Chosen for you at random";
}

export function pickThree<T extends Candidate>(
  pool: T[],
  opts: { interests: string[]; lived: string[]; mix: number; prayedIds: Set<string>; random?: () => number },
): Pick<T>[] {
  const rnd = opts.random ?? Math.random;
  const interests = new Set(opts.interests), lived = new Set(opts.lived);
  const all = pool.filter((c) => !opts.prayedIds.has(c.id));
  const weigh = (list: T[]) => list.map((c) => ({ c, w: weightFor(c, interests, lived, opts.mix) }));
  const take = (list: { c: T; w: number }[]) => {
    const total = list.reduce((s, x) => s + x.w, 0);
    let r = rnd() * total;
    let i = 0;
    for (; i < list.length - 1; i++) { r -= list[i].w; if (r <= 0) break; }
    return list[i].c;
  };
  const picks: T[] = [];
  // Coverage slot: drawn from everyone, whatever the interest setting.
  const under = all.filter((c) => c.prayer_count < COVERAGE_GOAL);
  if (under.length) picks.push(take(weigh(under)));
  // At "only my interests", the remaining slots come from matching needs when there are any.
  let rest = all;
  if (opts.mix >= 100 && (interests.size || lived.size)) {
    const only = all.filter((c) => c.categories.some((x) => interests.has(x) || lived.has(x)));
    if (only.length) rest = only;
  }
  while (picks.length < 3) {
    const left = rest.filter((c) => !picks.includes(c));
    if (!left.length) break;
    picks.push(take(weigh(left)));
  }
  return picks.map((r) => ({ request: r, reason: reasonFor(r, interests, lived) }));
}
