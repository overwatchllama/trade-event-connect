import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  GraduationCap,
} from "lucide-react";
import { useDemoSession } from "@/hooks/useDemoSession";
import {
  DEMO_TOURS,
  isTourDismissed,
  personaFromEmail,
  setTourDismissed,
  type PersonaKey,
  type TourStep,
} from "./demoTours";

/**
 * Custom event used to re-open the tour from the DemoBanner.
 * Dispatched on `window`.
 */
export const DEMO_TOUR_OPEN_EVENT = "cc:demo-tour:open";

const matchesRoute = (pathname: string, route: string) =>
  route === "*" || pathname === route || pathname.startsWith(route);

export const DemoTourOverlay = () => {
  const { isDemo, email } = useDemoSession();
  const location = useLocation();
  const persona = useMemo<PersonaKey | null>(
    () => personaFromEmail(email),
    [email],
  );

  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  // Open automatically the first time a persona lands somewhere with a step,
  // unless they've previously dismissed it.
  useEffect(() => {
    if (!isDemo || !persona) {
      setOpen(false);
      return;
    }
    if (isTourDismissed(persona)) return;
    setOpen(true);
    setStepIdx(0);
  }, [isDemo, persona]);

  // Allow the DemoBanner (or anywhere) to re-open the tour.
  useEffect(() => {
    const handler = () => {
      if (!persona) return;
      setTourDismissed(persona, false);
      setStepIdx(0);
      setOpen(true);
    };
    window.addEventListener(DEMO_TOUR_OPEN_EVENT, handler);
    return () => window.removeEventListener(DEMO_TOUR_OPEN_EVENT, handler);
  }, [persona]);

  // Reset to the first matching step when route changes while open.
  useEffect(() => {
    if (!open || !persona) return;
    const steps = DEMO_TOURS[persona].steps;
    const firstMatch = steps.findIndex((s) => matchesRoute(location.pathname, s.route));
    if (firstMatch >= 0) setStepIdx(firstMatch);
  }, [location.pathname, open, persona]);

  if (!isDemo || !persona || !open) return null;

  const allSteps = DEMO_TOURS[persona].steps;
  const visibleSteps: { step: TourStep; index: number }[] = allSteps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => matchesRoute(location.pathname, step.route));

  if (visibleSteps.length === 0) return null;

  // Find current position within visibleSteps based on stepIdx.
  const currentVisiblePos = Math.max(
    0,
    visibleSteps.findIndex((v) => v.index === stepIdx),
  );
  const current = visibleSteps[currentVisiblePos] ?? visibleSteps[0];
  const totalVisible = visibleSteps.length;
  const isFirst = currentVisiblePos === 0;
  const isLast = currentVisiblePos === totalVisible - 1;

  const handleClose = () => {
    setTourDismissed(persona, true);
    setOpen(false);
  };

  const handleNext = () => {
    if (isLast) {
      handleClose();
      return;
    }
    setStepIdx(visibleSteps[currentVisiblePos + 1].index);
  };

  const handlePrev = () => {
    if (isFirst) return;
    setStepIdx(visibleSteps[currentVisiblePos - 1].index);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] w-[min(92vw,22rem)] animate-in fade-in slide-in-from-bottom-4"
      role="dialog"
      aria-label={`${DEMO_TOURS[persona].label} step ${currentVisiblePos + 1} of ${totalVisible}`}
    >
      <div className="rounded-xl border border-primary/30 bg-background/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Sparkles className="h-3 w-3" />
                {DEMO_TOURS[persona].label}
              </Badge>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Step {currentVisiblePos + 1} of {totalVisible}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -mr-1 -mt-1"
            onClick={handleClose}
            aria-label="Dismiss tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <h3 className="mb-1.5 text-base font-semibold leading-tight">
          {current.step.title}
        </h3>
        <p className="text-sm text-muted-foreground">{current.step.body}</p>

        {current.step.cta && (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="mt-3 w-full"
          >
            <Link to={current.step.cta.to}>{current.step.cta.label}</Link>
          </Button>
        )}

        {/* Step dots */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {visibleSteps.map((v, i) => (
            <span
              key={v.index}
              className={`h-1.5 rounded-full transition-all ${
                i === currentVisiblePos
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={isFirst}
            className="h-8"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Button>
          <Button size="sm" onClick={handleNext} className="h-8">
            {isLast ? "Finish" : "Next"}
            {!isLast && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
