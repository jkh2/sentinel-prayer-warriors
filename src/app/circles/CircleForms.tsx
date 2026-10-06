"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCircle, joinCircle } from "@/app/actions";

// Invitation links look like https://…/circles/join/abc123…; people may paste the whole link or just the code.
const codeFrom = (text: string) => text.trim().split("/").filter(Boolean).pop() ?? "";

export function CircleForms() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const res = await createCircle(name.trim());
    setBusy(false);
    if (res.ok && res.data) router.push(`/circles/${res.data}`); else if (!res.ok) setMsg(res.error);
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    const res = await joinCircle(codeFrom(code));
    setBusy(false);
    if (res.ok && res.data) router.push(`/circles/${res.data}`); else if (!res.ok) setMsg(res.error);
  };

  return (
    <div className="stack-lg">
      <form className="card stack" onSubmit={create}>
        <h2>Start a new circle</h2>
        <div className="field">
          <label htmlFor="circle-name">Circle name</label>
          <input id="circle-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Grace Chapel Tuesday Group" />
        </div>
        <div><button className="btn btn-primary" type="submit" disabled={busy || name.trim().length < 3}>Start my circle</button></div>
      </form>
      <form className="card stack" onSubmit={join}>
        <h2>Join a circle</h2>
        <p className="muted">Usually you just tap the invitation link someone sent you. If you can’t, paste it here.</p>
        <div className="field">
          <label htmlFor="circle-code">Invitation link or code</label>
          <input id="circle-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the link here" />
        </div>
        <div><button className="btn" type="submit" disabled={busy || codeFrom(code).length < 6}>Join</button></div>
      </form>
      {msg && <p className="error" role="alert">{msg}</p>}
    </div>
  );
}
