"use client";
import Link from "next/link";
import { useNow } from "@/lib/useNow";
import { isMyHourNow } from "@/lib/watch";
import type { Carrying } from "@/lib/carrying";

// "What should I pray for today?" for signed-in warriors: their Watch hour and the people they adopted.
export function TodayPanel({ carrying, watch }: { carrying: Carrying[]; watch: { dow: number; hour: number }[] }) {
  const now = useNow();
  const due = carrying.filter((c) => !c.prayedToday);
  const onWatch = !!now && isMyHourNow(watch, now);
  if (!onWatch && due.length === 0) return null;
  return (
    <section className="notice notice-help stack" aria-label="Today">
      {onWatch && (
        <div className="stack" style={{ gap: 8 }}>
          <h2>You are on watch right now</h2>
          <p>Thank you for keeping this hour. <Link href="/three">Start with three people</Link>, or pray down the feed below.</p>
        </div>
      )}
      {due.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <h2>Pray today for the {due.length === 1 ? "person" : "people"} you’re carrying</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {due.map((c) => (
              <li key={c.id}><Link href={`/r/${c.id}`}>{c.who}</Link> <span className="muted small">(day {c.day} of 7)</span></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
