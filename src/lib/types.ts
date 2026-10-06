export type PrayerRequest = {
  id: string;
  body: string;
  display_name: string;
  place: string | null;
  is_urgent: boolean;
  categories: string[];
  status: "published" | "held" | "removed";
  flags: string[];
  prayer_count: number;
  answered_at: string | null;
  created_at: string;
  expires_at: string;
  circle_id: string | null;
  adopted_count: number;
};
export type RequestUpdate = { id: string; request_id: string; kind: "update" | "praise"; body: string; status: string; created_at: string };
export type Profile = {
  id: string;
  first_name: string | null;
  is_warrior: boolean;
  is_requester: boolean;
  onboarded: boolean;
  interests: string[];
  lived_experience: string[];
  three_mix: number;
  show_guides: boolean;
  is_admin: boolean;
};
export type Interest = { slug: string; label: string; status: string };

export type Notification = {
  id: string; kind: "prayed" | "adopted" | "update" | "praise" | "approved" | "removed" | "circle-request";
  request_id: string | null; body: string; created_at: string; read_at: string | null;
};
export type Circle = { id: string; name: string; role: "leader" | "member"; invite_code: string; member_count: number; request_count: number };
export type Adoption = { request_id: string; timezone: string; started_on: string; days_prayed: string[] };

export const FEED_COLUMNS = "id, body, display_name, place, is_urgent, categories, status, flags, prayer_count, answered_at, created_at, expires_at, circle_id, adopted_count";

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(1, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
