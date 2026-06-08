import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Loader2, X, Sparkles, DollarSign, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DetectedCard {
  bbox: { x: number; y: number; w: number; h: number };
  game: "pokemon" | "onepiece" | "unknown";
  guess_name: string | null;
  guess_set: string | null;
  guess_set_code: string | null;
  guess_set_symbol_description: string | null;
  guess_number: string | null;
  guess_total: string | null;
  confidence_basis: "number_and_set" | "number_only" | "set_only" | "name_only" | "low" | null;
  notes: string | null;
  is_slab: boolean | null;
  grading_company: "PSA" | "BGS" | "CGC" | "SGC" | "TAG" | "HGA" | "GMA" | "OTHER" | null;
  grade: string | null;
  cert_number: string | null;
}

interface Props {
  userId: string;
  onCancel: () => void;
  /** Called when user confirms "Get Pricing" — parent loads the still frame + match panel. */
  onPriceIt: (params: {
    imageUrl: string;
    detected: DetectedCard[];
  }) => void;
}

/**
 * Live video scanner: holds a card in front of the camera, taps "Identify",
 * sees the AI guess, then taps "Get Pricing" to send it through to the
 * normal match-and-price flow.
 */
export const LiveScanCapture = ({ userId, onCancel, onPriceIt }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState<{
    imageUrl: string;
    detected: DetectedCard[];
    previewDataUrl: string;
  } | null>(null);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not start camera";
        toast({ title: "Camera unavailable", description: msg, variant: "destructive" });
        onCancel();
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onCancel]);

  const captureBlob = useCallback(async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    if (!blob) return null;
    return { blob, dataUrl };
  }, []);

  const handleIdentify = async () => {
    if (identifying) return;
    setIdentifying(true);
    try {
      const cap = await captureBlob();
      if (!cap) throw new Error("Could not capture frame");

      const path = `${userId}/${Date.now()}-live.jpg`;
      const { error: upErr } = await supabase.storage
        .from("card-scans")
        .upload(path, cap.blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { data: signed, error: sErr } = await supabase.storage
        .from("card-scans")
        .createSignedUrl(path, 600);
      if (sErr || !signed) throw new Error(sErr?.message ?? "Could not sign URL");

      const { data, error } = await supabase.functions.invoke("scan-cards", {
        body: { imageUrl: signed.signedUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const rawCards: DetectedCard[] = data?.cards ?? [];
      const cards = [...rawCards].sort((a, b) => {
        const rowA = Math.floor((a.bbox.y + a.bbox.h / 2) * 4);
        const rowB = Math.floor((b.bbox.y + b.bbox.h / 2) * 4);
        if (rowA !== rowB) return rowA - rowB;
        return a.bbox.x - b.bbox.x;
      });

      if (cards.length === 0) {
        toast({
          title: "No card identified",
          description: "Hold the card steady, fill the frame, and try again.",
        });
        return;
      }

      setIdentified({
        imageUrl: signed.signedUrl,
        detected: cards,
        previewDataUrl: cap.dataUrl,
      });
      // Pause the live preview while the user decides
      videoRef.current?.pause();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Identify failed";
      toast({ title: "Identify failed", description: msg, variant: "destructive" });
    } finally {
      setIdentifying(false);
    }
  };

  const handleRetake = async () => {
    setIdentified(null);
    try {
      await videoRef.current?.play();
    } catch {
      // ignored
    }
  };

  const top = identified?.detected[0];

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-black aspect-[3/4] sm:aspect-video">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-contain ${identified ? "hidden" : ""}`}
        />
        {identified && (
          <img
            src={identified.previewDataUrl}
            alt="Captured card"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Framing guide */}
        {!identified && ready && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="border-2 border-primary/70 rounded-lg w-[60%] h-[80%] max-w-[260px] shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>
        )}

        {identifying && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Identifying card…</p>
          </div>
        )}

        {/* Close */}
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2 h-9 w-9 rounded-full shadow-md"
          onClick={onCancel}
          aria-label="Close camera"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Identification result overlay */}
        {identified && top && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent p-4 text-white space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Badge className="bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3 mr-1" /> Identified
              </Badge>
              {top.is_slab && (
                <Badge className="bg-amber-500 text-white border-transparent">
                  {top.grading_company ?? "Slab"}
                  {top.grade ? ` ${top.grade}` : ""}
                </Badge>
              )}
              {identified.detected.length > 1 && (
                <Badge variant="secondary">+{identified.detected.length - 1} more</Badge>
              )}
            </div>
            <p className="text-base font-semibold leading-tight">
              {top.guess_name ?? "Unknown card"}
            </p>
            <p className="text-xs text-white/80">
              {[top.guess_set, top.guess_set_code, top.guess_number && `#${top.guess_number}`]
                .filter(Boolean)
                .join(" · ") || "No set/number read"}
            </p>
          </div>
        )}
      </div>

      <div className="p-3 border-t flex items-center justify-between gap-2 flex-wrap">
        {!identified ? (
          <>
            <p className="text-xs text-muted-foreground">
              Hold a card inside the frame, then tap Identify.
            </p>
            <Button onClick={handleIdentify} disabled={!ready || identifying}>
              <Camera className="h-4 w-4 mr-2" />
              {identifying ? "Identifying…" : "Identify Card"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleRetake}>
              <RotateCcw className="h-4 w-4 mr-2" /> Retake
            </Button>
            <Button
              onClick={() =>
                onPriceIt({ imageUrl: identified.imageUrl, detected: identified.detected })
              }
            >
              <DollarSign className="h-4 w-4 mr-2" /> Get Pricing
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};
