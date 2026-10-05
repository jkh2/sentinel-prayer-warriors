"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PrayerRequest } from "@/lib/types";
import { RequestCard } from "./RequestCard";

type Filter = "all" | "mine" | "urgent" | "unprayed" | "answered";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All requests" },
  { id: "mine", label: "My interests" },
  { id: "urgent", label: "Urgent" },
  { id: "unprayed", label: "No one has prayed yet" },
  { id: "answered", label: "Answered prayers" },
];

export function LiveFeed({ initial, prayed, interests }: { initial: PrayerRequest[]; prayed: string[]; interests: string[] }) {
  const [shown, setShown] = useState<PrayerRequest[]>(initial);
  const [waiting, setWaiting] = useState<PrayerRequest[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [connected, setConnected] = useState(false);
  const mine = useMemo(() => new Set(interests), [interests]);
  const prayedSet = useMemo(() => new Set(prayed), [prayed]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_requests" }, (payload) => {
        const row = payload.new as PrayerRequest;
        if (payload.eventType === "INSERT" && row.status === "published") {
          // New requests wait above the list instead of pushing it down while someone is reading.
          setWaiting((w) => (w.some((x) => x.id === row.id) ? w : [row, ...w]));
        } else if (payload.eventType === "UPDATE") {
          setShown((list) =>
            row.status === "published"
              ? list.map((x) => (x.id === row.id ? { ...x, ...row } : x))
              : list.filter((x) => x.id !== row.id),
          );
        }
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, []);

  const showWaiting = () => {
    setFresh(new Set(waiting.map((w) => w.id)));
    setShown((s) => [...waiting, ...s.filter((x) => !waiting.some((w) => w.id === x.id))]);
    setWaiting([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const list = shown.filter((r) =>
    filter === "mine" ? r.categories.some((c) => mine.has(c))
      : filter === "urgent" ? r.is_urgent
      : filter === "unprayed" ? r.prayer_count === 0
      : filter === "answered" ? !!r.answered_at
      : true,
  );

  return (
    <section className="stack" aria-label="Prayer requests">
      <div className="feed-tools">
        <span className="live">
          <i aria-hidden="true" />
          {connected ? "Live. New requests appear automatically." : "Connecting to the live feed…"}
        </span>
        <div className="chips" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
      </div>
      {waiting.length > 0 && (
        <button className="btn btn-primary new-banner" onClick={showWaiting}>
          {waiting.length === 1 ? "1 new request. Tap to see it." : `${waiting.length} new requests. Tap to see them.`}
        </button>
      )}
      {list.length === 0 ? (
        <div className="empty">
          {filter === "mine" && mine.size === 0 ? (
            <>
              <h2>Choose your interests first</h2>
              <p>Tell us which needs are on your heart, and this button will show only those.</p>
              <Link className="btn" href="/settings">Choose my interests</Link>
            </>
          ) : filter === "all" ? (
            <>
              <h2>No requests yet</h2>
              <p>Be the first. Anyone can ask for prayer.</p>
              <Link className="btn btn-primary" href="/ask">Ask for prayer</Link>
            </>
          ) : (
            <>
              <h2>Nothing here right now</h2>
              <p>Try “All requests” above. New requests arrive all the time.</p>
            </>
          )}
        </div>
      ) : (
        list.map((r) => <RequestCard key={r.id} r={r} fresh={fresh.has(r.id)} matches={mine} prayed={prayedSet.has(r.id)} />)
      )}
    </section>
  );
}
