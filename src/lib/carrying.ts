import type { SupabaseClient } from "@supabase/supabase-js";
import type { Adoption } from "@/lib/types";
import { adoptionDay, todayIn } from "@/lib/watch";

export type Carrying = { id: string; who: string; body: string; day: number; daysPrayed: number; prayedToday: boolean };

/** People this warrior has adopted and is still carrying this week. */
export async function loadCarrying(supabase: SupabaseClient): Promise<Carrying[]> {
  const { data } = await supabase
    .from("adoptions")
    .select("request_id, timezone, started_on, days_prayed, prayer_requests(display_name, body, status)")
    .order("started_on", { ascending: false })
    .limit(20);
  type Row = Adoption & { prayer_requests: { display_name: string; body: string; status: string } | null };
  return ((data ?? []) as unknown as Row[]).flatMap((a) => {
    const today = todayIn(a.timezone);
    const day = adoptionDay(a.started_on, today);
    if (!day || a.prayer_requests?.status !== "published") return [];
    const who = a.prayer_requests.display_name;
    return [{ id: a.request_id, who: who === "Anonymous" ? "Someone anonymous" : who, body: a.prayer_requests.body, day, daysPrayed: a.days_prayed.length, prayedToday: a.days_prayed.includes(today) }];
  });
}
