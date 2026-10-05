"use client";
import { useEffect, useMemo, useState } from "react";
import { useStoredValue, writeStoredValue } from "@/lib/useStoredValue";
import Link from "next/link";
import { pickThree } from "@/lib/myThree";
import type { PrayerRequest } from "@/lib/types";
import { RequestCard } from "@/components/RequestCard";
import { saveProfile } from "@/app/actions";

const KEY = "spw-three";

export function MyThree({ pool, prayed, interests, lived, mix: initialMix }: {
  pool: PrayerRequest[]; prayed: string[]; interests: string[]; lived: string[]; mix: number;
}) {
  const prayedSet = useMemo(() => new Set(prayed), [prayed]);
  const byId = useMemo(() => new Map(pool.map((r) => [r.id, r])), [pool]);
  const [mix, setMix] = useState(initialMix);
  const raw = useStoredValue("session", KEY);
  const picks = useMemo(() => {
    try { return (JSON.parse(raw ?? "null") as { id: string; reason: string }[] | null)?.filter((p) => byId.has(p.id)) ?? null; }
    catch { return null; }
  }, [raw, byId]);

  const draw = (m = mix) => {
    const next = pickThree(pool, { interests, lived, mix: m, prayedIds: prayedSet }).map((p) => ({ id: p.request.id, reason: p.reason }));
    writeStoredValue("session", KEY, JSON.stringify(next));
  };

  // Keep the same three while someone goes off to pray and comes back; draw only when none are saved.
  useEffect(() => {
    if (!picks || (picks.length === 0 && pool.length > 0 && raw === null)) draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks]);

  const saveMix = async (v: number) => { setMix(v); await saveProfile({ three_mix: v }); };
  const matches = useMemo(() => new Set([...interests, ...lived]), [interests, lived]);
  const allDone = !!picks?.length && picks.every((p) => prayedSet.has(p.id));

  return (
    <div className="stack-lg">
      <div className="card stack">
        <label htmlFor="mix" style={{ fontWeight: 700 }}>How closely should we follow your interests?</label>
        <input id="mix" type="range" min={0} max={100} step={10} value={mix}
          onChange={(e) => setMix(+e.target.value)} onMouseUp={(e) => saveMix(+(e.target as HTMLInputElement).value)}
          onTouchEnd={(e) => saveMix(+(e.target as HTMLInputElement).value)} onKeyUp={(e) => saveMix(+(e.target as HTMLInputElement).value)} />
        <div className="row small muted" style={{ justifyContent: "space-between" }}><span>Anyone at random</span><span>Only my interests</span></div>
        {interests.length + lived.length === 0 && (
          <p className="tip">You haven’t chosen any interests yet, so everyone is chosen at random. <Link href="/settings">Choose interests</Link></p>
        )}
        <button className="btn btn-primary" onClick={() => draw()}>Choose three new people</button>
      </div>
      {allDone && (
        <div className="notice notice-help">
          <h2>All three carried. Well done, faithful warrior.</h2>
          <p>If you have more time today, choose three more.</p>
        </div>
      )}
      {picks && picks.length === 0 ? (
        <div className="empty">
          <h2>You have prayed for everyone right now</h2>
          <p>New requests arrive all the time. Check the live feed or come back later.</p>
          <Link href="/" className="btn">Open the live feed</Link>
        </div>
      ) : (
        <div className="three-grid">
          {(picks ?? []).map((p, i) => {
            const r = byId.get(p.id);
            if (!r) return null;
            return (
              <div key={p.id} className="stack">
                <span className="num" aria-hidden="true">{i + 1}</span>
                <RequestCard r={r} matches={matches} prayed={prayedSet.has(r.id)} extra={<p className="small muted">{p.reason}</p>} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
