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
import type { PokemonCard } from "@/services/pokemonTcgApi";
import type { ScryfallCard } from "@/services/scryfallApi";

type Game = "pokemon" | "mtg";

interface AddCardToDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

/**
 * Manual entry point into the deal pipeline — no scanner required.
 * Two paths: search a known card via the existing CardSearchDialog,
 * or type one in by hand if it's not in the API (vintage, custom, etc.).
 */
export const AddCardToDealDialog = ({ open, onOpenChange, onAdded }: AddCardToDealDialogProps) => {
  const { user } = useAuth();
  const [game, setGame] = useState<Game>("pokemon");
  const [saving, setSaving] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    card_name: "",
    set_name: "",
    card_number: "",
    rarity: "",
  });

  const insertDeal = async (payload: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    const row = { user_id: user.id, status: "lead", card_name: "", ...payload } as Parameters<
      ReturnType<typeof supabase.from<"deal_list_items">>["insert"]
    >[0];
    const { error } = await supabase.from("deal_list_items").insert(row);
    setSaving(false);
    if (error) {
      toast({ title: "Could not add", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Added to pipeline", description: String(payload.card_name ?? "Card") });
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
    await insertDeal({
      game,
      card_name: manual.card_name.trim(),
      set_name: manual.set_name.trim() || null,
      card_number: manual.card_number.trim() || null,
      rarity: manual.rarity.trim() || null,
    });
    setManual({ card_name: "", set_name: "", card_number: "", rarity: "" });
    setManualOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
