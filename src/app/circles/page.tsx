import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import type { Circle } from "@/lib/types";
import { Guide } from "@/components/Guide";
import { CircleForms } from "./CircleForms";

export const metadata: Metadata = { title: "Circles" };

export default async function CirclesPage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/login?next=/circles");
  const { data } = await supabase.rpc("my_circles");
  const circles = (data ?? []) as Circle[];
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <div className="hero">
        <h1>Circles</h1>
        <p>A circle is a private prayer wall for your church, small group or family. Only people you invite can see what’s shared there.</p>
      </div>
      <Guide
        id="circles"
        title="How circles work"
        steps={[
          <>Start a circle and give it a name, like “Grace Chapel Tuesday Group”.</>,
          <>Copy its invitation link and send it to your group by text or email.</>,
          <>When people open the link and tap <strong>Join</strong>, they’re in.</>,
          <>Requests shared with the circle appear only on its wall, and members get a note in their Inbox.</>,
        ]}
      />
      {circles.length > 0 && (
        <section className="stack" aria-label="Your circles">
          <h2>Your circles</h2>
          {circles.map((c) => (
            <Link key={c.id} href={`/circles/${c.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="request-head">
                <span className="request-who">{c.name}</span>
                {c.role === "leader" && <span className="badge badge-answered">Leader</span>}
              </div>
              <span className="muted">
                {c.member_count} {c.member_count === 1 ? "member" : "members"} · {c.request_count} {c.request_count === 1 ? "request" : "requests"}
              </span>
            </Link>
          ))}
        </section>
      )}
      <CircleForms />
    </div>
  );
}
