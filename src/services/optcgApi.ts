/**
 * One Piece TCG API Service
 * https://optcgapi.com/
 */

const API_BASE = 'https://optcgapi.com/api';

export interface OPTCGSet {
  set_name: string;
  set_id: string;
}

export interface OPTCGStarterDeck {
  structure_deck_name: string;
  structure_deck_id: string;
}

export interface OPTCGCard {
  inventory_price: number | null;
  market_price: number | null;
  card_name: string;
  set_name: string;
  card_text: string;
  set_id: string;
  rarity: string;
  card_set_id: string;
  card_color: string;
  card_type: string;
  life: string | null;
  card_cost: string | null;
  card_power: string | null;
  sub_types: string;
  counter_amount: number | null;
  attribute: string;
  date_scraped: string;
  card_image_id: string;
  card_image: string;
}

class OptcgApiService {
  private cache = new Map<string, { data: unknown; ts: number }>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 min

  private async fetchCached<T>(url: string): Promise<T> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data as T;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OPTCG API error: ${res.statusText}`);
    const data = await res.json();
    this.cache.set(url, { data, ts: Date.now() });
    return data as T;
  }

  async getAllSets(): Promise<OPTCGSet[]> {
    return this.fetchCached<OPTCGSet[]>(`${API_BASE}/allSets/`);
  }

  async getAllStarterDecks(): Promise<OPTCGStarterDeck[]> {
    return this.fetchCached<OPTCGStarterDeck[]>(`${API_BASE}/allDecks/`);
  }

  async getSetCards(setId: string): Promise<OPTCGCard[]> {
    return this.fetchCached<OPTCGCard[]>(`${API_BASE}/sets/${setId}/`);
  }

  async getStarterDeckCards(deckId: string): Promise<OPTCGCard[]> {
    return this.fetchCached<OPTCGCard[]>(`${API_BASE}/decks/${deckId}/`);
  }

  async getCard(cardId: string): Promise<OPTCGCard[]> {
    return this.fetchCached<OPTCGCard[]>(`${API_BASE}/sets/card/${cardId}/`);
  }

  async getFilteredCards(filters: {
    card_name?: string;
    card_color?: string;
    card_type?: string;
    rarity?: string;
    set_name?: string;
  }): Promise<OPTCGCard[]> {
    const params = new URLSearchParams();
    if (filters.card_name) params.append('card_name', filters.card_name);
    if (filters.card_color) params.append('card_color', filters.card_color);
    if (filters.card_type) params.append('card_type', filters.card_type);
    if (filters.rarity) params.append('rarity', filters.rarity);
    if (filters.set_name) params.append('set_name', filters.set_name);
    return this.fetchCached<OPTCGCard[]>(`${API_BASE}/sets/filtered/?${params.toString()}`);
  }
}

export const optcgApi = new OptcgApiService();
