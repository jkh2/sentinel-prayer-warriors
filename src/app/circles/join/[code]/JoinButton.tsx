"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinCircle } from "@/app/actions";

export function JoinButton({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="stack">
      <button className="btn btn-primary btn-big" disabled={busy} onClick={async () => {
        setBusy(true);
        const r = await joinCircle(code);
        if (r.ok && r.data) router.push(`/circles/${r.data}`); else { setBusy(false); if (!r.ok) setError(r.error); }
      }}>{busy ? "Joining…" : `Join ${name}`}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
