import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { JoinButton } from "./JoinButton";

export const metadata: Metadata = { title: "Join a circle" };

export default async function JoinPage({ params }: PageProps<"/circles/join/[code]">) {
  const { code } = await params;
  const { supabase, user } = await getViewer();
  const { data } = await supabase.rpc("circle_preview", { p_code: code });
  const circle = (data as { id: string; name: string; member_count: number; is_member: boolean }[] | null)?.[0];
  if (circle?.is_member) redirect(`/circles/${circle.id}`);
  return (
    <div className="card stack-lg" style={{ maxWidth: 600 }}>
      {!circle ? (
        <>
          <h1>This invitation isn’t working</h1>
          <p>The link may be old or mistyped. Ask the person who invited you for a new one.</p>
          <Link href="/" className="btn">Go to the prayer feed</Link>
        </>
      ) : (
        <>
          <div className="hero">
            <h1>You’re invited to {circle.name}</h1>
            <p>A private prayer circle with {circle.member_count} {circle.member_count === 1 ? "member" : "members"}. Members pray for each other’s requests, which only the circle can see.</p>
          </div>
          {user ? <JoinButton code={code} name={circle.name} /> : (
            <Link href={`/login?next=/circles/join/${code}`} className="btn btn-primary btn-big">Sign in to join</Link>
          )}
        </>
      )}
    </div>
  );
}
