
# Inventory inflow / outflow / tracking / labeling — full rebuild

The DB migration for phase 2 (`purchase_lots`, `transactions.kind`, `tender_breakdown`, `deal_list_items.lot_id`, `transaction_items.linked_kind` / `collection_item_id`) is already applied. All work below is code-side plus one small RPC extension.

## 1. Inflow — Lot Intake with weighted cost allocation

Rebuild `LotBuyDialog` into `LotIntakeDialog`:

- Header: lot title, source, event/personal event tag, `lot_total`, `shipping_cost`, `fees`, allocation method (`market_weighted` default, `even` fallback).
- Lines list: add via card search, barcode scan, or paste. Each line: qty, condition, market price (auto-pulled from existing card lookup, editable), notes.
- New pure util `src/lib/allocateLotCost.ts`:
  - `allocateLotCost(lines, lotTotal, shipping, fees, method)` → per-line `unit_cost`.
  - Weighted: share = `(marketValue × qty) / Σ`. Even fallback when total market weight = 0 or method = `even`.
  - Rounds to cents, distributes remainder cents to the largest-share lines so the sum matches lotTotal + shipping + fees exactly.
  - Vitest coverage: even split, weighted split, zero-market fallback, penny reconciliation, single-line edge.
- Live per-line "cost basis" column recalculates as the user types.
- Save (single transaction):
  1. Insert `purchase_lots` row.
  2. Insert one `deal_list_items` row per line with `status='bought'`, `lot_id`, computed `purchase_price = unit_cost`, allocated `shipping_cost` / `fees` split proportionally for display.
  3. Insert one `transactions` row `kind='purchase'`, totals = `lot_total + shipping + fees`, event/personal event copied from header.
  4. Insert matching `transaction_items` per line, `side='buy'`, `unit_cost` from allocation, `linked_kind='deal_item'`, `deal_list_item_id` set.
  5. Optional "queue all for label printing" checkbox → opens `PrintLabelsDialog` seeded with the new rows.
- Wire from Deals list "New lot" button (replaces existing `LotBuyDialog` entry points).

## 2. Outflow — Faster POS sale + tender/receipt

Refactor `src/pages/POS.tsx` to a small reducer so Sale, QuickSell, and the new Trade tab share cart primitives (`cartReducer` in `src/pages/pos/cartReducer.ts`).

Sale tab upgrades:

- Session selector at the top of POS — event / personal event / none. Persists in `localStorage` and is written to every `transactions.event_id` / `personal_event_id`.
- Always-focused scan input; Enter adds line. Focus restored after every action.
- Quick-add tiles: last 8 sold SKUs (from `transaction_items` join `deal_list_items`) + any items with `vendor_event_inventory` for the current session event.
- Cart row shows unit cost (from linked inventory), unit price (editable), qty, line total, and per-line margin.
- Running totals bar: subtotal, fees, running margin (revenue − COGS), item count.
- `TenderDrawer` component: split cash / card / other with running "change due", optional buyer label, notes. Save writes:
  - `transactions` row `kind='sale'`, `payment_method` = primary tender, `tender_breakdown` jsonb of splits.
  - `transaction_items` `side='sell'` per line, `unit_cost` copied from linked `deal_list_items.purchase_price`, `linked_kind='deal_item'`.
  - Decrements `deal_list_items` — sets `listing_status='sold'`, `sold_price`, `sold_at`, `sold_channel='pos'` when qty hits zero, otherwise decrements `quantity`.
- Receipt view (`ReceiptDialog`): itemized list, totals, tender breakdown, change due, "Reprint" and "Email" (stub) buttons. Post-save flow opens receipt automatically.

Trade tab (new):

- Two carts side-by-side: `THEIR PILE` (incoming, becomes new inventory) and `YOUR PILE` (outgoing, existing inventory scan/search).
- Incoming lines require manual price per card (that becomes cost basis).
- Balance bar: incoming subtotal vs outgoing subtotal, difference labeled "to customer" / "to store", tender picker (Cash / Card / Even trade) — reuses `TenderDrawer`.
- Save (single `transactions` row `kind='trade'`):
  - Insert new `deal_list_items` for each incoming line (status `bought`, `purchase_price` from manual price, no lot).
  - Insert `transaction_items` — `buy` side for incoming with `unit_cost`, `sell` side for outgoing with `unit_cost` from linked inventory and `unit_price` = manual sell price.
  - Same inventory decrement rules as sale.

## 3. Tracking — Inventory unrealized P&L + event rollups

Inventory list (`src/pages/Inventory.tsx`):

- New columns: **Cost basis** (`purchase_price`), **Current market** (`tcgplayer_market_price`), **Unrealized $** (`market - cost`), **Unrealized %**.
- Column toggle persists in existing user-settings pattern (same key format as the Avg/Lot toggle).
- Totals row: aggregate cost, market, unrealized $ / %.
- Filter chip: "Underwater only" (unrealized < 0).

Event P&L (`src/pages/InventoryPnL.tsx`):

- Extend `get_event_pnl` RPC to also return `by_channel` (pos / online / trade — derived from `transactions.kind` + `deal_list_items.sold_channel`) and `by_kind` (`sale` / `purchase` / `trade`) rollups. Backwards-compatible: existing top-level keys unchanged, new keys added.
- New tab "Channels" on the P&L page: horizontal bar of revenue vs COGS per channel; table with revenue, COGS, fees, net, margin %.
- Drill-down list of transactions per event (already partially built) gets a channel badge and links to the receipt view.

## 4. Labeling — batch reprint + print history polish

- Inventory list gets a bulk selection bar (reuse existing bulk pattern) with **Print labels** and **Reprint labels** actions.
- New filter chip: **Never printed** (`label_printed_at IS NULL`).
- Per-row badge: small "×N" next to a printer icon when `label_print_count > 0`; hover shows last printed at.
- `PrintLabelsDialog` gets a "Selection summary" strip: "12 new · 3 reprints" with a toggle to skip already-printed rows in this batch.
- `PrintHistoryDialog` upgraded to a full page-side sheet:
  - Grouped by print run (using `label_print_audit.created_at` bucketed by minute + `preset`).
  - Columns: when, preset, label count, reprint count, user.
  - "Reprint this batch" button re-opens `PrintLabelsDialog` seeded with those items.
- Post-print callback increments `label_print_count` and stamps `label_printed_at` in one update — already partially wired; finish the transaction so counts always match audit rows.

## Order of work

Each step ships on its own; nothing breaks the existing ledger or label flow.

1. `allocateLotCost` util + tests.
2. `LotIntakeDialog` (replaces `LotBuyDialog`); wire into Deals.
3. POS reducer refactor → Sale tab upgrades → `TenderDrawer` → `ReceiptDialog`.
4. POS Trade tab.
5. Inventory unrealized columns + underwater filter + totals.
6. `get_event_pnl` RPC extension + P&L Channels tab.
7. Labeling bulk actions + never-printed filter + per-row badge.
8. `PrintHistoryDialog` → grouped runs sheet + reprint-batch.

## Technical notes

- **Cost basis source of truth**: `transaction_items.unit_cost` populated at write time from the linked `deal_list_items.purchase_price`. Do not backfill unlinked historical rows in this pass.
- **RPC change**: `get_event_pnl` returns the existing object plus `by_channel` (`{pos:{revenue,cogs,net}, online:{...}, trade:{...}}`) and `by_kind` (`{sale:{...}, purchase:{...}, trade:{...}}`). No breaking changes for current UI.
- **Reducer shape**: `{ sessionEventId, sessionPersonalEventId, sale: CartState, trade: { theirs: CartState, yours: CartState } }` — CartState is `{ lines: CartLine[], notes, customerLabel }`.
- **Session persistence**: `localStorage['pos.session']` = `{ eventId, personalEventId }`. Cleared on sign out.
- **Testing**: Vitest for `allocateLotCost` and reducer only; UI verified via a short Playwright smoke run against the preview after step 3 and step 7.
