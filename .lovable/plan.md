
# Phase 2 — Vendor buy / sell / trade loop

Goal: make buying, selling, and trading cards fast on the floor, with cost basis flowing cleanly from intake → inventory → POS → event P&L.

Building on what's already shipped: deal lists, Mark-as-bought → Inventory, POS ledger with barcode scan, label printing, `get_event_pnl` RPC.

---

## 1. Lot intake with weighted cost allocation

Extend the existing `LotBuyDialog` into a true bulk-intake flow.

- One "Lot purchase" header: total lot price, shipping, fees, source, optional event/personal_event tag.
- Add card lines via search, scan, or paste (reuse existing card lookup). Each line: qty, condition, market price (auto-pulled, editable).
- Allocation engine splits `lot_total + shipping + fees` across lines **weighted by market value × qty** (with even-split fallback when no market data). Show per-line cost basis live as user types.
- On save: insert one `deal_list_items` row per line with status=`bought`, create matching `collection_items` (Inventory) in a single transaction, optionally queue all for label printing.
- Records a single `transactions` row (`side=buy`, totals = lot_total + ship + fees) so event P&L captures the spend even before resale.

## 2. Two-sided trade workflow (POS tab)

New POS tab "Trade" — two carts side-by-side:

```text
  THEIR PILE (incoming)     |     YOUR PILE (outgoing)
  qty · card · cost basis   |     qty · card · sell price
  ─────────────────────────  |     ─────────────────────────
  Subtotal (cash-in value)  |     Subtotal (retail value)
                  Balance: +$X to customer / +$Y to store
                  Tender:  [Cash] [Card] [Even trade]
```

- Incoming side: manual price per card (per your preference). Each becomes a new Inventory row with that price as cost basis, plus a `buy` transaction_item.
- Outgoing side: scan label or search, decrements inventory, `sell` transaction_item with unit_cost pulled from the linked inventory row.
- Single `transactions` row of `kind=trade` ties both sides together so P&L sees one event.

## 3. Faster POS selling

Tighten the existing POS New Transaction tab:

- Big scan input always focused; Enter adds the line.
- Quick-add tiles for last 8 sold SKUs and any items featured at the current event.
- Cart shows running margin (revenue − COGS) as lines are added.
- Tender drawer: split cash/card/other, change due, optional buyer name, save → receipt view with reprint.
- Auto-sets `event_id` / `personal_event_id` from a session selector at top of POS so every line rolls into the right P&L bucket.

## 4. Cost basis & P&L clarity

- `transaction_items.unit_cost` is the single source of truth; populated automatically from the linked `deal_list_item` / `collection_item` at sell time (already partly wired — finish the join + backfill).
- Inventory list gains columns: cost basis, current market, unrealized $ / %.
- Event P&L page (`InventoryPnL` or new tab on Vending dashboard) shows per-event: revenue, COGS, buys, fees, net, margin %, and a drill-down list of transactions. Reuses `get_event_pnl` RPC; adds per-channel breakdown (pos / online / trade).

---

## Technical notes

- **Schema**: add `transactions.kind` enum (`sale`, `purchase`, `trade`), `transactions.tender_breakdown jsonb`, `transaction_items.linked_kind` (`deal_item` / `collection_item`). Add `deal_list_items.lot_id uuid` so lot intakes can be reviewed/reversed as a group; new `purchase_lots` table holds the header (total, ship, fees, allocation_method).
- **Allocation helper**: pure TS util `allocateLotCost(lines, lotTotal, shipping, fees, method)` returns per-line cost. Used by lot intake and trade incoming side.
- **POS state**: lift current `POS.tsx` state into a small reducer so Sale/Trade tabs share cart primitives. Keep barcode scan handler shared.
- **RPC tweak**: extend `get_event_pnl` to return `{ by_channel, by_kind }` rollups.
- **Migrations include GRANTs** for `purchase_lots` (authenticated CRUD, service_role all).

---

## Order of work

1. Schema migration: `purchase_lots`, `transactions.kind` + `tender_breakdown`, `deal_list_items.lot_id`.
2. Lot intake rebuild (`LotBuyDialog` → `LotIntakeDialog`) + allocation util + tests.
3. POS reducer refactor + Trade tab.
4. Tender drawer + receipt on Sale tab.
5. Inventory unrealized P&L columns.
6. Event P&L by-channel / by-kind rollups.

Each step ships independently; nothing breaks the existing ledger or label flow.
