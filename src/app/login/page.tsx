import type { Metadata } from "next";
import { FACEBOOK_ON } from "@/lib/facebook";
import { SignInButtons } from "./SignInButtons";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="stack-lg" style={{ maxWidth: 560 }}>
      <div className="hero">
        <h1>Sign in to pray and ask for prayer</h1>
        <p>Use the {FACEBOOK_ON ? "Google or Facebook" : "Google"} account you already have. There is no new password to remember.</p>
      </div>
      {sp.deleted && <p className="tip" role="status">Your account has been deleted.</p>}
      {sp.error && <p className="error" role="alert">Sign-in didn’t finish. Please try again.</p>}
      <SignInButtons next={next} />
      <div className="notice notice-info">
        <h3>What we use, and what we don’t</h3>
        <ul>
          <li>We only use your account to know it’s really you.</li>
          <li>We never post anything to {FACEBOOK_ON ? "Google or Facebook" : "Google"}.</li>
          <li>Your full name and email are never shown to anyone. Requests show only a first name, or “Anonymous” if you choose.</li>
          <li>Read our <a href="/privacy">privacy promise</a>.</li>
        </ul>
      </div>
      <p className="muted">You don’t need to sign in to read the prayer feed. You only need it to pray for someone or to ask for prayer.</p>
    </div>
  );
}
