"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (e: { message?: string } | null): { ok: false; error: string } => ({
  ok: false,
  error: e?.message || "Something went wrong. Please try again.",
});

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function submitRequest(input: {
  body: string; categories: string[]; displayName: string; place: string; anonymous: boolean; urgent: boolean;
}): Promise<Result<{ id: string; status: string; flags: string[] }>> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: "Please sign in first." };
  const { data, error } = await supabase.rpc("submit_request", {
    p_body: input.body, p_categories: input.categories.slice(0, 3), p_display_name: input.displayName,
    p_place: input.place, p_is_anonymous: input.anonymous, p_is_urgent: input.urgent,
  }).single<{ id: string; status: string; flags: string[] }>();
  if (error || !data) return fail(error);
  revalidatePath("/");
  return { ok: true, data };
}

export async function prayFor(requestId: string): Promise<Result<number>> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: "Please sign in so your prayer can be counted." };
  const { data, error } = await supabase.rpc("pray_for", { p_request: requestId });
  if (error) return fail(error);
  return { ok: true, data: data as number };
}

export async function postUpdate(requestId: string, kind: "update" | "praise", body: string): Promise<Result<string>> {
  const { supabase } = await signedIn();
  const { data, error } = await supabase.rpc("post_update", { p_request: requestId, p_kind: kind, p_body: body });
  if (error) return fail(error);
  revalidatePath(`/r/${requestId}`);
  return { ok: true, data: data as string };
}

export async function removeMyRequest(requestId: string): Promise<Result> {
  const { supabase } = await signedIn();
  const { error } = await supabase.rpc("remove_my_request", { p_request: requestId });
  if (error) return fail(error);
  revalidatePath("/");
  revalidatePath("/me");
  return { ok: true };
}

export async function reportRequest(requestId: string, reason: string): Promise<Result> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: "Please sign in to report a request." };
  const { error } = await supabase.rpc("report_request", { p_request: requestId, p_reason: reason });
  return error ? fail(error) : { ok: true };
}

export async function saveProfile(patch: {
  first_name?: string | null; is_warrior?: boolean; is_requester?: boolean; onboarded?: boolean;
  interests?: string[]; lived_experience?: string[]; three_mix?: number;
}): Promise<Result> {
  const { supabase, user } = await signedIn();
  if (!user) return { ok: false, error: "Please sign in first." };
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function suggestInterest(label: string): Promise<Result> {
  const { supabase } = await signedIn();
  const { error } = await supabase.rpc("suggest_interest", { p_label: label });
  return error ? fail(error) : { ok: true };
}

export async function moderate(kind: "request" | "update" | "interest", id: string, status: string): Promise<Result> {
  const { supabase } = await signedIn();
  const fn = { request: "moderate_request", update: "moderate_update", interest: "moderate_interest" }[kind];
  const arg = kind === "request" ? { p_request: id, p_status: status } : kind === "update" ? { p_update: id, p_status: status } : { p_slug: id, p_status: status };
  const { error } = await supabase.rpc(fn, arg);
  if (error) return fail(error);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}
