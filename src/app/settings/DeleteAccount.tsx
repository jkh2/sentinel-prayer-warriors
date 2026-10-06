"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyAccount } from "@/app/actions";

export function DeleteAccount() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [error, setError] = useState("");
  const go = async () => {
    setStep("busy"); setError("");
    const r = await deleteMyAccount();
    if (r.ok) { router.push("/login?deleted=1"); router.refresh(); }
    else { setStep("confirm"); setError(r.error); }
  };
  return (
    <section className="stack" id="delete">
      <h2>Delete my account</h2>
      <p className="muted">This removes your account, your settings, your Watch hours and your circle memberships, and takes your requests off the feed. It can’t be undone.</p>
      {step === "idle" ? (
        <div><button className="btn" onClick={() => setStep("confirm")}>Delete my account…</button></div>
      ) : (
        <div className="notice notice-crisis">
          <strong>Are you sure? Everything will be deleted for good.</strong>
          <div className="row">
            <button className="btn" onClick={go} disabled={step === "busy"}>{step === "busy" ? "Deleting…" : "Yes, delete everything"}</button>
            <button className="btn btn-quiet" onClick={() => setStep("idle")} disabled={step === "busy"}>No, keep my account</button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
