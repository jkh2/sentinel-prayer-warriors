"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { markNotificationsRead } from "@/app/actions";
import { timeAgo, type Notification } from "@/lib/types";

const TITLES: Record<Notification["kind"], string> = {
  prayed: "People are praying for you",
  adopted: "Someone is carrying you this week",
  update: "An update from someone you prayed for",
  praise: "A praise report!",
  approved: "Your request is on the feed",
  removed: "About your request",
  "circle-request": "New request in your circle",
};

// Opening the inbox counts as reading it; notes that were new stay highlighted for this visit.
export function NoteList({ notes }: { notes: Notification[] }) {
  const [fresh] = useState(() => new Set(notes.filter((n) => !n.read_at).map((n) => n.id)));
  useEffect(() => {
    if (fresh.size) markNotificationsRead();
  }, [fresh]);
  return (
    <section className="stack" aria-label="Notes">
      {notes.map((n) => {
        const isNew = fresh.has(n.id);
        const inner = (
          <>
            <strong>{isNew && <span className="sr-only">New: </span>}{TITLES[n.kind]}</strong>
            <span>{n.body}</span>
            <span className="when">{timeAgo(n.created_at)}</span>
          </>
        );
        const cls = `card note${isNew ? " unread-note" : ""}`;
        return n.request_id
          ? <Link key={n.id} href={`/r/${n.request_id}`} className={cls}>{inner}</Link>
          : <div key={n.id} className={cls}>{inner}</div>;
      })}
    </section>
  );
}
