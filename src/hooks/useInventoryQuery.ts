import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InventoryRow = {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  condition: string | null;
  quantity: number;
  purchase_price: number | null;
  target_sell_price: number | null;
  list_price: number | null;
  tcgplayer_market_price: number | null;
  image_url: string | null;
  state: string;
  listing_status: string | null;
  pipeline_status: string | null;
  lot_id: string | null;
  bought_at: string | null;
};

const KEY = ["inventory-on-hand"];

export function useInventory(userId: string | null) {
  return useQuery({
    queryKey: [...KEY, userId ?? ""],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<InventoryRow[]> => {
      const { data, error } = await supabase
        .from("v_inventory_state" as any)
        .select("*")
        .eq("user_id", userId)
        .in("state", ["on_hand", "listed"])
        .order("bought_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as InventoryRow[];
    },
  });
}

export function useInvalidateInventory() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

/** Fast barcode/id lookup with short cache. */
export async function lookupInventoryById(id: string): Promise<InventoryRow | null> {
  const { data, error } = await supabase
    .from("v_inventory_state" as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as InventoryRow) ?? null;
}
