"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveCircle, removeCircleMember, resetCircleInvite } from "@/app/actions";

export function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = () => `${location.origin}/circles/join/${code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link()); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <section className="card stack" aria-label="Invite people">
      <h2>Invite people</h2>
      <p className="muted">Send this link to people in your group. Anyone with the link can join, so share it only with them.</p>
      <p className="invite">/circles/join/{code}</p>
      <div className="row">
        <button className="btn btn-primary" onClick={copy}>{copied ? "Link copied ✓" : "Copy invitation link"}</button>
      </div>
    </section>
  );
}

export function CircleAdmin({ circleId, me, members }: {
  circleId: string; me: string; members: { user_id: string; first_name: string; role: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <section className="card stack" aria-label="Leader tools">
      <h2>Leader tools</h2>
      <p className="muted">Only leaders see this. Members never see each other’s names here.</p>
      <ul className="stack" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
        {members.map((m) => (
          <li key={m.user_id} className="row" style={{ justifyContent: "space-between" }}>
            <span>{m.first_name}{m.role === "leader" ? " (leader)" : ""}{m.user_id === me ? " (you)" : ""}</span>
            {m.user_id !== me && (confirm === m.user_id ? (
              <span className="row">
                <button className="btn" onClick={async () => {
                  const r = await removeCircleMember(circleId, m.user_id);
                  setConfirm(null);
                  if (r.ok) router.refresh(); else setMsg(r.error);
                }}>Yes, remove</button>
                <button className="btn btn-quiet" onClick={() => setConfirm(null)}>Cancel</button>
              </span>
            ) : (
              <button className="btn btn-quiet" onClick={() => setConfirm(m.user_id)}>Remove</button>
            ))}
          </li>
        ))}
      </ul>
      <div>
        <button className="btn" onClick={async () => {
          const r = await resetCircleInvite(circleId);
          if (r.ok) { setMsg("New invitation link made. The old link no longer works."); router.refresh(); } else setMsg(r.error);
        }}>Make a new invitation link</button>
      </div>
      <p className="small muted">Use this if the old link was shared too widely. People already in the circle stay in.</p>
      {msg && <p role="status">{msg}</p>}
    </section>
  );
}

export function LeaveCircle({ circleId, name }: { circleId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <div><button className="btn btn-quiet" onClick={() => setConfirm(true)}>Leave this circle</button></div>;
  return (
    <div className="row">
      <span>Leave {name}? You’ll need a new invitation to come back.</span>
      <button className="btn" onClick={async () => { const r = await leaveCircle(circleId); if (r.ok) router.push("/circles"); }}>Yes, leave</button>
      <button className="btn btn-quiet" onClick={() => setConfirm(false)}>Stay</button>
    </div>
  );
}
