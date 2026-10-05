import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";
import { NoteList } from "./NoteList";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login?next=/inbox");
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(60);
  const notes = (data ?? []) as Notification[];
  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <div className="hero">
        <h1>Inbox</h1>
        <p>Good news and gentle notes: when people pray for you, praise reports from people you prayed for, and news from your circles.</p>
      </div>
      {notes.length === 0 ? (
        <div className="empty">
          <h2>Nothing here yet</h2>
          <p>When someone prays for your request, or someone you prayed for shares good news, you’ll see it here.</p>
          <Link href="/" className="btn">Open the live feed</Link>
        </div>
      ) : (
        <NoteList notes={notes} />
      )}
    </div>
  );
}
