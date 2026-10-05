import Link from "next/link";
import { timeAgo, type PrayerRequest } from "@/lib/types";

export function RequestCard({ r, fresh, matches, prayed, extra }: {
  r: PrayerRequest; fresh?: boolean; matches?: Set<string>; prayed?: boolean; extra?: React.ReactNode;
}) {
  const who = r.display_name || "Anonymous";
  return (
    <article className={`card request-card${r.is_urgent ? " urgent" : ""}${fresh ? " fresh" : ""}`}>
      <div className="request-head">
        <span className="request-who">{who}</span>
        {r.place && <span className="request-meta">{r.place}</span>}
        <span className="request-meta">{timeAgo(r.created_at)}</span>
        {r.is_urgent && <span className="badge badge-urgent">Urgent</span>}
        {r.answered_at && <span className="badge badge-answered">Prayer answered</span>}
      </div>
      <p className="request-body">{r.body}</p>
      {r.categories.length > 0 && (
        <div className="chips">
          {r.categories.map((c) => <span key={c} className={`tag${matches?.has(c) ? " match" : ""}`}>{c}</span>)}
        </div>
      )}
      {extra}
      <div className="request-foot">
        <span className="count">
          <b>{r.prayer_count}</b> {r.prayer_count === 1 ? "person has prayed" : "people have prayed"}
        </span>
        <Link href={`/r/${r.id}`} className={`btn ${prayed ? "btn-prayed" : "btn-primary"} stretch-link`}>
          {prayed ? "You prayed ✓" : `Pray for ${who === "Anonymous" ? "this person" : who}`}
        </Link>
      </div>
    </article>
  );
}
