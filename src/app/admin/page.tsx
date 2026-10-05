import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { FEED_COLUMNS, timeAgo, type PrayerRequest, type RequestUpdate } from "@/lib/types";
import { ModerateButtons } from "./ModerateButtons";

export const metadata: Metadata = { title: "Review queue" };

export default async function AdminPage() {
  const { supabase, profile } = await getViewer();
  if (!profile?.is_admin) redirect("/");
  const [held, crisis, reports, updates, interests] = await Promise.all([
    supabase.from("prayer_requests").select(FEED_COLUMNS).eq("status", "held").order("created_at").limit(100),
    supabase.from("prayer_requests").select(FEED_COLUMNS).eq("status", "published").overlaps("flags", ["crisis-self", "crisis-abuse"]).order("created_at", { ascending: false }).limit(50),
    supabase.from("reports").select("request_id, reason, created_at").is("resolved_at", null).order("created_at").limit(200),
    supabase.from("request_updates").select("*").eq("status", "held").limit(100),
    supabase.from("interests").select("slug, label").eq("status", "pending").limit(100),
  ]);
  const reasons = new Map<string, string[]>();
  for (const r of reports.data ?? []) reasons.set(r.request_id, [...(reasons.get(r.request_id) ?? []), r.reason]);
  return (
    <div className="stack-lg">
      <div className="hero"><h1>Review queue</h1><p>Requests with contact details, links, money, or three reports wait here. Crisis requests are already on the feed; check them first.</p></div>
      <Section title="People who may be in danger" empty={!crisis.data?.length}>{(crisis.data as PrayerRequest[] | null)?.map((r) => <Req key={r.id} r={r} reasons={reasons.get(r.id) ?? []} />)}</Section>
      <Section title="Requests waiting for review" empty={!held.data?.length}>{(held.data as PrayerRequest[] | null)?.map((r) => <Req key={r.id} r={r} reasons={reasons.get(r.id) ?? []} />)}</Section>
      <Section title="Updates waiting for review" empty={!updates.data?.length}>
        {(updates.data as RequestUpdate[] | null)?.map((u) => (
          <div key={u.id} className="card"><strong>{u.kind}</strong><p>{u.body}</p><ModerateButtons kind="update" id={u.id} published={false} /></div>
        ))}
      </Section>
      <Section title="Suggested interests" empty={!interests.data?.length}>
        {interests.data?.map((i) => (
          <div key={i.slug} className="card"><strong>{i.label}</strong><ModerateButtons kind="interest" id={i.slug} published={false} /></div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: boolean; children?: React.ReactNode }) {
  return <section className="stack"><h2>{title}</h2>{empty ? <p className="muted">Nothing waiting.</p> : children}</section>;
}

function Req({ r, reasons }: { r: PrayerRequest; reasons: string[] }) {
  return (
    <div className="card">
      <div className="request-head"><strong>{r.display_name}</strong><span className="request-meta">{timeAgo(r.created_at)}</span>
        {r.flags.map((f) => <span key={f} className="badge badge-held">{f}</span>)}
        {reasons.map((x, i) => <span key={i} className="badge badge-urgent">report: {x}</span>)}
      </div>
      <p className="request-body">{r.body}</p>
      <ModerateButtons kind="request" id={r.id} published={r.status === "published"} />
    </div>
  );
}
