
-- Trim to 10 highest-priced cards for the demo
WITH keep AS (
  SELECT card_id
  FROM market_snapshots
  WHERE raw_price IS NOT NULL
  ORDER BY raw_price DESC NULLS LAST
  LIMIT 10
)
DELETE FROM market_snapshots WHERE card_id NOT IN (SELECT card_id FROM keep);

DELETE FROM market_cards
WHERE id NOT IN (SELECT card_id FROM market_snapshots);

-- Synthesize PSA fields deterministically from card id so demo data is stable
UPDATE market_snapshots ms
SET
  psa10_price = ROUND((raw_price * (2.5 + (('x' || substr(md5(card_id::text),1,4))::bit(16)::int % 600) / 100.0))::numeric, 2),
  psa10_ratio = ROUND((2.5 + (('x' || substr(md5(card_id::text),1,4))::bit(16)::int % 600) / 100.0)::numeric, 2),
  gem_rate    = ROUND((0.15 + (('x' || substr(md5(card_id::text),5,4))::bit(16)::int % 7000) / 10000.0)::numeric, 4),
  psa_total_pop = 200 + (('x' || substr(md5(card_id::text),9,4))::bit(16)::int % 4800),
  psa10_pop     = 50  + (('x' || substr(md5(card_id::text),13,4))::bit(16)::int % 1200),
  sample_size   = 10  + (('x' || substr(md5(card_id::text),1,2))::bit(8)::int % 40),
  last_refreshed_at = now();
