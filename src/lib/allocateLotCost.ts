export type AllocationMethod = "market_weighted" | "even";

export interface AllocateLine {
  id: string;
  quantity: number;
  marketValue: number | null;
}

export interface AllocatedLine {
  id: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  shipShare: number;
  feeShare: number;
  sharePct: number;
}

export function allocateLotCost(
  lines: AllocateLine[],
  lotTotal: number,
  shipping: number,
  fees: number,
  method: AllocationMethod
): AllocatedLine[] {
  if (lines.length === 0) return [];

  let weights = lines.map((l) => {
    if (method === "market_weighted") {
      return l.quantity * Math.max(l.marketValue ?? 0, 0);
    }
    return l.quantity;
  });

  let totalWeight = weights.reduce((a, b) => a + b, 0);

  // Fallback to even if market weighted total is 0
  if (totalWeight === 0 && method === "market_weighted") {
    weights = lines.map((l) => l.quantity);
    totalWeight = weights.reduce((a, b) => a + b, 0);
  }

  // If still 0 (e.g. all quantities are 0), return zeros
  if (totalWeight === 0) {
    return lines.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      unitCost: 0,
      lineTotal: 0,
      shipShare: 0,
      feeShare: 0,
      sharePct: 0,
    }));
  }

  const distribute = (total: number, ws: number[]) => {
    const totalCents = Math.round(total * 100);
    // Use shares to calculate initial floor cents
    const resultsCents = ws.map((w) => Math.floor((w / totalWeight) * totalCents + 1e-9));
    const currentSumCents = resultsCents.reduce((a, b) => a + b, 0);
    const remainderCents = totalCents - currentSumCents;

    if (remainderCents > 0) {
      // Sort indices by weight (desc), then original index (asc)
      const sortedIndices = ws
        .map((w, i) => ({ w, i }))
        .sort((a, b) => b.w - a.w || a.i - b.i);

      for (let i = 0; i < remainderCents; i++) {
        resultsCents[sortedIndices[i].i]++;
      }
    }
    return resultsCents.map((c) => c / 100);
  };

  const lineTotals = distribute(lotTotal, weights);
  const shipShares = distribute(shipping, weights);
  const feeShares = distribute(fees, weights);

  return lines.map((line, i) => {
    const lineTotal = lineTotals[i];
    return {
      id: line.id,
      quantity: line.quantity,
      lineTotal,
      shipShare: shipShares[i],
      feeShare: feeShares[i],
      sharePct: weights[i] / totalWeight,
      unitCost: line.quantity > 0 ? Math.round((lineTotal / line.quantity) * 100) / 100 : 0,
    };
  });
}
