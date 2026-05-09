## Goal
Replace the live, eBay-scraping Markets page with a proper data product: a daily job stores **raw price**, **PSA 10 price**, **PSA 10 ratio**, and **PSA gem rate / pop counts** for every Pokémon and One Piece card. Users browse, search, filter, and sort that snapshot — no per-request scraping.

---

## Architecture

```text
                  ┌───────────────────────┐
   Daily cron ──► │ refresh-market-data   │ ──► Pokémon TCG API  (raw + PSA 10 mid)
   (pg_cron)      │   edge function       │ ──► One Piece API    (raw)
                  │                       │ ──► PSA Public API   (pop report + APR)
                  └───────────┬───────────┘
                              ▼
                     market_cards  +  market_snapshots
                              ▲
                              │ select / filter / sort
                  ┌───────────┴───────────┐
                  │   /markets page       │
                  │   (search + filters)  │
                  └───────────────────────┘
```

---

## Database

**`market_cards`** — one row per card, slowly-changing
- `id` (uuid), `game` (`pokemon` | `onepiece`), `external_id` (TCG API id), `name`, `set_name`, `set_id`, `number`, `rarity`, `image_url`, `tcgplayer_url`, `created_at`, `updated_at`
- Unique on (`game`, `external_id`)

**`market_snapshots`** — latest pricing/grading numbers (one current row per card; we overwrite daily and keep a `history` table later if needed)
- `card_id` (FK → market_cards), `raw_price` numeric, `psa10_price` numeric, `psa10_ratio` numeric (psa10/raw), `gem_rate` numeric (psa10_pop / total_pop), `psa_total_pop` int, `psa10_pop` int, `sample_size` int (eBay/APR comps used), `last_refreshed_at` timestamptz
- Public read RLS, no write from clients (only service role).

**Indexes**: `(game)`, `(psa10_ratio desc)`, `(gem_rate desc)`, `(raw_price)`, `(set_name)`, `(rarity)`, `name trigram` for search.

---

## Edge function: `refresh-market-data`
- Auth: service-role only (called by pg_cron with anon key + internal token).
- For each game:
  1. Page through TCG API to upsert `market_cards` (id, name, set, number, image, raw price).
  2. For each card with `raw_price >= $1`, look up PSA pop report + Auction Prices Realized via PSA API (`PSA_API_TOKEN`) → get `psa10_pop`, `total_pop`, recent PSA 10 sale median.
  3. Compute `gem_rate = psa10_pop / total_pop`, `psa10_ratio = psa10_price / raw_price`.
  4. Upsert into `market_snapshots`.
- Batched, throttled (PSA API limits), resumable via cursor in a `market_refresh_runs` table.
- Logs progress so we can monitor.

Manual trigger: an admin-only "Refresh now" button on the Markets page that invokes the function.

---

## Cron
`pg_cron` + `pg_net` → daily at 08:00 UTC, `POST /functions/v1/refresh-market-data`.
Inserted via the **insert tool** (not migration) because it embeds the project URL + anon key.

---

## Markets page rewrite
Server-paginated query against `market_snapshots` joined to `market_cards`.

**Filters**
- Game (Pokémon / One Piece / All)
- Set (combobox, populated from distinct sets)
- Rarity (multi-select)
- Raw price range (min / max)
- Min gem rate (slider 0–100%)
- Min total pop (number)
- Search by card name (ilike / trigram)

**Sorts**
- PSA 10 ratio desc (default)
- Absolute gap desc
- Gem rate desc
- Raw price asc/desc
- PSA 10 price desc
- Last refreshed desc

**Row display**: image, name, set · #, rarity, raw, PSA 10, ratio, gem rate, pop · psa10 pop, last refreshed.

**Empty / loading**: skeletons; if `market_snapshots` is empty, show "Market data has not been collected yet — run the daily job."

Removes: live eBay scrape, blocked-state UI, "Load gaps" button.

---

## Secrets needed
- `PSA_API_TOKEN` — PSA Public API bearer token (user must add via secrets prompt).

---

## Phasing
1. **Schema + RLS** (migration) — `market_cards`, `market_snapshots`, indexes.
2. **Edge function** `refresh-market-data` — Pokémon first, One Piece second, PSA enrichment last.
3. **Cron job** via pg_net.
4. **Markets page rewrite** — query, filters, sort, search, pagination.
5. **Manual refresh button** for admins.

## Open caveats
- PSA Public API access is paid and rate-limited; the first full backfill of ~30k cards will take many hours and must be chunked across several invocations. The daily job will only refresh cards whose `last_refreshed_at` is >24h old, so steady-state cost stays small.
- One Piece pricing in the project is currently disabled per memory; we'll store raw price for One Piece but skip PSA enrichment until you confirm One Piece grading data is desired.
