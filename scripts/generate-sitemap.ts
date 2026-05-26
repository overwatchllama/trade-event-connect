// Generates public/sitemap.xml from app routes + dynamic Supabase data.
// Runs via predev/prebuild npm hooks.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.collectorcompanion.com";
const SUPABASE_URL = "https://gsjwamfnoezhwlhkqzdn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzandhbWZub2V6aHdsaGtxemRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTkwNTQsImV4cCI6MjA3MTQ5NTA1NH0.8GfmyMPtkw8RnwXkB2OxFsnzVyDmaozRp0wDTuGopPw";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/events", changefreq: "daily", priority: "0.9" },
  { path: "/vendors", changefreq: "weekly", priority: "0.8" },
  { path: "/demo", changefreq: "monthly", priority: "0.5" },
  { path: "/auth", changefreq: "monthly", priority: "0.3" },
  { path: "/profile", changefreq: "monthly", priority: "0.3" },
  { path: "/my-vendor-profile", changefreq: "monthly", priority: "0.3" },
];

async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: events } = await supabase.from("events").select("id").limit(1000);
    events?.forEach((e: any) =>
      entries.push({ path: `/event/${e.id}`, changefreq: "weekly", priority: "0.7" }),
    );

    const { data: vendors } = await supabase
      .from("vendor_profiles" as any)
      .select("id")
      .limit(1000);
    vendors?.forEach((v: any) =>
      entries.push({ path: `/vendor/${v.id}`, changefreq: "weekly", priority: "0.6" }),
    );
  } catch (err) {
    console.warn("sitemap: dynamic fetch failed, continuing with static entries", err);
  }
  return entries;
}

function render(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

const dynamic = await fetchDynamicEntries();
const all = [...staticEntries, ...dynamic];
writeFileSync(resolve("public/sitemap.xml"), render(all));
console.log(`sitemap.xml written (${all.length} entries)`);
