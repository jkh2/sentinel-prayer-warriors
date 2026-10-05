import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const { supabase, user, profile } = await getViewer();
  if (!user || !profile) redirect("/login");
  const sp = await searchParams;
  const { data } = await supabase.from("interests").select("label").eq("status", "approved").order("label");
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <div className="hero">
        <h1>Welcome{profile.first_name ? `, ${profile.first_name}` : ""}</h1>
        <p>Three quick questions and you’re ready. Nothing you choose here is shown to anyone else.</p>
      </div>
      <ProfileForm profile={profile} interests={(data ?? []).map((i) => i.label)} mode="welcome" next={typeof sp.next === "string" ? sp.next : undefined} />
    </div>
  );
}
