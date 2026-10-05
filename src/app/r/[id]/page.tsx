import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { FEED_COLUMNS, timeAgo, type PrayerRequest, type RequestUpdate } from "@/lib/types";
import { verseFor } from "@/lib/verses";
import { isCrisis } from "@/lib/moderation";
import { CrisisNotice, LocalHelpNotice } from "@/components/HelpNotices";
import { Guide } from "@/components/Guide";
import { PrayPanel } from "./PrayPanel";
import { OwnerPanel } from "./OwnerPanel";
import { ReportButton } from "./ReportButton";

export const metadata: Metadata = { title: "Pray for someone" };

export default async function RequestPage({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getViewer();
  const { data: r } = await supabase.from("prayer_requests").select(FEED_COLUMNS).eq("id", id).maybeSingle<PrayerRequest>();
  const isMine = user ? ((await supabase.rpc("is_my_request", { p_request: id })).data as boolean) : false;
  // Authors can still see their own held request (via my_requests); everyone else gets 404.
  let request = r;
  if (!request && isMine) {
    const { data } = await supabase.rpc("my_requests");
    request = ((data ?? []) as PrayerRequest[]).find((x) => x.id === id) ?? null;
  }
  if (!request) notFound();
  const { data: updates } = await supabase.from("request_updates").select("*").eq("request_id", id).order("created_at");
  let prayed = false;
  if (user) {
    const { data: p } = await supabase.from("prayers").select("request_id").eq("request_id", id).eq("warrior_id", user.id).maybeSingle();
    prayed = !!p;
  }
  const who = request.display_name || "Anonymous";
  const verse = verseFor(request.categories, request.id);

  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <Link href="/" className="btn btn-quiet" style={{ justifySelf: "start" }}>← Back to all requests</Link>
      {isCrisis(request.flags) && <CrisisNotice forRequester={isMine} />}
      <article className={`card request-card${request.is_urgent ? " urgent" : ""}`}>
        <div className="request-head">
          <h1 style={{ fontSize: "1.6rem" }}>{isMine ? "Your request" : who === "Anonymous" ? "Pray for this person" : `Pray for ${who}`}</h1>
          {request.is_urgent && <span className="badge badge-urgent">Urgent</span>}
          {request.answered_at && <span className="badge badge-answered">Prayer answered</span>}
          {request.status === "held" && <span className="badge badge-held">Waiting for review</span>}
        </div>
        <p className="request-meta">{[request.place, timeAgo(request.created_at)].filter(Boolean).join(" · ")}</p>
        <p className="request-body">{request.body}</p>
        {request.categories.length > 0 && (
          <div className="chips">{request.categories.map((c) => <span key={c} className="tag">{c}</span>)}</div>
        )}
        <p className="count"><b>{request.prayer_count}</b> {request.prayer_count === 1 ? "person has prayed" : "people have prayed"} for {isMine ? "you" : "this"}</p>
      </article>

      {(updates as RequestUpdate[] | null)?.length ? (
        <section className="stack" aria-label="Updates">
          <h2>Updates from {isMine ? "you" : who}</h2>
          {(updates as RequestUpdate[]).map((u) => (
            <div key={u.id} className={`notice ${u.kind === "praise" ? "notice-help" : "notice-info"}`}>
              <strong>{u.kind === "praise" ? "Praise report" : "Update"} · {timeAgo(u.created_at)}</strong>
              <p>{u.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      {isMine ? (
        <OwnerPanel requestId={request.id} answered={!!request.answered_at} />
      ) : (
        <>
          <Guide
            id="pray"
            title="Praying for someone, step by step"
            steps={[
              <>Read their request slowly.</>,
              <>Tap <strong>Begin praying</strong>. A gentle one-minute circle helps you stay with them. It is only a guide, so pray as long as you like.</>,
              <>When you finish, tap <strong>Amen, I prayed</strong>.</>,
            ]}
          />
          <PrayPanel requestId={request.id} who={who} verse={verse} signedIn={!!user} alreadyPrayed={prayed} />
        </>
      )}
      <LocalHelpNotice categories={request.categories} forRequester={isMine} />
      {!isMine && user && <ReportButton requestId={request.id} />}
    </div>
  );
}
