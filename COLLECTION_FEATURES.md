# Personal Collection Feature - TCGCollector-like Functionality

This document describes the comprehensive personal collection management system inspired by TCGCollector.com.

## Overview

The enhanced collection system provides professional-grade TCG (Trading Card Game) collection management with features matching industry-leading platforms like TCGCollector.com.

## Key Features

### 1. Real-Time Card Database Integration

**Pokemon TCG API Integration**
- Search and add cards directly from the official Pokemon TCG API
- Automatic price data from TCGPlayer and Cardmarket
- Complete card metadata including HP, types, attacks, and abilities
- High-resolution card images

**Magic: The Gathering (Scryfall API)**
- Full integration with Scryfall's comprehensive MTG database
- Real-time pricing from multiple marketplaces
- Card legalities, rulings, and variations
- Support for all MTG formats and sets

**Supported Games**
- Pokemon TCG
- Magic: The Gathering
- Yu-Gi-Oh! (manual entry)
- Disney Lorcana (manual entry)
- One Piece TCG (manual entry)
- Sports Cards (manual entry)

### 2. Advanced Card Tracking

**Graded Cards Support**
- PSA (Professional Sports Authenticator)
- BGS/Beckett Grading Services
- CGC (Certified Guaranty Company)
- SGC (Sportscard Guaranty)
- ACE Grading
- Grade scores (1-10 scale with half points)
- Certification numbers
- Graded card value tracking

**Card Variants**
- Normal/Non-foil
- Holo/Holographic
- Reverse Holo
- 1st Edition
- Unlimited
- Shadowless
- Stamped
- Prerelease
- Promo
- Full Art
- Secret Rare
- Rainbow Rare
- Gold
- Silver
- Extended Art
- Showcase
- Borderless
- Foil
- Etched
- Gilded

**Condition Grades**
- Mint (M)
- Near Mint (NM)
- Excellent (EX)
- Good (GD)
- Light Play (LP)
- Moderate Play (MP)
- Heavy Play (HP)
- Damaged (DMG)

### 3. Collection Management

**Organization**
- Multiple collections per user
- Categorize by game type
- Collection descriptions and metadata
- Storage location tracking
- Custom tags for organization

**Item Details**
- Card name, set, and number
- Rarity tracking
- Quantity management
- Purchase price and market value
- Acquisition date
- Personal notes
- Language support
- Signature/autograph tracking
- Trade availability flag

### 4. Wishlist System

**Features**
- Separate wishlist from owned cards
- Priority levels (1-5)
- Desired condition preferences
- Maximum price targets
- Notes for each wishlist item
- Quick add from card search
- Easy conversion to collection when acquired

### 5. Statistics & Analytics

**Investment Tracking**
- Total collection value
- Total cards owned
- Average card value
- Total investment amount
- Profit/Loss calculation
- ROI (Return on Investment) percentage
- Graded cards count
- Cards available for trade

**Detailed Breakdowns**
- Cards by condition
- Cards by rarity
- Cards by set
- Value distribution
- Progress tracking per set

### 6. Search & Filtering

**Advanced Filters**
- Search by card name
- Filter by set
- Filter by condition
- Filter by variant type
- Filter by rarity
- Filter by collection
- Multi-filter combinations

**View Modes**
- Grid view (6-column card display)
- List view (detailed rows)
- Visual condition indicators
- Grading badges
- Trade status indicators

### 7. Import/Export

**CSV Export**
- Export entire collection or filtered results
- Includes all card details
- Grading information
- Pricing data
- Compatible with spreadsheet software

**CSV Import**
- Bulk import from CSV files
- Field mapping
- Validation and error handling
- Support for existing collection formats

### 8. Price Tracking

**Current Features**
- Purchase price tracking
- Current market price
- Automatic price fetching from APIs
- Multiple marketplace support (TCGPlayer, Cardmarket)

**Database Support (Ready for Implementation)**
- Historical price data table
- Price trend tracking
- Price alerts (future feature)
- Market value changes over time

## Database Schema

### Core Tables

**tcg_sets**
- Set metadata (name, release date, total cards)
- Game categorization
- Logo and symbol URLs
- External API references

**tcg_cards**
- Complete card information from APIs
- Pricing data (JSONB)
- Images (small, normal, large)
- Card attributes (types, HP, attacks, etc.)
- Legalities by format

**collections**
- User collections
- Game category
- Description and metadata

**collection_items**
- Individual cards in collections
- Grading information
- Variant tracking
- Pricing and acquisition data
- Location and trade status
- Custom tags and notes

**wishlists**
- Desired cards
- Priority levels
- Price targets
- Condition preferences

**price_history**
- Historical pricing data
- Multiple marketplace support
- Variant-specific pricing
- Trend analysis support

**set_completion**
- User progress per set
- Completion percentages
- Set values
- Owned vs total cards

## API Integration

### Pokemon TCG API
```typescript
// Example usage
const cards = await pokemonTcgApi.searchCardsByName('Charizard');
const sets = await pokemonTcgApi.getSets({ orderBy: '-releaseDate' });
const price = pokemonTcgApi.getCardPrice(card, 'holofoil');
```

### Scryfall API
```typescript
// Example usage
const cards = await scryfallApi.searchCards('lightning bolt');
const sets = await scryfallApi.getSets();
const price = scryfallApi.getCardPrice(card, 'usd_foil');
```

## Components

### CardSearchDialog
- Interactive card search interface
- Real-time API integration
- Set filtering
- Visual card selection
- Automatic price fetching

### EnhancedAddItemDialog
- Dual-mode entry (search + manual)
- Complete card details form
- Grading information
- Variant selection
- Investment tracking

### WishlistDialog
- Wishlist management
- Priority indicators
- Quick add from search
- Price targets
- Easy wishlist maintenance

### EnhancedCollection (Main Page)
- Comprehensive collection dashboard
- Multiple view modes
- Advanced filtering
- Statistics overview
- Export functionality
- Game selection
- Responsive design

## Setup Instructions

### 1. Environment Variables

Create a `.env` file:
```env
# Pokemon TCG API (Optional but recommended)
VITE_POKEMON_TCG_API_KEY=your-api-key-here
```

Get your free API key at: https://dev.pokemontcg.io/

### 2. Database Migration

The migration file `20251216000001_enhanced_collection_features.sql` includes:
- All new tables
- Enums for variants and grading
- RLS policies
- Indexes for performance
- Helper functions

Apply the migration through your Supabase dashboard or CLI.

### 3. Usage

1. Navigate to `/my-collection`
2. Create a collection or select existing
3. Click "Add Card" to:
   - Search Pokemon/MTG databases
   - Or enter cards manually
4. Use filters to find specific cards
5. View stats and analytics
6. Export to CSV for backup/analysis
7. Manage wishlist for cards to acquire

## Future Enhancements

### Planned Features
- Set completion tracking with real-time progress
- Price alerts and notifications
- Card scanning via barcode/QR codes
- Trading platform integration
- Portfolio analytics and trends
- Mobile app support
- Social features (share collections, trade requests)
- AI-powered collection valuation
- Insurance documentation export
- Deck building from collection
- Print-ready collection lists
- Integration with more TCG APIs (Yu-Gi-Oh, Lorcana)

### Price Tracking System (Database Ready)
The `price_history` table is ready for:
- Automated price updates via scheduled functions
- Historical charts and graphs
- Price trend notifications
- Market analysis tools

## Technical Stack

- **Frontend**: React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **APIs**: Pokemon TCG API, Scryfall
- **State Management**: React Query
- **Forms**: React Hook Form + Zod

## Performance

- Optimized database indexes
- Efficient API caching
- Lazy loading for large collections
- Responsive pagination
- Image lazy loading
- Optimistic UI updates

## Security

- Row Level Security (RLS) on all tables
- User-specific data isolation
- Secure API key handling
- Input validation and sanitization
- SQL injection protection

## Credits

Inspired by:
- [TCGCollector.com](https://www.tcgcollector.com/) - Pokemon collection tracking
- [Scryfall](https://scryfall.com/) - MTG database and API
- [Pokemon TCG API](https://pokemontcg.io/) - Official Pokemon card data

---

Built with ❤️ for the TCG collecting community
