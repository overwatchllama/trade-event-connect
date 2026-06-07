## Goal

Match Decktradr's vendor POS flow as Phase 1: a fast, loose-entry **transaction ledger** that rolls up into **per-event P&L**. Phase 2 (inventory intelligence dashboard) and Phase 3 (bulk-buy / lot pricing) come after this lands.

## What you'll see when this ships

1. A new **POS** page (`/pos`) — pick an event, add lines fast, save. Three transaction types: **Buy**, **Sell**, **Trade**.
2. A new **Event P&L** tab on every event (yours, plus unlisted personal events) showing revenue, cost-of-goods, fees, net profit, # of transactions, top sellers.
3. A **Ledger** tab on the vending dashboard — every transaction across all shows, searchable, editable.
4. Optional one-tap "link to inventory" on a sale line that marks the matching `deal_list_items` row as sold (so your existing P&L page stays accurate when you choose to link).

## Data model

Two new tables. Both vendor-scoped (RLS: owner only).

```text
transactions
  id, user_id, kind ('buy'|'sell'|'trade'),
  event_id (uuid, nullable)         -- public events.id
  personal_event_id (uuid, nullable) -- vendor_personal_events.id
  occurred_at, customer_label, payment_method,
  subtotal, fees, total, notes
  created_at, updated_at

transaction_items
  id, transaction_id,
  card_name, set_name, card_number, condition, quantity,
  unit_cost      -- what we paid (buy/trade-in side)
  unit_price     -- what we charged (sell/trade-out side)
  market_snapshot -- live market at time of entry, for analytics
  deal_list_item_id (nullable) -- optional link to inventory row
  created_at
```

Loose-entry rules:
- A **Sell** line only needs `unit_price`; `unit_cost` is optional. If linked to a `deal_list_items` row, cost auto-fills from `purchase_price`.
- A **Buy** line only needs `unit_cost`.
- A **Trade** is one transaction holding both buy-side and sell-side line items; net = sells − buys.

## P&L math (per event)

```text
revenue  = sum(sells.unit_price * qty)
cogs     = sum(sells.unit_cost  * qty)   -- skipped when null
buys     = sum(buys.unit_cost   * qty)   -- new inventory added at this show
fees     = sum(transactions.fees)
net      = revenue − cogs − fees         -- "show profit on goods sold"
spend    = buys                          -- cash out at the show
```

## UI

- **`/pos`** (mobile-first):
  - Sticky header: event picker, transaction kind toggle (Buy / Sell / Trade), running total.
  - Add-line row: scan button (reuses existing scanner) **or** manual name+price entry — name is the only required field.
  - Lines list with inline qty / price edit, swipe-to-delete.
  - "Link to inventory" affordance on sell lines (search `deal_list_items` for_sale rows).
  - Big "Save transaction" button → clears for the next deal.
- **Event detail → "P&L" tab** (vendor-only, owner-only): KPI cards (Revenue, COGS, Fees, Net, Spend), tx count, top-5 items by revenue, ledger list filtered to this event.
- **Vending dashboard → "Ledger" tab**: cross-event list, filters by date / event / kind, edit-in-place.

## Out of scope for this phase
- Inventory intelligence dashboard upgrades (gainers/losers/aging) — Phase 2.
- Bulk binder pricing flow — Phase 3.
- Multi-currency, tax breakdown, staff-attributed sales.

## Technical notes
- New migration: tables + GRANTs + RLS (owner via `user_id = auth.uid()`).
- Helper RPC `get_event_pnl(p_event_id, p_personal_event_id)` returning the KPI rollup (security definer, validates ownership).
- "Link to inventory" updates `deal_list_items.sold_price/sold_at/sold_channel='pos'/listing_status='sold'`.
- Scanner reuses the existing slab/raw scanner component; no new model work.
- All P&L numbers are stored in cents-safe `numeric(12,2)`.

## Approval

Reply "go" and I'll start with the migration, then build the POS page and Event P&L tab.