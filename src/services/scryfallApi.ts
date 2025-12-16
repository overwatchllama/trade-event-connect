/**
 * Scryfall API Service for Magic: The Gathering
 * https://scryfall.com/docs/api
 *
 * This service provides integration with the Scryfall API to fetch
 * MTG sets, cards, and pricing data.
 */

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  uri: string;
  scryfall_uri: string;
  search_uri: string;
  released_at: string;
  set_type: string;
  card_count: number;
  digital: boolean;
  nonfoil_only: boolean;
  foil_only: boolean;
  icon_svg_uri: string;
}

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  lang: string;
  released_at: string;
  uri: string;
  scryfall_uri: string;
  layout: string;
  highres_image: boolean;
  image_status: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity: string[];
  keywords: string[];
  legalities: Record<string, string>;
  games: string[];
  reserved: boolean;
  foil: boolean;
  nonfoil: boolean;
  finishes: string[];
  oversized: boolean;
  promo: boolean;
  reprint: boolean;
  variation: boolean;
  set_id: string;
  set: string;
  set_name: string;
  set_type: string;
  set_uri: string;
  set_search_uri: string;
  scryfall_set_uri: string;
  rulings_uri: string;
  prints_search_uri: string;
  collector_number: string;
  digital: boolean;
  rarity: string;
  flavor_text?: string;
  card_back_id: string;
  artist?: string;
  artist_ids?: string[];
  border_color: string;
  frame: string;
  full_art: boolean;
  textless: boolean;
  booster: boolean;
  story_spotlight: boolean;
  prices: {
    usd?: string | null;
    usd_foil?: string | null;
    usd_etched?: string | null;
    eur?: string | null;
    eur_foil?: string | null;
    tix?: string | null;
  };
  related_uris: {
    gatherer?: string;
    tcgplayer_infinite_articles?: string;
    tcgplayer_infinite_decks?: string;
    edhrec?: string;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  };
}

export interface ScryfallListResponse<T> {
  object: 'list';
  total_cards?: number;
  has_more: boolean;
  next_page?: string;
  data: T[];
}

const API_BASE_URL = 'https://api.scryfall.com';

class ScryfallApiService {
  private async fetchWithDelay<T>(url: string): Promise<T> {
    // Scryfall requests 50-100ms delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Scryfall API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all MTG sets
   */
  async getSets(): Promise<ScryfallSet[]> {
    const url = `${API_BASE_URL}/sets`;
    const response = await this.fetchWithDelay<ScryfallListResponse<ScryfallSet>>(url);
    return response.data;
  }

  /**
   * Get a single set by code or ID
   */
  async getSet(setCodeOrId: string): Promise<ScryfallSet> {
    const url = `${API_BASE_URL}/sets/${setCodeOrId}`;
    return this.fetchWithDelay<ScryfallSet>(url);
  }

  /**
   * Search for cards
   */
  async searchCards(query: string, options?: {
    unique?: 'cards' | 'art' | 'prints';
    order?: 'name' | 'set' | 'released' | 'rarity' | 'color' | 'usd' | 'tix' | 'eur' | 'cmc' | 'power' | 'toughness' | 'edhrec' | 'artist';
    dir?: 'auto' | 'asc' | 'desc';
    include_extras?: boolean;
    include_multilingual?: boolean;
    include_variations?: boolean;
    page?: number;
  }): Promise<ScryfallListResponse<ScryfallCard>> {
    const params = new URLSearchParams({ q: query });
    if (options?.unique) params.append('unique', options.unique);
    if (options?.order) params.append('order', options.order);
    if (options?.dir) params.append('dir', options.dir);
    if (options?.include_extras !== undefined) params.append('include_extras', options.include_extras.toString());
    if (options?.include_multilingual !== undefined) params.append('include_multilingual', options.include_multilingual.toString());
    if (options?.include_variations !== undefined) params.append('include_variations', options.include_variations.toString());
    if (options?.page) params.append('page', options.page.toString());

    const url = `${API_BASE_URL}/cards/search?${params.toString()}`;
    return this.fetchWithDelay<ScryfallListResponse<ScryfallCard>>(url);
  }

  /**
   * Get a card by ID
   */
  async getCard(cardId: string): Promise<ScryfallCard> {
    const url = `${API_BASE_URL}/cards/${cardId}`;
    return this.fetchWithDelay<ScryfallCard>(url);
  }

  /**
   * Get a card by set code and collector number
   */
  async getCardBySetAndNumber(setCode: string, collectorNumber: string): Promise<ScryfallCard> {
    const url = `${API_BASE_URL}/cards/${setCode}/${collectorNumber}`;
    return this.fetchWithDelay<ScryfallCard>(url);
  }

  /**
   * Search cards by name
   */
  async searchCardsByName(name: string, exact: boolean = false): Promise<ScryfallListResponse<ScryfallCard>> {
    const query = exact ? `!"${name}"` : name;
    return this.searchCards(query);
  }

  /**
   * Get cards from a specific set
   */
  async getCardsFromSet(setCode: string, page: number = 1): Promise<ScryfallListResponse<ScryfallCard>> {
    return this.searchCards(`set:${setCode}`, { page });
  }

  /**
   * Get all cards from a set (handles pagination)
   */
  async getAllCardsFromSet(setCode: string): Promise<ScryfallCard[]> {
    const allCards: ScryfallCard[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getCardsFromSet(setCode, page);
      allCards.push(...response.data);
      hasMore = response.has_more;
      page++;
    }

    return allCards;
  }

  /**
   * Build advanced search query
   */
  buildQuery(filters: {
    name?: string;
    set?: string;
    type?: string;
    colors?: string[];
    rarity?: string;
    cmc?: { min?: number; max?: number; exact?: number };
    power?: string;
    toughness?: string;
    oracle?: string;
    format?: string;
    isCommander?: boolean;
  }): string {
    const queryParts: string[] = [];

    if (filters.name) {
      queryParts.push(`"${filters.name}"`);
    }
    if (filters.set) {
      queryParts.push(`set:${filters.set}`);
    }
    if (filters.type) {
      queryParts.push(`type:${filters.type}`);
    }
    if (filters.colors && filters.colors.length > 0) {
      queryParts.push(`color:${filters.colors.join('')}`);
    }
    if (filters.rarity) {
      queryParts.push(`rarity:${filters.rarity}`);
    }
    if (filters.cmc) {
      if (filters.cmc.exact !== undefined) {
        queryParts.push(`cmc:${filters.cmc.exact}`);
      } else {
        if (filters.cmc.min !== undefined) {
          queryParts.push(`cmc>=${filters.cmc.min}`);
        }
        if (filters.cmc.max !== undefined) {
          queryParts.push(`cmc<=${filters.cmc.max}`);
        }
      }
    }
    if (filters.power) {
      queryParts.push(`power:${filters.power}`);
    }
    if (filters.toughness) {
      queryParts.push(`toughness:${filters.toughness}`);
    }
    if (filters.oracle) {
      queryParts.push(`oracle:"${filters.oracle}"`);
    }
    if (filters.format) {
      queryParts.push(`format:${filters.format}`);
    }
    if (filters.isCommander) {
      queryParts.push('is:commander');
    }

    return queryParts.join(' ');
  }

  /**
   * Get card price
   */
  getCardPrice(card: ScryfallCard, variant: 'usd' | 'usd_foil' | 'usd_etched' | 'eur' | 'eur_foil' = 'usd'): number | null {
    const priceStr = card.prices[variant];
    return priceStr ? parseFloat(priceStr) : null;
  }

  /**
   * Autocomplete card names
   */
  async autocomplete(query: string): Promise<string[]> {
    const url = `${API_BASE_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`;
    const response = await this.fetchWithDelay<{ data: string[] }>(url);
    return response.data;
  }

  /**
   * Get random card
   */
  async getRandomCard(query?: string): Promise<ScryfallCard> {
    const url = query
      ? `${API_BASE_URL}/cards/random?q=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/cards/random`;
    return this.fetchWithDelay<ScryfallCard>(url);
  }
}

// Export singleton instance
export const scryfallApi = new ScryfallApiService();
