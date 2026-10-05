"use client";
import { useState } from "react";
import { useStoredValue, writeStoredValue } from "@/lib/useStoredValue";

const KEY = "spw-hidden-guides";
const parse = (raw: string | null): string[] => { try { return JSON.parse(raw || "[]"); } catch { return []; } };

// Numbered "how this works" steps for first-time and less technical visitors.
// Each guide can be hidden on its own; Settings brings them all back.
export function Guide({ id, title, steps }: { id: string; title: string; steps: React.ReactNode[] }) {
  const raw = useStoredValue("local", KEY);
  if (parse(raw).includes(id)) return null;
  const hide = () => writeStoredValue("local", KEY, JSON.stringify([...new Set([...parse(raw), id])]));
  return (
    <section className="guide" aria-label={title}>
      <h2>{title}</h2>
      <ol>{steps.map((s, i) => <li key={i}><span>{s}</span></li>)}</ol>
      <div><button className="btn btn-quiet" onClick={hide}>I understand, hide these steps</button></div>
    </section>
  );
}

export function ShowGuidesAgain() {
  const [done, setDone] = useState(false);
  return (
    <button className="btn" onClick={() => { writeStoredValue("local", KEY, null); setDone(true); }}>
      {done ? "Step-by-step guides are back on" : "Show the step-by-step guides again"}
    </button>
  );
}
