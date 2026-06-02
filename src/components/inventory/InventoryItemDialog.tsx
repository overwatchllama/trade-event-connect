import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

export interface InventoryItemFormValues {
  id?: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  game: string;
  condition: string;
  quantity: number;
  purchase_price: number | null;
  shipping_cost: number;
  fees: number;
  target_sell_price: number | null;
  source: string | null;
  bought_at: string | null;
  notes: string | null;
}

const empty: InventoryItemFormValues = {
  card_name: "",
  set_name: "",
  card_number: "",
  rarity: "",
  image_url: "",
  game: "pokemon",
  condition: "near_mint",
  quantity: 1,
  purchase_price: 0,
  shipping_cost: 0,
  fees: 0,
  target_sell_price: null,
  source: "",
  bought_at: new Date().toISOString().slice(0, 10),
  notes: "",
};

const schema = z.object({
  card_name: z.string().trim().min(1, "Card name is required").max(200),
  set_name: z.string().trim().max(120).nullable().optional(),
  card_number: z.string().trim().max(40).nullable().optional(),
  rarity: z.string().trim().max(60).nullable().optional(),
  image_url: z.string().trim().url("Must be a valid URL").max(2048).or(z.literal("")).nullable().optional(),
  game: z.string().min(1),
  condition: z.string().min(1),
  quantity: z.number().int().min(1).max(100000),
  purchase_price: z.number().min(0).nullable(),
  shipping_cost: z.number().min(0),
  fees: z.number().min(0),
  target_sell_price: z.number().min(0).nullable(),
  source: z.string().trim().max(120).nullable().optional(),
  bought_at: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<InventoryItemFormValues> & { id?: string };
  onSaved: (saved: { id: string }) => void;
}

const numOrNull = (s: string) => (s === "" ? null : Number(s));
const numOrZero = (s: string) => (s === "" ? 0 : Number(s));

export function InventoryItemDialog({ open, onOpenChange, initialValues, onSaved }: Props) {
  const { user } = useAuth();
  const isEdit = Boolean(initialValues?.id);
  const [values, setValues] = useState<InventoryItemFormValues>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({
      ...empty,
      ...(initialValues ?? {}),
      bought_at: initialValues?.bought_at
        ? initialValues.bought_at.slice(0, 10)
        : empty.bought_at,
    } as InventoryItemFormValues);
  }, [open, initialValues]);

  const set = <K extends keyof InventoryItemFormValues>(k: K, v: InventoryItemFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!user) return;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast({
        title: "Check your inputs",
        description: parsed.error.issues[0]?.message ?? "Invalid form",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        card_name: values.card_name.trim(),
        set_name: values.set_name?.trim() || null,
        card_number: values.card_number?.trim() || null,
        rarity: values.rarity?.trim() || null,
        image_url: values.image_url?.trim() || null,
        game: values.game,
        condition: values.condition,
        quantity: values.quantity,
        purchase_price: values.purchase_price,
        shipping_cost: values.shipping_cost,
        fees: values.fees,
        target_sell_price: values.target_sell_price,
        source: values.source?.trim() || null,
        bought_at: values.bought_at ? new Date(values.bought_at).toISOString() : null,
        notes: values.notes?.trim() || null,
        status: "bought" as const,
      };
      if (isEdit && initialValues?.id) {
        const { error } = await supabase.from("deal_list_items").update(payload).eq("id", initialValues.id);
        if (error) throw error;
        toast({ title: "Item updated" });
        onSaved({ id: initialValues.id });
      } else {
        const { data, error } = await supabase
          .from("deal_list_items")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast({ title: "Item added to inventory" });
        onSaved({ id: data!.id });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit inventory item" : "Add inventory item"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update card details, costs, and listing values."
              : "Manually add a card to your inventory. Use the Deal Pipeline to track watches/passes first if you prefer."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="card_name">Card name *</Label>
            <Input
              id="card_name"
              value={values.card_name}
              onChange={(e) => set("card_name", e.target.value)}
              maxLength={200}
              placeholder="Charizard"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="set_name">Set</Label>
              <Input id="set_name" value={values.set_name ?? ""} onChange={(e) => set("set_name", e.target.value)} maxLength={120} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card_number">Card #</Label>
              <Input id="card_number" value={values.card_number ?? ""} onChange={(e) => set("card_number", e.target.value)} maxLength={40} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rarity">Rarity</Label>
              <Input id="rarity" value={values.rarity ?? ""} onChange={(e) => set("rarity", e.target.value)} maxLength={60} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="game">Game</Label>
              <Select value={values.game} onValueChange={(v) => set("game", v)}>
                <SelectTrigger id="game"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pokemon">Pokémon</SelectItem>
                  <SelectItem value="onepiece">One Piece</SelectItem>
                  <SelectItem value="mtg">Magic</SelectItem>
                  <SelectItem value="lorcana">Lorcana</SelectItem>
                  <SelectItem value="ygo">Yu-Gi-Oh!</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={values.condition} onValueChange={(v) => set("condition", v)}>
                <SelectTrigger id="condition"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mint">Mint</SelectItem>
                  <SelectItem value="near_mint">Near Mint</SelectItem>
                  <SelectItem value="lightly_played">Lightly Played</SelectItem>
                  <SelectItem value="moderately_played">Moderately Played</SelectItem>
                  <SelectItem value="heavily_played">Heavily Played</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                step={1}
                value={values.quantity}
                onChange={(e) => set("quantity", Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="purchase_price">Unit cost</Label>
              <Input id="purchase_price" type="number" step="0.01" min={0}
                value={values.purchase_price ?? ""}
                onChange={(e) => set("purchase_price", numOrNull(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shipping_cost">Shipping</Label>
              <Input id="shipping_cost" type="number" step="0.01" min={0}
                value={values.shipping_cost}
                onChange={(e) => set("shipping_cost", numOrZero(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fees">Fees</Label>
              <Input id="fees" type="number" step="0.01" min={0}
                value={values.fees}
                onChange={(e) => set("fees", numOrZero(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target_sell_price">Target / unit</Label>
              <Input id="target_sell_price" type="number" step="0.01" min={0}
                value={values.target_sell_price ?? ""}
                onChange={(e) => set("target_sell_price", numOrNull(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" placeholder="eBay, local LCS…" value={values.source ?? ""} onChange={(e) => set("source", e.target.value)} maxLength={120} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bought_at">Bought on</Label>
              <Input id="bought_at" type="date" value={values.bought_at ?? ""} onChange={(e) => set("bought_at", e.target.value || null)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" type="url" placeholder="https://…" value={values.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} maxLength={2048} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save changes" : "Add to inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
