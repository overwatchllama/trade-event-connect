import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { searchCards, type ResolvedCard } from "@/services/cardLookup";
import { Camera, Upload, Loader2, ListPlus, ScanLine, ArrowRight } from "lucide-react";
import { CardMatchPanel } from "@/components/scanner/CardMatchPanel";

interface DetectedCard {
  bbox: { x: number; y: number; w: number; h: number };
  game: "pokemon" | "onepiece" | "unknown";
  guess_name: string | null;
  guess_set: string | null;
  guess_set_code: string | null;
  guess_set_symbol_description: string | null;
  guess_number: string | null;
  guess_total: string | null;
  confidence_basis:
    | "number_and_set"
    | "number_only"
    | "set_only"
    | "name_only"
    | "low"
    | null;
  notes: string | null;
  is_slab: boolean | null;
  grading_company:
    | "PSA"
    | "BGS"
    | "CGC"
    | "SGC"
    | "TAG"
    | "HGA"
    | "GMA"
    | "OTHER"
    | null;
  grade: string | null;
  cert_number: string | null;
}

/**
 * Build the eBay query suffix for a graded slab so sold comps reflect graded prices.
 * e.g. PSA 10, BGS 9.5, CGC 10.
 */
const buildGradeQuery = (c: DetectedCard): string | null => {
  if (!c.is_slab || !c.grade) return null;
  const company = c.grading_company && c.grading_company !== "OTHER" ? c.grading_company : "";
  // Strip noisy words; keep the numeric grade
  const grade = c.grade.replace(/gem\s*mt|mint|black\s*label/gi, "").trim();
  const combined = `${company} ${grade}`.trim();
  return combined || null;
};

const CardScanner = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedCard[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [matches, setMatches] = useState<ResolvedCard[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!user) return;
      setDetected([]);
      setActiveIdx(null);
      setMatches([]);

      // Upload to private bucket under user folder
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("card-scans")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        return;
      }
      // Signed URL so the AI can fetch it
      const { data: signed, error: sErr } = await supabase.storage
        .from("card-scans")
        .createSignedUrl(path, 600);
      if (sErr || !signed) {
        toast({ title: "Could not sign URL", description: sErr?.message, variant: "destructive" });
        return;
      }
      setImageUrl(signed.signedUrl);

      setScanning(true);
      try {
        const { data, error } = await supabase.functions.invoke("scan-cards", {
          body: { imageUrl: signed.signedUrl },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const cards: DetectedCard[] = data?.cards ?? [];
        setDetected(cards);
        if (cards.length === 0) {
          toast({ title: "No cards detected", description: "Try a clearer photo with better lighting." });
        } else {
          toast({ title: `Detected ${cards.length} card${cards.length === 1 ? "" : "s"}`, description: "Tap any card to see pricing." });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Scan failed";
        toast({ title: "Scan failed", description: msg, variant: "destructive" });
      } finally {
        setScanning(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const onPickCard = async (idx: number) => {
    setActiveIdx(idx);
    const card = detected[idx];
    setMatchLoading(true);
    setMatches([]);
    try {
      const results = await searchCards({
        game: card.game,
        name: card.guess_name,
        number: card.guess_number,
        setHint: card.guess_set,
        setCode: card.guess_set_code,
        gradeQuery: buildGradeQuery(card),
      });
      setMatches(results);
      if (results.length === 0) {
        toast({ title: "No matches found", description: "AI guess may be off. Try another card or refine the photo." });
      }
    } finally {
      setMatchLoading(false);
    }
  };

  const addToDealList = async (m: ResolvedCard) => {
    if (!user || activeIdx === null) return;
    const det = detected[activeIdx];
    const { error } = await supabase.from("deal_list_items").insert({
      user_id: user.id,
      scan_image_url: imageUrl,
      game: m.game,
      card_name: m.name,
      set_name: m.setName,
      card_number: m.number,
      rarity: m.rarity,
      external_id: m.externalId,
      image_url: m.imageUrl,
      tcgplayer_market_price: m.tcgplayerMarketPrice,
      tcgplayer_url: m.tcgplayerUrl,
      ebay_search_url: m.ebaySearchUrl,
      bbox: det.bbox,
    });
    if (error) {
      toast({ title: "Could not add", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Added to Deal List", description: m.name });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing | Collector Companion</title>
        <meta name="description" content="Snap a photo of multiple trading cards to instantly identify and price them. Build a Deal List then save to your collection." />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ScanLine className="h-7 w-7 text-primary" />
              Pricing
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Snap a photo of one or many cards. Tap each detected card to see TCGplayer & eBay pricing.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/deal-list")}>
            <ListPlus className="h-4 w-4 mr-2" /> View Deal List <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {!imageUrl && (
          <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center gap-4">
            <ScanLine className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">Upload or snap a photo of your cards</p>
              <p className="text-sm text-muted-foreground">Pokémon and One Piece TCG supported</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" /> Take Photo
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload Image
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </Card>
        )}

        {imageUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <Card className="overflow-hidden">
              <div className="relative bg-muted">
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Scanned cards"
                  className="block w-full h-auto"
                />
                {/* Bounding box overlays */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full"
                >
                  {detected.map((c, i) => (
                    <rect
                      key={i}
                      x={c.bbox.x * 100}
                      y={c.bbox.y * 100}
                      width={c.bbox.w * 100}
                      height={c.bbox.h * 100}
                      fill={activeIdx === i ? "hsl(var(--primary) / 0.15)" : "transparent"}
                      stroke="hsl(var(--primary))"
                      strokeWidth={activeIdx === i ? 2.5 : 1.5}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer transition-all"
                      onClick={() => onPickCard(i)}
                      style={{ pointerEvents: "auto" }}
                    />
                  ))}
                </svg>
                {/* Number badges as HTML so they stay legible regardless of image aspect ratio */}
                {detected.map((c, i) => (
                  <button
                    key={`badge-${i}`}
                    type="button"
                    onClick={() => onPickCard(i)}
                    className={`absolute h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-background transition-transform ${
                      activeIdx === i
                        ? "bg-primary text-primary-foreground scale-110"
                        : "bg-primary/90 text-primary-foreground hover:scale-110"
                    }`}
                    style={{
                      left: `calc(${c.bbox.x * 100}% + 4px)`,
                      top: `calc(${c.bbox.y * 100}% + 4px)`,
                    }}
                    aria-label={`Card ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                ))}

                {scanning && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Detecting cards…</p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{detected.length} detected</Badge>
                  {detected.length > 0 && (
                    <span className="text-muted-foreground">Tap any number to see matches</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setImageUrl(null); setDetected([]); setActiveIdx(null); setMatches([]); }}>
                    New Photo
                  </Button>
                </div>
              </div>
            </Card>

            <CardMatchPanel
              activeIdx={activeIdx}
              detected={detected}
              matches={matches}
              loading={matchLoading}
              onAdd={addToDealList}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default CardScanner;
