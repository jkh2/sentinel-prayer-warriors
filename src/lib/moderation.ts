// Mirrors public.screen_text() in supabase/migrations. The database is the source of truth;
// this copy gives people instant feedback before they press Share.
export type Flag = "contact-info" | "link" | "money" | "crisis-self" | "crisis-abuse";

const RULES: [Flag, RegExp][] = [
  ["contact-info", /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/],
  ["contact-info", /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i],
  ["link", /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ly|me|co)\b)/i],
  ["money", /(cash ?app|venmo|paypal|zelle|gofundme|go fund me|bitcoin|crypto|western union|moneygram|gift ?cards?|wire (me|the)|send (me )?money|\$[a-z][a-z0-9_]{2,}|donat(e|ions?)|bank account|routing number)/i],
  ["crisis-self", /(suicid|kill myself|end my life|want to die|don'?t want to live|self[- ]harm|cutting myself|overdose)/i],
  ["crisis-abuse", /(he hits me|she hits me|beats me|being abused|abusing me|molest|threatened to kill|afraid for my life)/i],
];

export function screenText(text: string): Flag[] {
  const found = new Set<Flag>();
  for (const [flag, re] of RULES) if (re.test(text)) found.add(flag);
  return [...found].sort();
}

export const HOLDING_FLAGS: Flag[] = ["contact-info", "link", "money"];
export const isHeld = (flags: string[]) => flags.some((f) => (HOLDING_FLAGS as string[]).includes(f));
export const isCrisis = (flags: string[]) => flags.some((f) => f.startsWith("crisis"));

export const FLAG_HELP: Record<Flag, string> = {
  "contact-info": "Please remove phone numbers and email addresses. Strangers will read this.",
  link: "Please remove website links. Requests with links wait for a person to review them.",
  money: "Requests that ask for money or mention payment apps wait for a person to review them, to protect people from scams.",
  "crisis-self": "",
  "crisis-abuse": "",
};
