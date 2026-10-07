import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { ShowGuidesAgain } from "@/components/Guide";
import { DeleteAccount } from "./DeleteAccount";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await getViewer();
  if (!user || !profile) redirect("/login?next=/settings");
  const { data } = await supabase.from("interests").select("label").eq("status", "approved").order("label");
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <h1>Settings</h1>
      <ProfileForm profile={profile} interests={(data ?? []).map((i) => i.label)} mode="settings" />
      <section className="stack">
        <h2>Step-by-step guides</h2>
        <p className="muted">If you hid the gold “how this works” boxes, you can bring them back here.</p>
        <div><ShowGuidesAgain /></div>
      </section>
      <hr className="gold-rule" />
      <DeleteAccount />
    </div>
  );
}
