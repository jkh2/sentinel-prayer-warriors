"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { prayFor } from "@/app/actions";
import { CheckIcon } from "@/components/icons";

const SECONDS = 60;
const C = 2 * Math.PI * 52;

export function PrayPanel({ requestId, who, verse, signedIn, alreadyPrayed }: {
  requestId: string; who: string; verse: { text: string; ref: string }; signedIn: boolean; alreadyPrayed: boolean;
}) {
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState(alreadyPrayed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const name = who === "Anonymous" ? "this person" : who;

  const amen = async () => {
    setBusy(true); setError("");
    const res = await prayFor(requestId);
    setBusy(false);
    if (res.ok) setDone(true); else setError(res.error);
  };

  return (
    <section className="card" aria-label="Pray">
      <blockquote className="verse" style={{ margin: 0 }}>
        “{verse.text}”<cite>{verse.ref}</cite>
      </blockquote>
      {done ? (
        <div className="stack">
          <p className="row" style={{ color: "var(--prayed)", fontWeight: 700, fontSize: "1.15rem" }}>
            <CheckIcon size={28} /> Thank you. {name === "this person" ? "They" : name} will see that you prayed.
          </p>
          <div className="row">
            <Link href="/three" className="btn btn-primary">Pray for someone else</Link>
            <Link href="/" className="btn">Back to the feed</Link>
          </div>
        </div>
      ) : !signedIn ? (
        <div className="stack">
          <p>You can pray for {name} right now. To let them know someone prayed, sign in first.</p>
          <Link href={`/login?next=/r/${requestId}`} className="btn btn-primary btn-big">Sign in to count my prayer</Link>
        </div>
      ) : (
        <div className="stack">
          {left === null ? (
            <button className="btn btn-big btn-block" onClick={() => setLeft(SECONDS)}>Begin praying for {name}</button>
          ) : (
            <div className="timer" aria-live="polite">
              <svg viewBox="0 0 120 120" role="img" aria-label={left > 0 ? `${left} seconds of a one-minute prayer left` : "Minute complete"}>
                <circle className="track" cx="60" cy="60" r="52" />
                <circle className="progress" cx="60" cy="60" r="52" strokeDasharray={C} strokeDashoffset={C * (left / SECONDS)} />
                <text x="60" y="68" textAnchor="middle" fontSize="24" fill="currentColor">{left > 0 ? left : "Amen"}</text>
              </svg>
              <p className="muted">{left > 0 ? `Take this minute to lift ${name} to the Lord.` : "Pray as long as you like, then tap the button below."}</p>
            </div>
          )}
          <button className="btn btn-primary btn-big btn-block" onClick={amen} disabled={busy}>
            {busy ? "Saving…" : "Amen, I prayed"}
          </button>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
