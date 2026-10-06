import type { Metadata } from "next";
import { getViewer } from "@/lib/supabase/server";
import { Guide } from "@/components/Guide";
import { WatchBoard } from "./WatchBoard";

export const metadata: Metadata = { title: "The Watch" };

export default async function WatchPage() {
  const { supabase, user, profile } = await getViewer();
  const [{ data: coverage }, mine] = await Promise.all([
    supabase.rpc("watch_coverage"),
    user ? supabase.from("watch_hours").select("dow, hour") : Promise.resolve({ data: [] }),
  ]);
  return (
    <div className="stack-lg">
      <div className="hero">
        <h1>The Watch</h1>
        <p>Warriors each keep an hour a week so someone is always praying over the requests, day and night.</p>
        <blockquote className="verse" style={{ margin: 0 }}>
          “I have set watchmen upon thy walls, O Jerusalem, which shall never hold their peace day nor night.”<cite>Isaiah 62:6</cite>
        </blockquote>
      </div>
      <Guide
        id="watch"
        title="How to keep watch"
        steps={[
          <>Choose a day below. Each box is one hour of that day, in your own time.</>,
          <>Boxes marked <strong>No one yet</strong> need a warrior. Tap a box to make it your hour each week.</>,
          <>When your hour comes, open the app. We will show you who to pray for.</>,
          <>To give an hour back, tap it again.</>,
        ]}
      />
      <WatchBoard
        coverage={(coverage ?? []) as { utc_hour: number; warriors: number }[]}
        mine={(mine.data ?? []) as { dow: number; hour: number }[]}
        signedIn={!!user}
        isWarrior={!!profile?.is_warrior}
      />
    </div>
  );
}
