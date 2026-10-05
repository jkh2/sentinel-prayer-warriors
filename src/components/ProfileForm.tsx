"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile, suggestInterest } from "@/app/actions";
import type { Profile } from "@/lib/types";

// Used for first-time setup (/welcome) and later changes (/settings).
export function ProfileForm({ profile, interests, mode, next }: {
  profile: Profile; interests: string[]; mode: "welcome" | "settings"; next?: string;
}) {
  const router = useRouter();
  const [warrior, setWarrior] = useState(mode === "welcome" ? true : profile.is_warrior);
  const [requester, setRequester] = useState(mode === "welcome" ? true : profile.is_requester);
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [mine, setMine] = useState<string[]>(profile.interests);
  const [lived, setLived] = useState<string[]>(profile.lived_experience);
  const [suggestion, setSuggestion] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const flip = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = async () => {
    if (!warrior && !requester) { setMsg("Choose at least one: praying for others, or asking for prayer."); return; }
    setBusy(true);
    const res = await saveProfile({ first_name: firstName.trim() || null, is_warrior: warrior, is_requester: requester, interests: mine, lived_experience: lived, onboarded: true });
    setBusy(false);
    if (!res.ok) { setMsg(res.error); return; }
    if (mode === "welcome") router.push(next && next !== "/" ? next : warrior ? "/three" : "/ask");
    else { setMsg("Saved."); router.refresh(); }
  };

  const suggest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await suggestInterest(suggestion.trim());
    setMsg(res.ok ? `Thank you. “${suggestion.trim()}” will be added after a quick review.` : res.error);
    if (res.ok) setSuggestion("");
  };

  return (
    <div className="stack-lg">
      <section className="stack">
        <span className="step-label">{mode === "welcome" ? "Step 1 of 3" : "Your role"}</span>
        <h2>How would you like to take part?</h2>
        <p className="muted">Choose one or both. You can change this later.</p>
        <div className="choice-grid">
          <button type="button" className="choice" aria-pressed={warrior} onClick={() => setWarrior(!warrior)}>
            <strong>{warrior ? "✓ " : ""}I want to pray for others</strong>
            <span className="muted">Become a prayer warrior. See requests and pray for people by name.</span>
          </button>
          <button type="button" className="choice" aria-pressed={requester} onClick={() => setRequester(!requester)}>
            <strong>{requester ? "✓ " : ""}I need prayer</strong>
            <span className="muted">Share your own prayer requests, by first name or anonymously.</span>
          </button>
        </div>
        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="first-name">Your first name</label>
          <input id="first-name" className="input" maxLength={30} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <span className="hint">Shown only on requests you choose to share with your name.</span>
        </div>
      </section>

      {warrior && (
        <>
          <section className="stack">
            <span className="step-label">{mode === "welcome" ? "Step 2 of 3" : "Your interests"}</span>
            <h2>What needs are on your heart?</h2>
            <p className="muted">Tap every kind of need you feel called to pray for. Your “My Three” people will lean toward these. Leave them all off to get anyone at random.</p>
            <div className="chips" role="group" aria-label="Prayer interests">
              {interests.map((c) => <button type="button" key={c} className="chip" aria-pressed={mine.includes(c)} onClick={() => flip(mine, setMine, c)}>{c}</button>)}
            </div>
          </section>
          <section className="stack">
            <span className="step-label">{mode === "welcome" ? "Step 3 of 3 (optional)" : "What you have walked through"}</span>
            <h2>Have you walked through any of these yourself?</h2>
            <p className="muted">If you have survived cancer, lost a loved one, or come through addiction, you may pray for others in that valley with special understanding. This is private and never shown to anyone. It only helps match you.</p>
            <div className="chips" role="group" aria-label="Lived experience">
              {interests.map((c) => <button type="button" key={c} className="chip" aria-pressed={lived.includes(c)} onClick={() => flip(lived, setLived, c)}>{c}</button>)}
            </div>
          </section>
        </>
      )}

      <div className="stack">
        <button className="btn btn-primary btn-big" onClick={save} disabled={busy}>
          {busy ? "Saving…" : mode === "welcome" ? "Finish and start" : "Save my settings"}
        </button>
        {msg && <p role="status">{msg}</p>}
      </div>

      {mode === "settings" && (
        <section className="stack">
          <h2>Suggest a new kind of need</h2>
          <p className="muted">Don’t see a need you care about? Suggest it. After a quick review, everyone can use it.</p>
          <form className="row" onSubmit={suggest}>
            <label htmlFor="suggest" className="sr-only">New interest</label>
            <input id="suggest" className="input" style={{ flex: "1 1 220px", width: "auto" }} maxLength={32} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="For example: Foster families" />
            <button className="btn" type="submit" disabled={suggestion.trim().length < 3}>Suggest it</button>
          </form>
        </section>
      )}
    </div>
  );
}
