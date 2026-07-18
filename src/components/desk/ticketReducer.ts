export type TicketMode = "sell" | "buy" | "trade";
export type LineSide = "sell" | "buy";

export type TicketLine = {
  key: string;
  side: LineSide;
  deal_list_item_id?: string | null;
  card_name: string;
  set_name?: string | null;
  card_number?: string | null;
  condition?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price?: number | null;   // customer-facing price
  unit_cost?: number | null;    // cost basis
  market_snapshot?: number | null;
  game?: string;
};

export type TenderEntry = { method: string; amount: number };

export type TicketState = {
  mode: TicketMode;
  lines: TicketLine[];
  tender: TenderEntry[];
  customer_label: string;
  notes: string;
  fees: number;
  event_id?: string | null;
  personal_event_id?: string | null;
};

export type TicketAction =
  | { type: "reset"; mode: TicketMode }
  | { type: "add_line"; line: TicketLine }
  | { type: "update_line"; key: string; patch: Partial<TicketLine> }
  | { type: "remove_line"; key: string }
  | { type: "set_customer"; value: string }
  | { type: "set_notes"; value: string }
  | { type: "set_fees"; value: number }
  | { type: "set_tender"; tender: TenderEntry[] };

export const emptyTicket = (mode: TicketMode): TicketState => ({
  mode,
  lines: [],
  tender: [],
  customer_label: "",
  notes: "",
  fees: 0,
});

export function ticketReducer(state: TicketState, action: TicketAction): TicketState {
  switch (action.type) {
    case "reset":
      return emptyTicket(action.mode);
    case "add_line": {
      // Merge same inventory row
      if (action.line.deal_list_item_id) {
        const existing = state.lines.find(
          (l) => l.deal_list_item_id === action.line.deal_list_item_id && l.side === action.line.side,
        );
        if (existing) {
          return {
            ...state,
            lines: state.lines.map((l) =>
              l.key === existing.key ? { ...l, quantity: l.quantity + action.line.quantity } : l,
            ),
          };
        }
      }
      return { ...state, lines: [...state.lines, action.line] };
    }
    case "update_line":
      return {
        ...state,
        lines: state.lines.map((l) => (l.key === action.key ? { ...l, ...action.patch } : l)),
      };
    case "remove_line":
      return { ...state, lines: state.lines.filter((l) => l.key !== action.key) };
    case "set_customer":
      return { ...state, customer_label: action.value };
    case "set_notes":
      return { ...state, notes: action.value };
    case "set_fees":
      return { ...state, fees: action.value };
    case "set_tender":
      return { ...state, tender: action.tender };
  }
}

export const sellSubtotal = (s: TicketState) =>
  s.lines
    .filter((l) => l.side === "sell")
    .reduce((sum, l) => sum + (l.unit_price ?? 0) * l.quantity, 0);

export const buySubtotal = (s: TicketState) =>
  s.lines
    .filter((l) => l.side === "buy")
    .reduce((sum, l) => sum + (l.unit_cost ?? 0) * l.quantity, 0);

export const tenderTotal = (s: TicketState) =>
  s.tender.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
