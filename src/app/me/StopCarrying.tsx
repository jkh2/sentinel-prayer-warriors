"use client";
import { useState } from "react";
import { endAdoption } from "@/app/actions";

export function StopCarrying({ requestId }: { requestId: string }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button className="btn btn-quiet" onClick={() => setConfirm(true)}>Stop carrying</button>;
  return (
    <span className="row">
      <span className="small">Stop your daily prayers for them?</span>
      <button className="btn" onClick={() => endAdoption(requestId)}>Yes, stop</button>
      <button className="btn btn-quiet" onClick={() => setConfirm(false)}>Keep going</button>
    </span>
  );
}
