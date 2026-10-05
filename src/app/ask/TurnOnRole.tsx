"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfile } from "@/app/actions";

export function TurnOnRole() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="card stack">
      <h2>Would you like to ask for prayer?</h2>
      <p>Your account is set up for praying for others. Tap below to also share your own requests. You can change this any time in Settings.</p>
      <button className="btn btn-primary btn-big" disabled={busy} onClick={async () => { setBusy(true); await saveProfile({ is_requester: true }); router.refresh(); }}>
        Yes, let me ask for prayer
      </button>
    </div>
  );
}
