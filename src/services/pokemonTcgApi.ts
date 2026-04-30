/**
 * Pokemon TCG API Service
 * https://pokemontcg.io/
 *
 * This service provides integration with the Pokemon TCG API to fetch
 * sets, cards, and pricing data for the collection management system.
 */

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities: Record<string, string>;
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  rules?: string[];
  attacks?: Array<{
    name: string;
    cost: string[];
    convertedEnergyCost: number;
    damage: string;
    text: string;
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  resistances?: Array<{
    type: string;
    value: string;
  }>;
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: Record<string, string>;
    releaseDate: string;
    ptcgoCode?: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities: Record<string, string>;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: {
      holofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow?: number;
      };
      reverseHolofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow?: number;
      };
      normal?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow?: number;
      };
      '1stEditionHolofoil'?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow?: number;
      };
    };
  };
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices: {
      averageSellPrice: number;
      lowPrice: number;
      trendPrice: number;
      germanProLow: number;
      suggestedPrice: number;
      reverseHoloSell: number;
      reverseHoloLow: number;
      reverseHoloTrend: number;
      lowPriceExPlus: number;
      avg1: number;
      avg7: number;
      avg30: number;
      reverseHoloAvg1: number;
      reverseHoloAvg7: number;
      reverseHoloAvg30: number;
    };
  };
}

export interface ApiResponse<T> {
  data: T;
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
}

const API_BASE_URL = 'https://api.pokemontcg.io/v2';
const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY; // Optional but recommended

class PokemonTcgApiService {
  private headers: HeadersInit;

  constructor() {
    this.headers = {
      'Content-Type': 'application/json',
    };
    if (API_KEY) {
      this.headers['X-Api-Key'] = API_KEY;
    }
  }

  /**
   * Fetch all Pokemon TCG sets
   */
  async getSets(params?: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
  }): Promise<ApiResponse<PokemonSet[]>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.orderBy) queryParams.append('orderBy', params.orderBy);

    const url = `${API_BASE_URL}/sets?${queryParams.toString()}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch a single set by ID
   */
  async getSet(setId: string): Promise<ApiResponse<PokemonSet>> {
    const url = `${API_BASE_URL}/sets/${setId}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch set: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for cards
   */
  async searchCards(params: {
    q?: string; // Query string (e.g., "name:Charizard")
    page?: number;
    pageSize?: number;
    orderBy?: string;
    select?: string;
  }): Promise<ApiResponse<PokemonCard[]>> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params.select) queryParams.append('select', params.select);

    const url = `${API_BASE_URL}/cards?${queryParams.toString()}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Failed to search cards: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a single card by ID
   */
  async getCard(cardId: string): Promise<ApiResponse<PokemonCard>> {
    const url = `${API_BASE_URL}/cards/${cardId}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get cards from a specific set
   */
  async getCardsFromSet(setId: string, params?: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
  }): Promise<ApiResponse<PokemonCard[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', `set.id:${setId}`);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.orderBy) queryParams.append('orderBy', params.orderBy);

    const url = `${API_BASE_URL}/cards?${queryParams.toString()}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch cards from set: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search cards by name
   */
  async searchCardsByName(name: string, params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PokemonCard[]>> {
    return this.searchCards({
      q: `name:"${name}"`,
      ...params,
    });
  }

  /**
   * Get cards by type
   */
  async getCardsByType(type: string, params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PokemonCard[]>> {
    return this.searchCards({
      q: `types:${type}`,
      ...params,
    });
  }

  /**
   * Get cards by rarity
   */
  async getCardsByRarity(rarity: string, params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PokemonCard[]>> {
    return this.searchCards({
      q: `rarity:"${rarity}"`,
      ...params,
    });
  }

  /**
   * Get market price for a card variant
   */
  getCardPrice(card: PokemonCard, variant: 'normal' | 'holofoil' | 'reverseHolofoil' | '1stEditionHolofoil' = 'normal'): number | null {
    if (card.tcgplayer?.prices?.[variant]) {
      return card.tcgplayer.prices[variant].market || card.tcgplayer.prices[variant].mid || null;
    }
    if (card.cardmarket?.prices) {
      if (variant === 'reverseHolofoil') {
        return card.cardmarket.prices.reverseHoloSell || card.cardmarket.prices.averageSellPrice;
      }
      return card.cardmarket.prices.averageSellPrice;
    }
    return null;
  }

  /**
   * Build query string for advanced search
   * Example queries:
   * - name:Charizard
   * - set.name:"Base Set"
   * - types:fire
   * - rarity:"Rare Holo"
   * - hp:[50 TO *]
   * - nationalPokedexNumbers:6
   */
  buildQuery(filters: {
    name?: string;
    setName?: string;
    types?: string[];
    rarity?: string;
    supertype?: string;
    subtypes?: string[];
    hp?: { min?: number; max?: number };
    nationalPokedexNumber?: number;
  }): string {
    const queryParts: string[] = [];

    if (filters.name) {
      queryParts.push(`name:"${filters.name}"`);
    }
    if (filters.setName) {
      queryParts.push(`set.name:"${filters.setName}"`);
    }
    if (filters.types && filters.types.length > 0) {
      queryParts.push(`types:${filters.types.join(' OR types:')}`);
    }
    if (filters.rarity) {
      queryParts.push(`rarity:"${filters.rarity}"`);
    }
    if (filters.supertype) {
      queryParts.push(`supertype:${filters.supertype}`);
    }
    if (filters.subtypes && filters.subtypes.length > 0) {
      queryParts.push(`subtypes:${filters.subtypes.join(' OR subtypes:')}`);
    }
    if (filters.hp) {
      const min = filters.hp.min || 0;
      const max = filters.hp.max || '*';
      queryParts.push(`hp:[${min} TO ${max}]`);
    }
    if (filters.nationalPokedexNumber) {
      queryParts.push(`nationalPokedexNumbers:${filters.nationalPokedexNumber}`);
    }

    return queryParts.join(' ');
  }
}

// Export singleton instance
export const pokemonTcgApi = new PokemonTcgApiService();
