import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { FEED_COLUMNS, type Circle, type PrayerRequest } from "@/lib/types";
import { LiveFeed } from "@/components/LiveFeed";
import { CircleAdmin, InviteLink, LeaveCircle } from "./CircleTools";

export const metadata: Metadata = { title: "Circle" };

export default async function CirclePage({ params }: PageProps<"/circles/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user, profile } = await getViewer();
  if (!user) redirect(`/login?next=/circles/${id}`);
  const { data: mine } = await supabase.rpc("my_circles");
  const circle = ((mine ?? []) as Circle[]).find((c) => c.id === id);
  if (!circle) notFound();
  const [{ data: requests }, { data: prayed }, members] = await Promise.all([
    supabase.from("prayer_requests").select(FEED_COLUMNS).eq("circle_id", id).eq("status", "published")
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(100),
    supabase.from("prayers").select("request_id").eq("warrior_id", user.id).limit(1000),
    circle.role === "leader" ? supabase.rpc("circle_members_list", { p_circle: id }) : Promise.resolve({ data: null }),
  ]);
  return (
    <div className="stack-lg">
      <Link href="/circles" className="btn btn-quiet" style={{ justifySelf: "start" }}>← All my circles</Link>
      <div className="hero">
        <h1>{circle.name}</h1>
        <p>A private prayer wall. {circle.member_count} {circle.member_count === 1 ? "member" : "members"}. Only members can see these requests.</p>
        <div className="row">
          {profile?.is_requester
            ? <Link href={`/ask?circle=${id}`} className="btn btn-primary">Ask this circle for prayer</Link>
            : <Link href="/settings" className="btn">Turn on “I need prayer” to share here</Link>}
        </div>
      </div>
      <InviteLink code={circle.invite_code} />
      <LiveFeed
        initial={(requests ?? []) as PrayerRequest[]}
        prayed={(prayed ?? []).map((p) => p.request_id)}
        interests={[...(profile?.interests ?? []), ...(profile?.lived_experience ?? [])]}
        circleId={id}
      />
      {members.data && (
        <CircleAdmin circleId={id} me={user.id} members={members.data as { user_id: string; first_name: string; role: string }[]} />
      )}
      <LeaveCircle circleId={id} name={circle.name} />
    </div>
  );
}
