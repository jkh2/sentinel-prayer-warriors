import Image from "next/image";
import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { FEED_COLUMNS, type PrayerRequest } from "@/lib/types";
import { Guide } from "@/components/Guide";
import { LiveFeed } from "@/components/LiveFeed";

export default async function FeedPage() {
  const { supabase, user, profile } = await getViewer();
  const { data } = await supabase
    .from("prayer_requests")
    .select(FEED_COLUMNS)
    .eq("status", "published")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(100);
  let prayed: string[] = [];
  if (user) {
    const { data: p } = await supabase.from("prayers").select("request_id").eq("warrior_id", user.id).limit(1000);
    prayed = (p ?? []).map((x) => x.request_id);
  }
  return (
    <div className="stack-lg">
      <div className="mark-hero">
        <Image src="/sentinel-mark.webp" alt="The Sentinel mark: a glowing golden triangle" width={220} height={220} priority />
        <div className="hero">
          <h1>People asking for prayer right now</h1>
          <p>Every card is a real person with a real need. Choose one, pray for them by name, and let them know they are not alone.</p>
          <div className="row">
            <Link href="/ask" className="btn btn-primary">Ask for prayer</Link>
            <Link href="/three" className="btn">Give me three people to pray for</Link>
          </div>
        </div>
      </div>
      <hr className="gold-rule" />
      <Guide
        id="feed"
        title="How to pray for someone"
        steps={[
          <>Read the requests below. New ones appear on their own, so you never need to refresh.</>,
          <>Tap the <strong>Pray for…</strong> button on someone’s request.</>,
          <>Take a minute to pray for them. We give you a Bible verse to help.</>,
          <>Tap <strong>Amen, I prayed</strong>. They will see that one more person prayed.</>,
        ]}
      />
      {!user && (
        <div className="notice notice-info">
          <p>You can read every request without an account. <Link href="/login">Sign in</Link> to have your prayers counted or to ask for prayer yourself.</p>
        </div>
      )}
      <LiveFeed
        initial={(data ?? []) as PrayerRequest[]}
        prayed={prayed}
        interests={[...(profile?.interests ?? []), ...(profile?.lived_experience ?? [])]}
      />
    </div>
  );
}
