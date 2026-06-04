import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ImageOff, Store, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface StorefrontItem {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  condition: string;
  quantity: number;
  list_price: number | null;
  target_sell_price: number | null;
  public_notes: string | null;
  tcgplayer_url: string | null;
}

interface VendorStorefrontProps {
  vendorUserId: string;
  vendorId: string;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function VendorStorefront({ vendorUserId, vendorId }: VendorStorefrontProps) {
  const [items, setItems] = useState<StorefrontItem[]>([]);
  const [eventFeatured, setEventFeatured] = useState<Map<string, string[]>>(new Map()); // itemId -> event titles
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("public_deal_list_items" as any)
        .select(
          "id, card_name, set_name, card_number, rarity, image_url, condition, quantity, list_price, public_notes, tcgplayer_url",
        )
        .eq("user_id", vendorUserId)
        .order("listed_at", { ascending: false, nullsFirst: false })
        .limit(500);

      if (!error && data) {
        setItems(data as StorefrontItem[]);

        // Fetch event-featured tags for these items
        const ids = data.map((d: any) => d.id);
        if (ids.length > 0) {
          const { data: picks } = await supabase
            .from("vendor_event_inventory")
            .select("item_id, events:event_id(title)")
            .eq("vendor_id", vendorId)
            .in("item_id", ids);
          const m = new Map<string, string[]>();
          for (const p of (picks ?? []) as any[]) {
            const title = p.events?.title;
            if (!title) continue;
            if (!m.has(p.item_id)) m.set(p.item_id, []);
            m.get(p.item_id)!.push(title);
          }
          setEventFeatured(m);
        }
      }
      setLoading(false);
    })();
  }, [vendorUserId, vendorId]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (i) =>
          i.card_name.toLowerCase().includes(q) ||
          (i.set_name ?? "").toLowerCase().includes(q),
      )
    : items;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading inventory…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="py-16 text-center text-muted-foreground">
        <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No items listed yet</p>
        <p className="text-sm">This vendor hasn't put anything up for sale.</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inventory…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {items.length} item{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map((i) => {
          const price = i.list_price ?? i.target_sell_price;
          const events = eventFeatured.get(i.id);
          return (
            <Card key={i.id} className="overflow-hidden flex flex-col">
              <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                {i.image_url ? (
                  <img
                    src={i.image_url}
                    alt={i.card_name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="p-2.5 flex-1 flex flex-col gap-1">
                <p className="text-sm font-medium leading-tight line-clamp-2">{i.card_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[i.set_name, i.card_number && `#${i.card_number}`].filter(Boolean).join(" · ") || "—"}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    {i.condition.replace("_", " ")}
                  </Badge>
                  {i.quantity > 1 && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">×{i.quantity}</Badge>
                  )}
                </div>
                {events && events.length > 0 && (
                  <p className="text-[10px] text-primary mt-1 truncate" title={events.join(", ")}>
                    Featured at {events[0]}{events.length > 1 ? ` +${events.length - 1}` : ""}
                  </p>
                )}
                {i.public_notes && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{i.public_notes}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <p className="text-base font-bold">{price != null ? fmt(price) : "Ask"}</p>
                  {i.tcgplayer_url && (
                    <Link
                      to={i.tcgplayer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline text-muted-foreground hover:text-foreground"
                    >
                      TCGplayer
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
