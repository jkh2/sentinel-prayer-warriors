import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { FEED_COLUMNS, type PrayerRequest } from "@/lib/types";
import { Guide } from "@/components/Guide";
import { MyThree } from "./MyThree";

export const metadata: Metadata = { title: "My Three" };

export default async function ThreePage() {
  const { supabase, user, profile } = await getViewer();
  if (!user || !profile) redirect("/login?next=/three");
  if (!profile.is_warrior) {
    return (
      <div className="card stack" style={{ maxWidth: 640 }}>
        <h1>My Three is for prayer warriors</h1>
        <p>Turn on “I want to pray for others” in Settings, and we’ll choose three people for you to pray for each day.</p>
        <Link href="/settings" className="btn btn-primary">Open Settings</Link>
      </div>
    );
  }
  const [{ data: pool }, { data: prayed }] = await Promise.all([
    supabase.from("prayer_requests").select(FEED_COLUMNS).eq("status", "published")
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(400),
    supabase.from("prayers").select("request_id").eq("warrior_id", user.id).limit(2000),
  ]);
  const { data: own } = await supabase.rpc("my_requests");
  const ownIds = new Set(((own ?? []) as PrayerRequest[]).map((r) => r.id));
  return (
    <div className="stack-lg">
      <div className="hero">
        <h1>Your three people for today</h1>
        <p>We choose three people for you. Those few have prayed for come first, then needs that match your heart, with a little holy randomness.</p>
      </div>
      <Guide
        id="three"
        title="How My Three works"
        steps={[
          <>Below are three people who need prayer.</>,
          <>Tap <strong>Pray for…</strong> on each one. When you finish, you’ll come back here.</>,
          <>Want different people? Tap <strong>Choose three new people</strong>.</>,
          <>Use the slider to choose between anyone at random and only the needs you picked in Settings.</>,
        ]}
      />
      <MyThree
        pool={((pool ?? []) as PrayerRequest[]).filter((r) => !ownIds.has(r.id))}
        prayed={(prayed ?? []).map((p) => p.request_id)}
        interests={profile.interests}
        lived={profile.lived_experience}
        mix={profile.three_mix}
      />
    </div>
  );
}
