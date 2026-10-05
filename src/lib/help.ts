// Real-world help shown next to prayer: crisis lines and local practical help.
export const CRISIS_LINES = [
  { name: "988 Suicide & Crisis Lifeline (US)", how: "Call or text 988", href: "tel:988" },
  { name: "National Domestic Violence Hotline (US)", how: "Call 1-800-799-7233 or text START to 88788", href: "tel:18007997233" },
  { name: "Outside the US", how: "Find a local crisis line at findahelpline.com", href: "https://findahelpline.com" },
  { name: "In immediate danger", how: "Call 911 (or your local emergency number)", href: "tel:911" },
];

// Categories where practical help matters alongside prayer (James 2:15-16).
export const PRACTICAL_CATEGORIES = new Set(["Food & hunger", "Housing & shelter", "Jobs & finances", "Disaster relief"]);

export const LOCAL_HELP = [
  { name: "211", how: "Call 2-1-1 in the US and Canada for food, housing and bill help near you", href: "tel:211" },
  { name: "Find food near you", how: "Feeding America food bank locator", href: "https://www.feedingamerica.org/find-your-local-foodbank" },
  { name: "Find help near you", how: "Search free and reduced-cost help by zip code", href: "https://www.findhelp.org" },
];
