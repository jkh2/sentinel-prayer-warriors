"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeCircleRequest } from "@/app/actions";

export function CircleLeaderRemove({ requestId, circleId }: { requestId: string; circleId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div className="row">
      {confirm ? (
        <>
          <span>As circle leader, remove this request from your circle?</span>
          <button className="btn" onClick={async () => {
            const r = await removeCircleRequest(requestId, circleId);
            if (r.ok) router.push(`/circles/${circleId}`); else setMsg(r.error);
          }}>Yes, remove it</button>
          <button className="btn btn-quiet" onClick={() => setConfirm(false)}>Keep it</button>
        </>
      ) : (
        <button className="btn btn-quiet" onClick={() => setConfirm(true)}>Remove from circle (leaders only)</button>
      )}
      {msg && <p className="error" role="alert">{msg}</p>}
    </div>
  );
}
