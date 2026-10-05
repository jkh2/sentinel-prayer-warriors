"use client";
import { useState } from "react";
import { moderate } from "@/app/actions";

export function ModerateButtons({ kind, id, published }: { kind: "request" | "update" | "interest"; id: string; published: boolean }) {
  const [state, setState] = useState("");
  const act = async (status: string, label: string) => {
    const r = await moderate(kind, id, status);
    setState(r.ok ? label : r.error);
  };
  if (state) return <p role="status" className="muted">{state}</p>;
  const yes = kind === "interest" ? "approved" : "published";
  const no = kind === "interest" ? "rejected" : "removed";
  return (
    <div className="row">
      <button className="btn btn-primary" onClick={() => act(yes, published ? "Kept on the feed." : "Approved.")}>{published ? "Keep it up" : "Approve"}</button>
      <button className="btn" onClick={() => act(no, "Removed.")}>Remove</button>
    </div>
  );
}
