"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { submitRequest } from "@/app/actions";
import { FLAG_HELP, isCrisis, screenText, type Flag } from "@/lib/moderation";
import { CRISIS_LINES } from "@/lib/help";

type Done = { id: string; status: string; flags: string[] };

export function AskForm({ interests, firstName }: { interests: string[]; firstName: string }) {
  const [body, setBody] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [name, setName] = useState(firstName);
  const [place, setPlace] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const flags = useMemo(() => screenText(`${body} ${place} ${name}`), [body, place, name]);

  const toggle = (c: string) => setCats((list) => list.includes(c) ? list.filter((x) => x !== c) : list.length >= 3 ? list : [...list, c]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 10) { setError("Please write at least one full sentence so people know how to pray."); return; }
    setBusy(true); setError("");
    const res = await submitRequest({ body: body.trim(), categories: cats, displayName: name, place, anonymous, urgent });
    setBusy(false);
    if (res.ok && res.data) setDone(res.data); else if (!res.ok) setError(res.error);
  };

  if (done) {
    return (
      <div className="stack">
        {isCrisis(done.flags) && (
          <section className="notice notice-crisis" role="alert">
            <h2>We are praying for you. Please also reach out right now.</h2>
            <ul>{CRISIS_LINES.map((c) => <li key={c.name}><strong>{c.name}:</strong> <a href={c.href}>{c.how}</a></li>)}</ul>
          </section>
        )}
        <div className="card stack">
          <h2>{done.status === "held" ? "Thank you. Your request is waiting for a quick review." : "Your request is on the prayer feed"}</h2>
          <p>
            {done.status === "held"
              ? "It mentions contact details, a link, or money, so a person will check it before it appears. This protects everyone from scams."
              : "People are seeing it now. You can come back any time to see how many have prayed and to share a praise report."}
          </p>
          <div className="row">
            <Link href={`/r/${done.id}`} className="btn btn-primary">See my request</Link>
            <Link href="/me" className="btn">My Prayers</Link>
          </div>
        </div>
      </div>
    );
  }

  const warnings = flags.filter((f) => FLAG_HELP[f as Flag]);
  return (
    <form className="card stack-lg" onSubmit={submit} noValidate>
      <div className="field">
        <span className="step-label">Step 1 of 4</span>
        <label htmlFor="ask-body">What would you like prayer for?</label>
        <textarea id="ask-body" className="input" maxLength={600} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="For example: My husband has surgery on Thursday. Please pray for the doctors and for peace for our family." />
        <span className="hint">{body.length} of 600 letters. Please don’t include phone numbers, addresses, or other people’s private details.</span>
        {warnings.map((f) => <p key={f} className="tip" role="status">{FLAG_HELP[f as Flag]}</p>)}
      </div>

      <div className="field">
        <span className="step-label">Step 2 of 4</span>
        <span className="label" id="cats-label">What kind of need is it? Choose up to three.</span>
        <span className="hint">This is optional, but it helps people who care about this kind of need find you.</span>
        <div className="chips" role="group" aria-labelledby="cats-label">
          {interests.map((c) => (
            <button type="button" key={c} className="chip" aria-pressed={cats.includes(c)} onClick={() => toggle(c)}
              disabled={!cats.includes(c) && cats.length >= 3}>{c}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="step-label">Step 3 of 4</span>
        <span className="label">How should we show your name?</span>
        <label className="check">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <span>Keep me anonymous. My request will say “Anonymous”.</span>
        </label>
        {!anonymous && (
          <div className="field">
            <label htmlFor="ask-name">First name only</label>
            <input id="ask-name" className="input" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Maria" />
          </div>
        )}
        <div className="field">
          <label htmlFor="ask-place">General area (optional)</label>
          <input id="ask-place" className="input" maxLength={40} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="For example: Texas, USA" />
          <span className="hint">A state or country is enough. Never your street or town if you’d rather not.</span>
        </div>
      </div>

      <div className="field">
        <span className="step-label">Step 4 of 4</span>
        <label className="check">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          <span>This is urgent, like surgery today or a crisis right now.</span>
        </label>
        <button className="btn btn-primary btn-big" type="submit" disabled={busy}>{busy ? "Sharing…" : "Share my request"}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </form>
  );
}
