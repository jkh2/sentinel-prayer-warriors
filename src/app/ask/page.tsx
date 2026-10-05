import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import type { Circle } from "@/lib/types";
import { Guide } from "@/components/Guide";
import { AskForm } from "./AskForm";
import { TurnOnRole } from "./TurnOnRole";

export const metadata: Metadata = { title: "Ask for prayer" };

export default async function AskPage({ searchParams }: PageProps<"/ask">) {
  const sp = await searchParams;
  const { supabase, user, profile } = await getViewer();
  const [{ data: interests }, { data: circles }] = await Promise.all([
    supabase.from("interests").select("label").eq("status", "approved").order("label"),
    user ? supabase.rpc("my_circles") : Promise.resolve({ data: [] }),
  ]);
  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <div className="hero">
        <h1>Ask for prayer</h1>
        <p>Tell us what is on your heart. People who love to pray will see your request and pray for you by name.</p>
      </div>
      <Guide
        id="ask"
        title="How asking for prayer works"
        steps={[
          <>Write what you would like prayer for, in your own words. A few sentences is plenty.</>,
          <>Choose up to three kinds of need. This helps the right people find your request.</>,
          <>Choose to show your first name, or stay anonymous.</>,
          <>Tap <strong>Share my request</strong>. You will see how many people prayed, and you can post a praise report when God answers.</>,
        ]}
      />
      {!user ? (
        <div className="card stack">
          <h2>First, sign in</h2>
          <p>Signing in keeps the feed safe from spam and lets you see who has prayed for you. Your name and email are never shown.</p>
          <Link href="/login?next=/ask" className="btn btn-primary btn-big">Sign in</Link>
        </div>
      ) : !profile?.is_requester ? (
        <TurnOnRole />
      ) : (
        <AskForm
          interests={(interests ?? []).map((i) => i.label)}
          firstName={profile.first_name ?? ""}
          circles={((circles ?? []) as Circle[]).map((c) => ({ id: c.id, name: c.name }))}
          initialCircle={typeof sp.circle === "string" ? sp.circle : null}
        />
      )}
    </div>
  );
}
