import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { timeAgo, type PrayerRequest } from "@/lib/types";
import { RequestCard } from "@/components/RequestCard";
import { loadCarrying } from "@/lib/carrying";
import { StopCarrying } from "./StopCarrying";

export const metadata: Metadata = { title: "My Prayers" };

type Inbox = { request_id: string; display_name: string; request_body: string; kind: string; body: string; created_at: string };

export default async function MePage() {
  const { supabase, user, profile } = await getViewer();
  if (!user || !profile) redirect("/login?next=/me");
  const [{ data: mine }, { data: inbox }, { count }, carrying] = await Promise.all([
    supabase.rpc("my_requests"),
    supabase.rpc("updates_for_me", { p_limit: 30 }),
    supabase.from("prayers").select("request_id", { count: "exact", head: true }).eq("warrior_id", user.id),
    loadCarrying(supabase),
  ]);
  const requests = (mine ?? []) as PrayerRequest[];
  const updates = (inbox ?? []) as Inbox[];
  const prayedForMe = requests.reduce((s, r) => s + r.prayer_count, 0);

  return (
    <div className="stack-lg">
      <h1>My Prayers</h1>
      <div className="row">
        {profile.is_warrior && <div className="card" style={{ flex: "1 1 220px" }}><span className="muted">You have prayed for</span><strong style={{ fontSize: "1.6rem" }}>{count ?? 0} {count === 1 ? "person" : "people"}</strong></div>}
        {profile.is_requester && <div className="card" style={{ flex: "1 1 220px" }}><span className="muted">Prayers lifted for you</span><strong style={{ fontSize: "1.6rem" }}>{prayedForMe}</strong></div>}
      </div>

      {carrying.length > 0 && (
        <section className="stack">
          <h2>People you’re carrying this week</h2>
          <p className="muted">You promised to pray for these people once a day for 7 days.</p>
          {carrying.map((c) => (
            <div key={c.id} className="card">
              <div className="request-head">
                <span className="request-who">{c.who}</span>
                <span className="request-meta">Day {c.day} of 7 · prayed on {c.daysPrayed} {c.daysPrayed === 1 ? "day" : "days"}</span>
                {c.prayedToday && <span className="badge badge-answered">Prayed today</span>}
              </div>
              <p className="request-body" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.body}</p>
              <div className="row">
                <Link href={`/r/${c.id}`} className={`btn ${c.prayedToday ? "btn-prayed" : "btn-primary"}`}>
                  {c.prayedToday ? "You prayed today ✓" : `Pray for ${c.who} today`}
                </Link>
                <StopCarrying requestId={c.id} />
              </div>
            </div>
          ))}
        </section>
      )}

      {profile.is_warrior && (
        <section className="stack">
          <h2>News from people you prayed for</h2>
          {updates.length === 0 ? (
            <p className="muted">When someone you prayed for shares an update or a praise report, it will appear here.</p>
          ) : updates.map((u, i) => (
            <Link key={i} href={`/r/${u.request_id}`} className={`notice ${u.kind === "praise" ? "notice-help" : "notice-info"}`} style={{ textDecoration: "none" }}>
              <strong>{u.kind === "praise" ? `Praise report from ${u.display_name}` : `Update from ${u.display_name}`} · {timeAgo(u.created_at)}</strong>
              <span>{u.body}</span>
            </Link>
          ))}
        </section>
      )}

      {profile.is_requester && (
        <section className="stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>My requests</h2>
            <Link href="/ask" className="btn btn-primary">Ask for prayer</Link>
          </div>
          {requests.length === 0 ? (
            <p className="muted">You haven’t asked for prayer yet.</p>
          ) : requests.map((r) => (
            <RequestCard key={r.id} r={r} extra={r.status === "held" ? <span className="badge badge-held">Waiting for review</span> : <p className="small muted">Open it to share an update or a praise report.</p>} />
          ))}
        </section>
      )}
    </div>
  );
}
