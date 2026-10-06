"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adoptRequest, prayFor } from "@/app/actions";
import { CheckIcon } from "@/components/icons";
import { browserTimeZone } from "@/lib/useNow";

const SECONDS = 60;
const C = 2 * Math.PI * 52;

// While someone has adopted a request, "done" means prayed today rather than prayed ever.
export type AdoptionState = { day: number; daysPrayed: number; prayedToday: boolean } | null;

export function PrayPanel({ requestId, who, verse, signedIn, alreadyPrayed, adoption }: {
  requestId: string; who: string; verse: { text: string; ref: string }; signedIn: boolean; alreadyPrayed: boolean; adoption: AdoptionState;
}) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState(adoption ? adoption.prayedToday : alreadyPrayed);
  const [adopting, setAdopting] = useState(false);
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
    if (res.ok) { setDone(true); if (adoption) router.refresh(); } else setError(res.error);
  };

  const adopt = async () => {
    setAdopting(true); setError("");
    const res = await adoptRequest(requestId, browserTimeZone());
    setAdopting(false);
    if (res.ok) { setDone(true); router.refresh(); } else setError(res.error);
  };

  const adoptOffer = signedIn && !adoption && (
    <div className="notice notice-info">
      <strong>Carry {name} for a whole week?</strong>
      <span>Promise to pray for {name === "this person" ? "them" : name} once a day for 7 days. We’ll remind you on your My Prayers page, and they’ll know someone is with them all week.</span>
      <div><button className="btn" onClick={adopt} disabled={adopting}>{adopting ? "Saving…" : `Pray for ${name} every day this week`}</button></div>
    </div>
  );
  const week = adoption && (
    <div className="stack" style={{ gap: 8 }}>
      <strong>You are carrying {name} this week. Day {adoption.day} of 7.</strong>
      <div className="progress-dots" aria-label={`Prayed on ${adoption.daysPrayed} of 7 days`}>
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} className={`${i < adoption.daysPrayed ? "done" : ""}${i === adoption.day - 1 ? " today" : ""}`} />
        ))}
      </div>
    </div>
  );

  return (
    <section className="card" aria-label="Pray">
      <blockquote className="verse" style={{ margin: 0 }}>
        “{verse.text}”<cite>{verse.ref}</cite>
      </blockquote>
      {week}
      {done ? (
        <div className="stack">
          <p className="row" style={{ color: "var(--prayed)", fontWeight: 700, fontSize: "1.15rem" }}>
            <CheckIcon size={28} /> {adoption ? (adoption.day >= 7 ? "That was day 7. Thank you for carrying them all week." : `Thank you for praying today. Come back tomorrow for day ${adoption.day + 1}.`) : `Thank you. ${name === "this person" ? "They" : name} will see that you prayed.`}
          </p>
          {adoptOffer}
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
            {busy ? "Saving…" : adoption ? `Amen, I prayed today` : "Amen, I prayed"}
          </button>
          {adoptOffer}
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
