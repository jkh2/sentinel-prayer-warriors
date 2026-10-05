"use client";
import { useRef, useState } from "react";
import { reportRequest } from "@/app/actions";

const REASONS = [
  { id: "scam", label: "It asks for money or looks like a scam" },
  { id: "personal-info", label: "It shares someone’s private details" },
  { id: "hateful", label: "It is hateful or mocking" },
  { id: "not-a-prayer", label: "It isn’t a prayer request (advertising, spam)" },
  { id: "crisis", label: "Someone may be in danger" },
  { id: "other", label: "Something else" },
];

export function ReportButton({ requestId }: { requestId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const send = async () => {
    const r = await reportRequest(requestId, reason);
    if (r.ok) { setSent(true); ref.current?.close(); } else setError(r.error);
  };
  if (sent) return <p className="muted">Thank you. A reviewer will look at this request.</p>;
  return (
    <>
      <button className="btn btn-quiet" style={{ justifySelf: "start" }} onClick={() => ref.current?.showModal()}>Report this request</button>
      <dialog ref={ref} aria-labelledby="report-title">
        <div className="stack">
          <h2 id="report-title">What’s wrong with this request?</h2>
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">Reason</legend>
            {REASONS.map((r) => (
              <label key={r.id} className="check">
                <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                {r.label}
              </label>
            ))}
          </fieldset>
          {reason === "crisis" && <p className="notice notice-crisis">If someone is in immediate danger, call 911 (or your local emergency number) now.</p>}
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn btn-primary" disabled={!reason} onClick={send}>Send report</button>
            <button className="btn btn-quiet" onClick={() => ref.current?.close()}>Cancel</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
