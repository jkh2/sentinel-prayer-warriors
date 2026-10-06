"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setWatchHour } from "@/app/actions";
import { browserTimeZone, useNow } from "@/lib/useNow";
import { DAYS, coverageForDay, hourLabel, hourRange, isMyHourNow, slotToUtcHour, utcHourOfWeek } from "@/lib/watch";

type Slot = { dow: number; hour: number };

export function WatchBoard({ coverage, mine: initialMine, signedIn, isWarrior }: {
  coverage: { utc_hour: number; warriors: number }[]; mine: Slot[]; signedIn: boolean; isWarrior: boolean;
}) {
  const router = useRouter();
  const now = useNow();
  const [mine, setMine] = useState<Slot[]>(initialMine);
  const [counts, setCounts] = useState(coverage);
  const [day, setDay] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  if (!now) return <p className="muted">Finding your local time…</p>;
  const shownDay = day ?? now.getDay();
  const hours = coverageForDay(counts, shownDay, now);
  const onNow = counts.find((c) => c.utc_hour === utcHourOfWeek(now))?.warriors ?? 0;
  const myNow = isMyHourNow(mine, now);
  const emptyThisWeek = Array.from({ length: 7 }, (_, d) => coverageForDay(counts, d, now).filter((n) => n === 0).length).reduce((a, b) => a + b, 0);
  const isMine = (hour: number) => mine.some((m) => m.dow === shownDay && m.hour === hour);

  const toggle = async (hour: number) => {
    if (!signedIn) { router.push("/login?next=/watch"); return; }
    const on = !isMine(hour);
    const key = `${shownDay}-${hour}`;
    setBusy(key); setMsg("");
    const res = await setWatchHour(shownDay, hour, on, browserTimeZone());
    setBusy(null);
    if (!res.ok) { setMsg(res.error); return; }
    const utc = slotToUtcHour(shownDay, hour, now);
    setMine((m) => on ? [...m, { dow: shownDay, hour }] : m.filter((x) => !(x.dow === shownDay && x.hour === hour)));
    setCounts((c) => {
      const found = c.find((x) => x.utc_hour === utc);
      if (found) return c.map((x) => x.utc_hour === utc ? { ...x, warriors: Math.max(0, x.warriors + (on ? 1 : -1)) } : x);
      return on ? [...c, { utc_hour: utc, warriors: 1 }] : c;
    });
    setMsg(on ? `Thank you. ${DAYS[shownDay]}s from ${hourRange(hour)} are now your hour.` : `You gave back ${DAYS[shownDay]} ${hourRange(hour)}.`);
  };

  return (
    <div className="stack-lg">
      {myNow && (
        <section className="notice notice-help" aria-live="polite">
          <h2>You are on watch right now</h2>
          <p>Thank you for keeping this hour. Start with the people no one has prayed for yet.</p>
          <div className="row">
            <Link href="/three" className="btn btn-primary">Give me three people</Link>
            <Link href="/" className="btn">Open the live feed</Link>
          </div>
        </section>
      )}

      <section className="card watch-now">
        <span className="big">{onNow}</span>
        <div>
          <strong>{onNow === 1 ? "warrior is" : "warriors are"} keeping watch this hour</strong>
          <p className="muted small">{emptyThisWeek === 0 ? "Every hour this week has someone praying. Praise God!" : `${emptyThisWeek} of 168 hours this week still need someone.`}</p>
        </div>
      </section>

      {signedIn && !isWarrior && (
        <p className="tip">To keep watch, turn on “I want to pray for others” in <Link href="/settings">Settings</Link>.</p>
      )}

      <section className="stack" aria-label="Choose your hours">
        <h2>Choose a day</h2>
        <div className="chips" role="group" aria-label="Day">
          {DAYS.map((d, i) => (
            <button key={d} className="chip" aria-pressed={i === shownDay} onClick={() => setDay(i)}>
              {i === now.getDay() ? `Today (${d})` : d}
            </button>
          ))}
        </div>
        <div className="day-bar" aria-hidden="true">
          {hours.map((n, h) => <i key={h} className={`${n >= 3 ? "c3" : n === 2 ? "c2" : n === 1 ? "c1" : ""}${shownDay === now.getDay() && h === now.getHours() ? " now" : ""}`} />)}
        </div>
        <p className="small muted">Times are shown in your own time zone. Brighter gold means more warriors.</p>
        <div className="hour-grid">
          {hours.map((n, h) => {
            const mineHere = isMine(h);
            const isNow = shownDay === now.getDay() && h === now.getHours();
            return (
              <button key={h} className={`hour${n === 0 ? " empty-hour" : " covered"}${isNow ? " now" : ""}`} aria-pressed={mineHere}
                disabled={busy !== null || (signedIn && !isWarrior)} onClick={() => toggle(h)}
                aria-label={`${DAYS[shownDay]} ${hourRange(h)}. ${n === 0 ? "No one yet" : `${n} keeping watch`}.${mineHere ? " This is your hour." : ""}`}>
                <strong>{hourLabel(h)}</strong>
                <span>{busy === `${shownDay}-${h}` ? "Saving…" : mineHere ? "✓ Your hour" : n === 0 ? "No one yet" : `${n} keeping watch`}</span>
              </button>
            );
          })}
        </div>
        {msg && <p role="status">{msg}</p>}
      </section>

      {mine.length > 0 && (
        <section className="stack">
          <h2>Your hours each week</h2>
          <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
            {[...mine].sort((a, b) => a.dow - b.dow || a.hour - b.hour).map((m) => (
              <li key={`${m.dow}-${m.hour}`}>{DAYS[m.dow]}, {hourRange(m.hour)}</li>
            ))}
          </ul>
        </section>
      )}
      {!signedIn && (
        <div className="notice notice-info">
          <p>Anyone can see the Watch. <Link href="/login?next=/watch">Sign in</Link> to keep an hour yourself.</p>
        </div>
      )}
    </div>
  );
}
