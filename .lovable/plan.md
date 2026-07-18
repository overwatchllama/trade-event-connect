
# Vendor Trade Desk — Full Rework

Goal: turn today's Deals → Pipeline → Proposals → Lot Buys → Inventory → POS sprawl into **one hub with three modes** (Buy, Sell, Trade), backed by one inventory model and one transaction model. Fewer routes, fewer dialogs, fewer queries, tighter UI.

## Today's pain (what we're cutting)

- **6 destinations** for one mental job: `/vending`, `/deals`, `/deal-proposals`, `/pipeline`, `/inventory`, `/pos`.
- **3 different "add a card" dialogs** (`AddCardToDealDialog`, `LotBuyDialog`, `POS Buy tab`) with overlapping fields.
- **2 inventory truths**: `deal_list_items` rows + `purchase_lots` header — UI stitches them per page.
- **POS has 4 tabs** (Quick Sell, Sell, Buy, Trade, Ledger, P&L) most of which repeat form logic.
- Inventory page re-fetches on every filter change; no shared cache with POS scan lookup.

## New shape

```text
/desk                       ← single vendor hub, replaces /pos + /deals + /pipeline
 ├─ tab: Sell     (was Quick Sell + Sell)
 ├─ tab: Buy      (was Buy + Lot Buy dialog + Deals pipeline)
 ├─ tab: Trade    (was Trade + Deal Proposal editor)
 └─ tab: Ledger   (was Ledger + Event P&L, filterable by event)

/inventory                  ← stays, but slimmer (see below)
/deal-proposals/:token      ← public share view only (unchanged for customers)
```

Removed from nav: `Deals`, `Pipeline`, `Proposals` (list). Proposals become a **filter on Ledger** ("Open proposals") and a **share action** on any Trade ticket.

## Data model changes

Minimal — reuse what's there, add two things:

1. `transactions.status` enum: `open | proposed | completed | void`. Draft proposals become `open` transactions of `kind='trade'`; sharing flips them to `proposed`. Kill the parallel `deal_proposals` write path — reuse existing rows via a compatibility view for the public share RPC.
2. `deal_list_items.state` computed helper via view `v_inventory_state` returning one of `on_hand | listed | sold | traded | in_proposal` so the Inventory page stops recomputing from 6 columns.

Everything else (`purchase_lots`, `transaction_items`, `tender_breakdown`, `lot_id`) stays.

## The three modes (one component, one reducer)

Single `<TradeTicket mode="sell|buy|trade">` component driving a `useTicketReducer`. All three modes share:

- Scan/search bar (barcode → `deal_list_items` by id, else card search)
- Line list with qty / unit price / cost / margin chip
- Totals + tender breakdown
- Save → writes `transactions` + `transaction_items` + stamps inventory in one RPC call `commit_ticket(ticket jsonb)`

Mode-specific slices:
- **Sell**: one side (vendor gives cards, customer gives cash). Auto-marks items `sold`.
- **Buy**: one side (customer gives cards, vendor gives cash). Lot header auto-created; allocation dialog only appears if user toggles "Allocate by market weight" (default = per-line cost user typed).
- **Trade**: two sides side-by-side; balance chip; "Share proposal" button generates public token from the same row.

Net effect: three tabs that look nearly identical, one code path, one save.

## Inventory page slim-down

- Drop the double table (grid + list). Keep one virtualized table.
- Columns collapse into presets: **Operate** (qty, condition, price, print), **Money** (cost, market, unrealized), **Provenance** (lot, source, bought_at). Toggle chips at top; default = Operate.
- Row action menu shrinks from 9 items to 4: **Edit price**, **Print label**, **Send to ticket** (opens Desk with row pre-loaded), **Adjust / retire**.
- Filters + sort move to a single sticky bar; cost-basis toggle stays (already persisted).
- Single query with `select ...` narrowed to visible columns; server-side pagination (`range()`) instead of loading everything.

## Query & perf wins

- One shared React Query key `['inventory', filters]` used by both `/inventory` and Desk scan lookups.
- Barcode scan hits an indexed `id` lookup (already unique) — cache result for 60s so re-scans are instant.
- `commit_ticket` RPC replaces the current 3-5 round trips per save (insert transaction → insert items → update each inventory row → maybe insert lot).
- Drop 2 realtime channels that duplicate refetch (`deal_list_items` + `transactions`); keep one on `transactions` and invalidate inventory keys from its handler.

## Migration / rollout

1. Ship new `/desk` route in parallel; old routes still work.
2. Add redirects: `/pos`, `/deals`, `/pipeline` → `/desk` (mode preselected).
3. Ship `commit_ticket` RPC + `v_inventory_state` view.
4. Refactor Inventory page against the view.
5. Point public proposal share at existing RPC (already token-gated) but sourced from `transactions` via compatibility view.
6. Remove dead components: `AddCardToDealDialog`, `LotBuyDialog` (folded into Buy mode), `DealProposals` list page, `Pipeline` tab, `QuickSell` (folded into Sell).

## Files touched (rough)

- **New**: `src/pages/Desk.tsx`, `src/components/desk/TradeTicket.tsx`, `src/components/desk/ticketReducer.ts`, `src/components/desk/ScanBar.tsx`, `src/components/desk/TenderBar.tsx`, `src/hooks/useInventoryQuery.ts`.
- **Rewritten**: `src/pages/Inventory.tsx` (slim), `src/pages/POS.tsx` → thin redirect.
- **Removed**: `AddCardToDealDialog`, `Pipeline` bits inside `DealList`, `QuickSell`, `DealProposals` list page, `LotBuyDialog` (logic moved into Buy mode).
- **DB**: 1 migration (enum + view + `commit_ticket` RPC + GRANTs).

## What I'd verify before calling it done

- Barcode scan → sold in one tap, inventory row flips state, ledger shows txn, P&L updates — under 400ms locally.
- Buy flow: enter 8 cards + total → one save creates lot + 8 inventory rows with correct allocated cost.
- Trade flow: two-sided, "Share" produces same public link format as today's `/p/deal/:token` (no customer-facing break).
- Inventory page first paint with 5k rows stays under 1s (virtualized + paginated).
- Old URLs still resolve.

## Estimate

~2–3 build cycles. Cycle 1: schema + RPC + Desk shell with Sell mode. Cycle 2: Buy + Trade modes + public share compatibility. Cycle 3: Inventory slim-down + nav cleanup + dead-code removal.

Approve and I'll start with Cycle 1.
