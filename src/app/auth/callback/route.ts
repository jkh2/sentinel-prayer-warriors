import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google and Facebook send people back here after they sign in.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (!code) return NextResponse.redirect(new URL("/login?error=1", url.origin));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=1", url.origin));
  const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).single();
  const dest = profile?.onboarded ? safeNext : `/welcome?next=${encodeURIComponent(safeNext)}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
