import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, ExternalLink, Loader2, Library, ScanLine, ImageOff } from "lucide-react";

interface DealItem {
  id: string;
  game: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  tcgplayer_market_price: number | null;
  tcgplayer_url: string | null;
  ebay_search_url: string | null;
  quantity: number;
  condition: string;
  notes: string | null;
  created_at: string;
  /** Manual per-card price entered by the user. When non-null, wins over the condition-adjusted market price. */
  price_override: number | null;
}

// TCGplayer-style conditions. The DB enum value is on the left, the user-facing label and
// price multiplier (vs. Near Mint market) are derived from typical TCGplayer condition discounts.
const CONDITION_OPTIONS: Array<{ value: string; label: string; multiplier: number }> = [
  { value: "near_mint", label: "Near Mint", multiplier: 1.0 },
  { value: "light_play", label: "Lightly Played", multiplier: 0.85 },
  { value: "moderate_play", label: "Moderately Played", multiplier: 0.65 },
  { value: "heavy_play", label: "Heavily Played", multiplier: 0.45 },
  { value: "damaged", label: "Damaged", multiplier: 0.3 },
];

const CONDITION_MULTIPLIERS: Record<string, number> = Object.fromEntries(
  CONDITION_OPTIONS.map((c) => [c.value, c.multiplier]),
);

const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITION_OPTIONS.map((c) => [c.value, c.label]),
);

/** Treat the stored TCGplayer market price as the Near Mint baseline and scale by condition. */
const adjustedPrice = (nmPrice: number | null, condition: string): number | null => {
  if (nmPrice == null) return null;
  const mult = CONDITION_MULTIPLIERS[condition] ?? 1;
  return Math.round(nmPrice * mult * 100) / 100;
};

/** The per-card price actually used for totals: manual override (if set) > condition-adjusted market. */
const effectivePrice = (item: DealItem): number | null =>
  item.price_override ?? adjustedPrice(item.tcgplayer_market_price, item.condition);

const DealList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<{ id: string; name: string; category: string }[]>([]);
  const [targetCollection, setTargetCollection] = useState<string>("");
  const [savingAll, setSavingAll] = useState(false);
  /** Buy-side cost target as a % of total market value (e.g. 60 = pay 60% of comps). Persists locally. */
  const [costPct, setCostPct] = useState<number>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("dealList:costPct") : null;
    const parsed = stored ? parseFloat(stored) : NaN;
    return Number.isFinite(parsed) ? parsed : 60;
  });
  /** Track which row's price is being inline-edited and its draft string value. */
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dealList:costPct", String(costPct));
    }
  }, [costPct]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [itemsRes, colsRes] = await Promise.all([
        supabase.from("deal_list_items").select("*").order("created_at", { ascending: false }),
        supabase.from("collections").select("id, name, category").order("created_at", { ascending: false }),
      ]);
      if (itemsRes.error) toast({ title: "Failed to load", description: itemsRes.error.message, variant: "destructive" });
      else {
        // Map legacy non-TCGplayer condition values to the closest TCGplayer-style equivalent
        // so the Select always reflects a valid option.
        const legacyMap: Record<string, string> = {
          mint: "near_mint",
          excellent: "light_play",
          good: "moderate_play",
        };
        const normalized = (itemsRes.data as DealItem[]).map((it) => ({
          ...it,
          condition: legacyMap[it.condition] ?? it.condition,
        }));
        setItems(normalized);
      }
      if (colsRes.data) setCollections(colsRes.data as typeof collections);
      setLoading(false);
    })();
  }, [user]);

  const totalValue = items.reduce(
    (sum, i) => sum + (effectivePrice(i) ?? 0) * i.quantity,
    0,
  );
  const targetSpend = totalValue * (costPct / 100);

  const commitPriceEdit = (id: string) => {
    const trimmed = priceDraft.trim();
    if (trimmed === "") {
      // Empty input clears the override → fall back to auto price.
      void updateItem(id, { price_override: null });
    } else {
      const num = parseFloat(trimmed);
      if (Number.isFinite(num) && num >= 0) {
        void updateItem(id, { price_override: Math.round(num * 100) / 100 });
      }
    }
    setEditingPriceId(null);
    setPriceDraft("");
  };

  const updateItem = async (id: string, patch: Partial<DealItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const { error } = await supabase.from("deal_list_items").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("deal_list_items").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const saveAllToCollection = async () => {
    if (!user || !targetCollection || items.length === 0) return;
    setSavingAll(true);
    try {
      const rows = items.map((i) => ({
        collection_id: targetCollection,
        user_id: user.id,
        name: i.card_name,
        set_name: i.set_name,
        card_number: i.card_number,
        rarity: i.rarity,
        condition: i.condition as "mint" | "near_mint" | "excellent" | "good" | "light_play" | "moderate_play" | "heavy_play" | "damaged",
        quantity: i.quantity,
        current_market_price: adjustedPrice(i.tcgplayer_market_price, i.condition),
        estimated_value: adjustedPrice(i.tcgplayer_market_price, i.condition) != null ? (adjustedPrice(i.tcgplayer_market_price, i.condition) as number) * i.quantity : null,
        image_url: i.image_url,
        notes: i.notes,
      }));
      const { error } = await supabase.from("collection_items").insert(rows);
      if (error) throw error;
      // Clear deal list after successful import
      const ids = items.map((i) => i.id);
      await supabase.from("deal_list_items").delete().in("id", ids);
      setItems([]);
      toast({ title: "Saved to collection", description: `${rows.length} card(s) added.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Deal List | Collector Companion</title>
        <meta name="description" content="Review scanned cards, edit quantities and conditions, then save them to your collection." />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Deal List</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {items.length} card{items.length === 1 ? "" : "s"} · est. ${totalValue.toFixed(2)} total
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/scanner")}>
            <ScanLine className="h-4 w-4 mr-2" /> Scan more
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground mb-4">Your Deal List is empty.</p>
            <Button onClick={() => navigate("/scanner")}>
              <ScanLine className="h-4 w-4 mr-2" /> Start scanning
            </Button>
          </Card>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {items.map((i) => (
                <Card key={i.id} className="p-3 flex gap-3">
                  <div className="w-16 h-22 shrink-0 bg-muted rounded overflow-hidden flex items-center justify-center">
                    {i.image_url ? (
                      <img src={i.image_url} alt={i.card_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    ) : (
                      <ImageOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{i.card_name}</p>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => deleteItem(i.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {i.set_name ?? "—"} {i.card_number ? `· ${i.card_number}` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{i.game}</Badge>
                      {i.rarity && <Badge variant="outline" className="text-[10px]">{i.rarity}</Badge>}
                      {i.tcgplayer_market_price != null && (() => {
                        const adj = adjustedPrice(i.tcgplayer_market_price, i.condition);
                        const isAdjusted = adj !== i.tcgplayer_market_price;
                        return (
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                            title={isAdjusted
                              ? `${CONDITION_LABELS[i.condition] ?? i.condition} estimate · NM market $${i.tcgplayer_market_price.toFixed(2)}`
                              : "Near Mint market price"}
                          >
                            ${adj?.toFixed(2)}
                            {isAdjusted && <span className="ml-1 opacity-70">({CONDITION_LABELS[i.condition] ?? i.condition})</span>}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Qty</span>
                        <Input
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={(e) => updateItem(i.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="h-7 w-16 text-xs"
                        />
                      </div>
                      <Select value={i.condition} onValueChange={(v) => updateItem(i.id, { condition: v })}>
                        <SelectTrigger className="h-7 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="text-xs">
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {i.tcgplayer_url && (
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                          <a href={i.tcgplayer_url} target="_blank" rel="noreferrer">TCG <ExternalLink className="h-3 w-3 ml-1" /></a>
                        </Button>
                      )}
                      {i.ebay_search_url && (
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                          <a href={i.ebay_search_url} target="_blank" rel="noreferrer">eBay <ExternalLink className="h-3 w-3 ml-1" /></a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4 sticky bottom-4 border-primary/40 shadow-lg">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Save to collection</label>
                  <Select value={targetCollection} onValueChange={setTargetCollection}>
                    <SelectTrigger>
                      <SelectValue placeholder={collections.length === 0 ? "Create a collection first" : "Choose a collection"} />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.category})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={saveAllToCollection}
                  disabled={!targetCollection || savingAll || items.length === 0}
                  className="shrink-0"
                >
                  {savingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Library className="h-4 w-4 mr-2" />}
                  Save all to collection
                </Button>
              </div>
              {collections.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No collections yet — <button className="underline" onClick={() => navigate("/my-collection")}>create one</button> first.
                </p>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default DealList;
