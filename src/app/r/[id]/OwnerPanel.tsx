"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postUpdate, removeMyRequest } from "@/app/actions";

export function OwnerPanel({ requestId, answered }: { requestId: string; answered: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<"update" | "praise">(answered ? "update" : "praise");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 3) { setMsg("Write a few words first."); return; }
    const res = await postUpdate(requestId, kind, body.trim());
    if (!res.ok) { setMsg(res.error); return; }
    setBody("");
    setMsg(res.data === "held" ? "Thank you. Your update will appear after a quick review." : "Shared. Everyone who prayed for you will see it.");
    router.refresh();
  };

  return (
    <section className="card stack" aria-label="Share an update">
      <h2>Tell the people who prayed</h2>
      <p className="muted">Everyone who prayed for you will see this. A praise report also marks your prayer as answered.</p>
      <form className="stack" onSubmit={send}>
        <div className="choice-grid">
          <button type="button" className="choice" aria-pressed={kind === "praise"} onClick={() => setKind("praise")}>
            <strong>Praise report</strong><span className="muted">God answered. Share the good news.</span>
          </button>
          <button type="button" className="choice" aria-pressed={kind === "update"} onClick={() => setKind("update")}>
            <strong>Update</strong><span className="muted">Things changed, or you need more prayer.</span>
          </button>
        </div>
        <div className="field">
          <label htmlFor="update-body">{kind === "praise" ? "What did God do?" : "What’s new?"}</label>
          <textarea id="update-body" className="input" maxLength={400} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-big" type="submit">Share {kind === "praise" ? "praise report" : "update"}</button>
        {msg && <p role="status">{msg}</p>}
      </form>
      <div className="row">
        {confirmRemove ? (
          <>
            <span>Remove this request from the feed for good?</span>
            <button className="btn" onClick={async () => { const r = await removeMyRequest(requestId); if (r.ok) router.push("/me"); else setMsg(r.error); }}>Yes, remove it</button>
            <button className="btn btn-quiet" onClick={() => setConfirmRemove(false)}>Keep it</button>
          </>
        ) : (
          <button className="btn btn-quiet" onClick={() => setConfirmRemove(true)}>Remove my request</button>
        )}
      </div>
    </section>
  );
}
