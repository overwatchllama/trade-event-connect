import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CardSearchDialog } from "@/components/CardSearchDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PokemonCard } from "@/services/pokemonTcgApi";
import type { ScryfallCard } from "@/services/scryfallApi";

type Game = "pokemon" | "mtg";
type Condition =
  | "mint"
  | "near_mint"
  | "excellent"
  | "good"
  | "light_play"
  | "moderate_play"
  | "heavy_play"
  | "damaged";

const CONDITION_OPTIONS: { value: Condition; label: string }[] = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "light_play", label: "Light Play" },
  { value: "moderate_play", label: "Moderate Play" },
  { value: "heavy_play", label: "Heavy Play" },
  { value: "damaged", label: "Damaged" },
];

interface AddCardToDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

/**
 * Manual entry point into the deal pipeline — no scanner required.
 * Two paths: search a known card via the existing CardSearchDialog,
 * or type one in by hand if it's not in the API (vintage, custom, etc.).
 * Shared meta (quantity, condition, optional price paid) applies to both paths.
 */
export const AddCardToDealDialog = ({ open, onOpenChange, onAdded }: AddCardToDealDialogProps) => {
  const { user } = useAuth();
  const [game, setGame] = useState<Game>("pokemon");
  const [saving, setSaving] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // Shared across search + manual paths
  const [quantity, setQuantity] = useState<number>(1);
  const [condition, setCondition] = useState<Condition>("near_mint");
  const [priceText, setPriceText] = useState<string>("");

  const [manual, setManual] = useState({
    card_name: "",
    set_name: "",
    card_number: "",
    rarity: "",
  });

  const resetForm = () => {
    setQuantity(1);
    setCondition("near_mint");
    setPriceText("");
    setManual({ card_name: "", set_name: "", card_number: "", rarity: "" });
    setManualOpen(false);
  };

  const parsedPrice = (): number | null => {
    const t = priceText.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const insertDeal = async (payload: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    const price = parsedPrice();
    const row = {
      user_id: user.id,
      status: "lead",
      card_name: "",
      quantity: Math.max(1, quantity || 1),
      condition,
      purchase_price: price,
      ...payload,
    } as { user_id: string; card_name: string; [k: string]: unknown };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("deal_list_items").insert(row as any);
    setSaving(false);
    if (error) {
      toast({ title: "Could not add", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Added to pipeline", description: String(payload.card_name ?? "Card") });
    resetForm();
    onAdded();
    onOpenChange(false);
  };

  const handleSelectFromSearch = async (card: PokemonCard | ScryfallCard) => {
    if (game === "pokemon") {
      const c = card as PokemonCard;
      const market =
        c.tcgplayer?.prices?.holofoil?.market ??
        c.tcgplayer?.prices?.normal?.market ??
        c.tcgplayer?.prices?.reverseHolofoil?.market ??
        null;
      await insertDeal({
        game: "pokemon",
        card_name: c.name,
        set_name: c.set?.name ?? null,
        card_number: c.number ?? null,
        rarity: c.rarity ?? null,
        external_id: c.id,
        image_url: c.images?.large ?? c.images?.small ?? null,
        tcgplayer_market_price: market,
        tcgplayer_url: c.tcgplayer?.url ?? null,
      });
    } else {
      const c = card as ScryfallCard;
      const usd = c.prices?.usd ? Number(c.prices.usd) : null;
      await insertDeal({
        game: "mtg",
        card_name: c.name,
        set_name: c.set_name ?? null,
        card_number: c.collector_number ?? null,
        rarity: c.rarity ?? null,
        external_id: c.id,
        image_url: c.image_uris?.large ?? c.image_uris?.normal ?? null,
        tcgplayer_market_price: usd,
        tcgplayer_url: c.scryfall_uri ?? null,
      });
    }
  };

  const handleManualSave = async () => {
    if (!manual.card_name.trim()) {
      toast({ title: "Card name required", variant: "destructive" });
      return;
    }
    if (priceText.trim() && parsedPrice() === null) {
      toast({ title: "Invalid price", description: "Enter a number or leave blank.", variant: "destructive" });
      return;
    }
    await insertDeal({
      game,
      card_name: manual.card_name.trim(),
      set_name: manual.set_name.trim() || null,
      card_number: manual.card_number.trim() || null,
      rarity: manual.rarity.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add card to pipeline</DialogTitle>
          <DialogDescription>
            Search the catalog or enter card details manually. New cards land in the Lead stage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Game</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={game === "pokemon" ? "default" : "outline"}
                size="sm"
                onClick={() => setGame("pokemon")}
              >
                Pokémon
              </Button>
              <Button
                type="button"
                variant={game === "mtg" ? "default" : "outline"}
                size="sm"
                onClick={() => setGame("mtg")}
              >
                Magic
              </Button>
            </div>
          </div>

          {/* Shared meta — applies to both search-selected and manual cards */}
          <div className="grid grid-cols-3 gap-2 rounded-md border p-3">
            <div className="grid gap-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cond">Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                <SelectTrigger id="cond">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price paid</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="Optional"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
              />
            </div>
          </div>

          {!manualOpen ? (
            <div className="grid gap-2">
              <CardSearchDialog
                game={game}
                onCardSelect={handleSelectFromSearch}
                trigger={
                  <Button variant="default" disabled={saving} className="w-full justify-start">
                    <Search className="h-4 w-4 mr-2" />
                    Search {game === "pokemon" ? "Pokémon" : "Magic"} catalog
                  </Button>
                }
              />
              <Button
                variant="outline"
                onClick={() => setManualOpen(true)}
                className="w-full justify-start"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Enter card details manually
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-md border p-3">
              <div className="grid gap-2">
                <Label htmlFor="card_name">Card name *</Label>
                <Input
                  id="card_name"
                  value={manual.card_name}
                  onChange={(e) => setManual((m) => ({ ...m, card_name: e.target.value }))}
                  placeholder="Charizard"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="set_name">Set</Label>
                  <Input
                    id="set_name"
                    value={manual.set_name}
                    onChange={(e) => setManual((m) => ({ ...m, set_name: e.target.value }))}
                    placeholder="Base Set"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="card_number">Number</Label>
                  <Input
                    id="card_number"
                    value={manual.card_number}
                    onChange={(e) => setManual((m) => ({ ...m, card_number: e.target.value }))}
                    placeholder="4/102"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rarity">Rarity</Label>
                <Input
                  id="rarity"
                  value={manual.rarity}
                  onChange={(e) => setManual((m) => ({ ...m, rarity: e.target.value }))}
                  placeholder="Holo Rare"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setManualOpen(false)} disabled={saving}>
                  Back
                </Button>
                <Button size="sm" onClick={handleManualSave} disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" /> Add to pipeline
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
