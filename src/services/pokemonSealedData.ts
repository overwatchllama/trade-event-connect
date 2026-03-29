/**
 * Pokémon TCG Sealed Products Data
 * Sourced from Bulbapedia merchandise pages across all TCG series eras
 */

export type ProductType = 'booster_box' | 'theme_deck' | 'elite_trainer_box' | 'tin' | 'collection_box' | 'blister' | 'starter_set' | 'gift_box' | 'premium_collection' | 'trainer_kit' | 'build_battle' | 'mini_tin' | 'bundle' | 'other';

export type ProductLanguage = 'english' | 'japanese' | 'korean' | 'chinese_traditional' | 'chinese_simplified' | 'french' | 'german' | 'italian' | 'spanish' | 'portuguese' | 'indonesian' | 'thai';

export interface SealedProduct {
  id: string;
  name: string;
  series: string;
  set_name: string;
  product_type: ProductType;
  release_date: string | null;
  image_url: string | null;
  languages: ProductLanguage[];
  description?: string;
  msrp?: number;
}

export interface SealedSeries {
  id: string;
  name: string;
  era: string;
  years: string;
  bulbapedia_url: string | null;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  booster_box: 'Booster Box',
  theme_deck: 'Theme Deck',
  elite_trainer_box: 'Elite Trainer Box',
  tin: 'Tin',
  collection_box: 'Collection Box',
  blister: 'Blister Pack',
  starter_set: 'Starter Set',
  gift_box: 'Gift Box',
  premium_collection: 'Premium Collection',
  trainer_kit: 'Trainer Kit',
  build_battle: 'Build & Battle',
  mini_tin: 'Mini Tin',
  bundle: 'Booster Bundle',
  other: 'Other',
};

export const LANGUAGE_LABELS: Record<ProductLanguage, string> = {
  english: 'English',
  japanese: 'Japanese',
  korean: 'Korean',
  chinese_traditional: 'Chinese (Traditional)',
  chinese_simplified: 'Chinese (Simplified)',
  french: 'French',
  german: 'German',
  italian: 'Italian',
  spanish: 'Spanish',
  portuguese: 'Portuguese',
  indonesian: 'Indonesian',
  thai: 'Thai',
};

export const SEALED_SERIES: SealedSeries[] = [
  { id: 'original', name: 'Original Series', era: 'WotC', years: '1999–2000', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/Original_TCG_Series_merchandise' },
  { id: 'neo', name: 'Neo Series', era: 'WotC', years: '2000–2002', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/Neo_TCG_Series_merchandise' },
  { id: 'legendary', name: 'Legendary Collection / e-Card', era: 'WotC', years: '2002–2003', bulbapedia_url: null },
  { id: 'ex', name: 'EX Series', era: 'Nintendo', years: '2003–2007', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/EX_Series_merchandise' },
  { id: 'dp', name: 'Diamond & Pearl Series', era: 'Nintendo', years: '2007–2009', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/Diamond_%26_Pearl_Series_merchandise' },
  { id: 'platinum', name: 'Platinum Series', era: 'Nintendo', years: '2009–2010', bulbapedia_url: null },
  { id: 'hgss', name: 'HeartGold & SoulSilver Series', era: 'Nintendo', years: '2010–2011', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/HeartGold_%26_SoulSilver_Series_merchandise' },
  { id: 'bw', name: 'Black & White Series', era: 'TPCi', years: '2011–2013', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/Black_%26_White_Series_merchandise' },
  { id: 'xy', name: 'XY Series', era: 'TPCi', years: '2014–2016', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/XY_Series_merchandise' },
  { id: 'sm', name: 'Sun & Moon Series', era: 'TPCi', years: '2017–2019', bulbapedia_url: 'https://bulbapedia.bulbagarden.net/wiki/Sun_%26_Moon_Series_merchandise' },
  { id: 'swsh', name: 'Sword & Shield Series', era: 'TPCi', years: '2020–2023', bulbapedia_url: null },
  { id: 'sv', name: 'Scarlet & Violet Series', era: 'TPCi', years: '2023–present', bulbapedia_url: null },
];

export const SEALED_PRODUCTS: SealedProduct[] = [
  // ===== ORIGINAL SERIES =====
  { id: 'base-blackout', name: 'Blackout Theme Deck', series: 'original', set_name: 'Base Set', product_type: 'theme_deck', release_date: '1999-01-09', image_url: 'https://archives.bulbagarden.net/media/upload/c/c4/O1_Blackout_Deck.jpg', languages: ['english'], description: 'Fighting/Water type theme deck' },
  { id: 'base-brushfire', name: 'Brushfire Theme Deck', series: 'original', set_name: 'Base Set', product_type: 'theme_deck', release_date: '1999-01-09', image_url: 'https://archives.bulbagarden.net/media/upload/1/14/O1_Brushfire_Deck.jpg', languages: ['english'], description: 'Fire/Grass type theme deck' },
  { id: 'base-overgrowth', name: 'Overgrowth Theme Deck', series: 'original', set_name: 'Base Set', product_type: 'theme_deck', release_date: '1999-01-09', image_url: 'https://archives.bulbagarden.net/media/upload/0/03/O1_Overgrowth_Deck.jpg', languages: ['english'], description: 'Water/Grass type theme deck' },
  { id: 'base-zap', name: 'Zap! Theme Deck', series: 'original', set_name: 'Base Set', product_type: 'theme_deck', release_date: '1999-01-09', image_url: 'https://archives.bulbagarden.net/media/upload/4/42/O1_Zap%21_Deck.jpg', languages: ['english'], description: 'Lightning/Psychic type theme deck' },
  { id: 'base-2player', name: '2-Player Starter Set', series: 'original', set_name: 'Base Set', product_type: 'starter_set', release_date: '1999-01-09', image_url: 'https://archives.bulbagarden.net/media/upload/0/0e/2PlayerStarterSet.jpg', languages: ['english'] },
  { id: 'base-booster-box', name: 'Base Set Booster Box', series: 'original', set_name: 'Base Set', product_type: 'booster_box', release_date: '1999-01-09', image_url: null, languages: ['english', 'japanese'] },
  { id: 'jungle-power-reserve', name: 'Power Reserve Theme Deck', series: 'original', set_name: 'Jungle', product_type: 'theme_deck', release_date: '1999-06-16', image_url: null, languages: ['english'] },
  { id: 'jungle-water-blast', name: 'Water Blast Theme Deck', series: 'original', set_name: 'Jungle', product_type: 'theme_deck', release_date: '1999-06-16', image_url: null, languages: ['english'] },
  { id: 'jungle-booster-box', name: 'Jungle Booster Box', series: 'original', set_name: 'Jungle', product_type: 'booster_box', release_date: '1999-06-16', image_url: null, languages: ['english', 'japanese'] },
  { id: 'fossil-bodyguard', name: 'Bodyguard Theme Deck', series: 'original', set_name: 'Fossil', product_type: 'theme_deck', release_date: '1999-10-10', image_url: null, languages: ['english'] },
  { id: 'fossil-lockdown', name: 'LockDown Theme Deck', series: 'original', set_name: 'Fossil', product_type: 'theme_deck', release_date: '1999-10-10', image_url: null, languages: ['english'] },
  { id: 'fossil-booster-box', name: 'Fossil Booster Box', series: 'original', set_name: 'Fossil', product_type: 'booster_box', release_date: '1999-10-10', image_url: null, languages: ['english', 'japanese'] },
  { id: 'starter-gift-box', name: 'Starter Gift Box', series: 'original', set_name: 'Base Set', product_type: 'gift_box', release_date: '1999-11-01', image_url: null, languages: ['english'] },
  { id: 'base2-booster-box', name: 'Base Set 2 Booster Box', series: 'original', set_name: 'Base Set 2', product_type: 'booster_box', release_date: '2000-02-24', image_url: null, languages: ['english'] },
  { id: 'rocket-devastation', name: 'Devastation Theme Deck', series: 'original', set_name: 'Team Rocket', product_type: 'theme_deck', release_date: '2000-04-24', image_url: null, languages: ['english'] },
  { id: 'rocket-trouble', name: 'Trouble Theme Deck', series: 'original', set_name: 'Team Rocket', product_type: 'theme_deck', release_date: '2000-04-24', image_url: null, languages: ['english'] },
  { id: 'rocket-booster-box', name: 'Team Rocket Booster Box', series: 'original', set_name: 'Team Rocket', product_type: 'booster_box', release_date: '2000-04-24', image_url: null, languages: ['english', 'japanese'] },
  { id: 'thunderstorm-gift-box', name: 'Thunderstorm Gift Box', series: 'original', set_name: 'Gym Heroes', product_type: 'gift_box', release_date: '2000-10-01', image_url: null, languages: ['english'] },
  { id: 'gym-heroes-booster', name: 'Gym Heroes Booster Box', series: 'original', set_name: 'Gym Heroes', product_type: 'booster_box', release_date: '2000-08-14', image_url: null, languages: ['english', 'japanese'] },
  { id: 'gym-challenge-booster', name: 'Gym Challenge Booster Box', series: 'original', set_name: 'Gym Challenge', product_type: 'booster_box', release_date: '2000-10-16', image_url: null, languages: ['english', 'japanese'] },

  // ===== NEO SERIES =====
  { id: 'neo-genesis-booster', name: 'Neo Genesis Booster Box', series: 'neo', set_name: 'Neo Genesis', product_type: 'booster_box', release_date: '2000-12-16', image_url: null, languages: ['english', 'japanese'] },
  { id: 'neo-discovery-booster', name: 'Neo Discovery Booster Box', series: 'neo', set_name: 'Neo Discovery', product_type: 'booster_box', release_date: '2001-06-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'neo-revelation-booster', name: 'Neo Revelation Booster Box', series: 'neo', set_name: 'Neo Revelation', product_type: 'booster_box', release_date: '2001-09-21', image_url: null, languages: ['english', 'japanese'] },
  { id: 'neo-destiny-booster', name: 'Neo Destiny Booster Box', series: 'neo', set_name: 'Neo Destiny', product_type: 'booster_box', release_date: '2002-02-28', image_url: null, languages: ['english', 'japanese'] },

  // ===== EX SERIES =====
  { id: 'ex-rs-booster', name: 'Ruby & Sapphire Booster Box', series: 'ex', set_name: 'EX Ruby & Sapphire', product_type: 'booster_box', release_date: '2003-07-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'ex-frlg-booster', name: 'FireRed & LeafGreen Booster Box', series: 'ex', set_name: 'EX FireRed & LeafGreen', product_type: 'booster_box', release_date: '2004-09-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'ex-emerald-booster', name: 'Emerald Booster Box', series: 'ex', set_name: 'EX Emerald', product_type: 'booster_box', release_date: '2005-05-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'ex-delta-booster', name: 'Delta Species Booster Box', series: 'ex', set_name: 'EX Delta Species', product_type: 'booster_box', release_date: '2005-10-31', image_url: null, languages: ['english', 'japanese'] },

  // ===== DIAMOND & PEARL SERIES =====
  { id: 'dp-base-booster', name: 'Diamond & Pearl Booster Box', series: 'dp', set_name: 'Diamond & Pearl', product_type: 'booster_box', release_date: '2007-05-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'dp-base-tin-dialga', name: 'Dialga Tin', series: 'dp', set_name: 'Diamond & Pearl', product_type: 'tin', release_date: '2007-05-01', image_url: null, languages: ['english'] },
  { id: 'dp-base-tin-palkia', name: 'Palkia Tin', series: 'dp', set_name: 'Diamond & Pearl', product_type: 'tin', release_date: '2007-05-01', image_url: null, languages: ['english'] },
  { id: 'dp-mt-booster', name: 'Mysterious Treasures Booster Box', series: 'dp', set_name: 'Mysterious Treasures', product_type: 'booster_box', release_date: '2007-08-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'dp-sw-booster', name: 'Secret Wonders Booster Box', series: 'dp', set_name: 'Secret Wonders', product_type: 'booster_box', release_date: '2007-11-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'dp-ge-booster', name: 'Great Encounters Booster Box', series: 'dp', set_name: 'Great Encounters', product_type: 'booster_box', release_date: '2008-02-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'dp-md-booster', name: 'Majestic Dawn Booster Box', series: 'dp', set_name: 'Majestic Dawn', product_type: 'booster_box', release_date: '2008-05-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'dp-la-booster', name: 'Legends Awakened Booster Box', series: 'dp', set_name: 'Legends Awakened', product_type: 'booster_box', release_date: '2008-08-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'dp-sf-booster', name: 'Stormfront Booster Box', series: 'dp', set_name: 'Stormfront', product_type: 'booster_box', release_date: '2008-11-01', image_url: null, languages: ['english', 'japanese'] },

  // ===== HGSS SERIES =====
  { id: 'hgss-base-booster', name: 'HeartGold & SoulSilver Booster Box', series: 'hgss', set_name: 'HeartGold & SoulSilver', product_type: 'booster_box', release_date: '2010-02-10', image_url: null, languages: ['english', 'japanese'] },
  { id: 'hgss-unleashed-booster', name: 'Unleashed Booster Box', series: 'hgss', set_name: 'HS—Unleashed', product_type: 'booster_box', release_date: '2010-05-12', image_url: null, languages: ['english', 'japanese'] },
  { id: 'hgss-undaunted-booster', name: 'Undaunted Booster Box', series: 'hgss', set_name: 'HS—Undaunted', product_type: 'booster_box', release_date: '2010-08-18', image_url: null, languages: ['english', 'japanese'] },
  { id: 'hgss-triumphant-booster', name: 'Triumphant Booster Box', series: 'hgss', set_name: 'HS—Triumphant', product_type: 'booster_box', release_date: '2010-11-03', image_url: null, languages: ['english', 'japanese'] },

  // ===== BLACK & WHITE SERIES =====
  { id: 'bw-base-booster', name: 'Black & White Booster Box', series: 'bw', set_name: 'Black & White', product_type: 'booster_box', release_date: '2011-04-25', image_url: null, languages: ['english', 'japanese', 'french', 'german', 'italian', 'spanish', 'portuguese', 'korean'] },
  { id: 'bw-ep-booster', name: 'Emerging Powers Booster Box', series: 'bw', set_name: 'Emerging Powers', product_type: 'booster_box', release_date: '2011-08-31', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-nv-booster', name: 'Noble Victories Booster Box', series: 'bw', set_name: 'Noble Victories', product_type: 'booster_box', release_date: '2011-11-16', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-nd-booster', name: 'Next Destinies Booster Box', series: 'bw', set_name: 'Next Destinies', product_type: 'booster_box', release_date: '2012-02-08', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-de-booster', name: 'Dark Explorers Booster Box', series: 'bw', set_name: 'Dark Explorers', product_type: 'booster_box', release_date: '2012-05-09', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-df-booster', name: 'Dragons Exalted Booster Box', series: 'bw', set_name: 'Dragons Exalted', product_type: 'booster_box', release_date: '2012-08-15', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-bc-booster', name: 'Boundaries Crossed Booster Box', series: 'bw', set_name: 'Boundaries Crossed', product_type: 'booster_box', release_date: '2012-11-07', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-ps-booster', name: 'Plasma Storm Booster Box', series: 'bw', set_name: 'Plasma Storm', product_type: 'booster_box', release_date: '2013-02-06', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-pf-booster', name: 'Plasma Freeze Booster Box', series: 'bw', set_name: 'Plasma Freeze', product_type: 'booster_box', release_date: '2013-05-08', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-pb-booster', name: 'Plasma Blast Booster Box', series: 'bw', set_name: 'Plasma Blast', product_type: 'booster_box', release_date: '2013-08-14', image_url: null, languages: ['english', 'japanese'] },
  { id: 'bw-ltr-booster', name: 'Legendary Treasures Booster Box', series: 'bw', set_name: 'Legendary Treasures', product_type: 'booster_box', release_date: '2013-11-06', image_url: null, languages: ['english', 'japanese'] },

  // ===== XY SERIES =====
  { id: 'xy-base-booster', name: 'XY Booster Box', series: 'xy', set_name: 'XY', product_type: 'booster_box', release_date: '2014-02-05', image_url: null, languages: ['english', 'japanese', 'french', 'german', 'italian', 'spanish', 'portuguese', 'korean'] },
  { id: 'xy-ff-booster', name: 'Flashfire Booster Box', series: 'xy', set_name: 'Flashfire', product_type: 'booster_box', release_date: '2014-05-07', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-fuf-booster', name: 'Furious Fists Booster Box', series: 'xy', set_name: 'Furious Fists', product_type: 'booster_box', release_date: '2014-08-13', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-prc-booster', name: 'Primal Clash Booster Box', series: 'xy', set_name: 'Primal Clash', product_type: 'booster_box', release_date: '2015-02-04', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-ros-booster', name: 'Roaring Skies Booster Box', series: 'xy', set_name: 'Roaring Skies', product_type: 'booster_box', release_date: '2015-05-06', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-aor-booster', name: 'Ancient Origins Booster Box', series: 'xy', set_name: 'Ancient Origins', product_type: 'booster_box', release_date: '2015-08-12', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-bkt-booster', name: 'BREAKthrough Booster Box', series: 'xy', set_name: 'BREAKthrough', product_type: 'booster_box', release_date: '2015-11-04', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-bkp-booster', name: 'BREAKpoint Booster Box', series: 'xy', set_name: 'BREAKpoint', product_type: 'booster_box', release_date: '2016-02-03', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-fco-booster', name: 'Fates Collide Booster Box', series: 'xy', set_name: 'Fates Collide', product_type: 'booster_box', release_date: '2016-05-02', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-sts-booster', name: 'Steam Siege Booster Box', series: 'xy', set_name: 'Steam Siege', product_type: 'booster_box', release_date: '2016-08-03', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-evo-booster', name: 'Evolutions Booster Box', series: 'xy', set_name: 'Evolutions', product_type: 'booster_box', release_date: '2016-11-02', image_url: null, languages: ['english', 'japanese'] },
  { id: 'xy-evo-etb', name: 'Evolutions Elite Trainer Box', series: 'xy', set_name: 'Evolutions', product_type: 'elite_trainer_box', release_date: '2016-11-02', image_url: null, languages: ['english'] },

  // ===== SUN & MOON SERIES =====
  { id: 'sm-base-booster', name: 'Sun & Moon Booster Box', series: 'sm', set_name: 'Sun & Moon', product_type: 'booster_box', release_date: '2017-02-03', image_url: null, languages: ['english', 'japanese', 'french', 'german', 'italian', 'spanish', 'portuguese', 'korean', 'chinese_traditional', 'chinese_simplified', 'indonesian', 'thai'] },
  { id: 'sm-base-etb', name: 'Sun & Moon Elite Trainer Box', series: 'sm', set_name: 'Sun & Moon', product_type: 'elite_trainer_box', release_date: '2017-02-03', image_url: null, languages: ['english'] },
  { id: 'sm-gri-booster', name: 'Guardians Rising Booster Box', series: 'sm', set_name: 'Guardians Rising', product_type: 'booster_box', release_date: '2017-05-05', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-bus-booster', name: 'Burning Shadows Booster Box', series: 'sm', set_name: 'Burning Shadows', product_type: 'booster_box', release_date: '2017-08-04', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-cri-booster', name: 'Crimson Invasion Booster Box', series: 'sm', set_name: 'Crimson Invasion', product_type: 'booster_box', release_date: '2017-11-03', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-upr-booster', name: 'Ultra Prism Booster Box', series: 'sm', set_name: 'Ultra Prism', product_type: 'booster_box', release_date: '2018-02-02', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-fli-booster', name: 'Forbidden Light Booster Box', series: 'sm', set_name: 'Forbidden Light', product_type: 'booster_box', release_date: '2018-05-04', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-cel-booster', name: 'Celestial Storm Booster Box', series: 'sm', set_name: 'Celestial Storm', product_type: 'booster_box', release_date: '2018-08-03', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-lot-booster', name: 'Lost Thunder Booster Box', series: 'sm', set_name: 'Lost Thunder', product_type: 'booster_box', release_date: '2018-11-02', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-teu-booster', name: 'Team Up Booster Box', series: 'sm', set_name: 'Team Up', product_type: 'booster_box', release_date: '2019-02-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-unb-booster', name: 'Unbroken Bonds Booster Box', series: 'sm', set_name: 'Unbroken Bonds', product_type: 'booster_box', release_date: '2019-05-03', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-unm-booster', name: 'Unified Minds Booster Box', series: 'sm', set_name: 'Unified Minds', product_type: 'booster_box', release_date: '2019-08-02', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sm-hif-booster', name: 'Hidden Fates Booster (ETB)', series: 'sm', set_name: 'Hidden Fates', product_type: 'elite_trainer_box', release_date: '2019-08-23', image_url: null, languages: ['english'], msrp: 49.99 },
  { id: 'sm-hif-tin', name: 'Hidden Fates Tin', series: 'sm', set_name: 'Hidden Fates', product_type: 'tin', release_date: '2019-08-23', image_url: null, languages: ['english'] },
  { id: 'sm-cos-booster', name: 'Cosmic Eclipse Booster Box', series: 'sm', set_name: 'Cosmic Eclipse', product_type: 'booster_box', release_date: '2019-11-01', image_url: null, languages: ['english', 'japanese'] },

  // ===== SWORD & SHIELD SERIES =====
  { id: 'swsh-base-booster', name: 'Sword & Shield Booster Box', series: 'swsh', set_name: 'Sword & Shield', product_type: 'booster_box', release_date: '2020-02-07', image_url: null, languages: ['english', 'japanese', 'french', 'german', 'italian', 'spanish', 'portuguese', 'korean', 'chinese_traditional', 'chinese_simplified', 'indonesian', 'thai'] },
  { id: 'swsh-base-etb', name: 'Sword & Shield Elite Trainer Box', series: 'swsh', set_name: 'Sword & Shield', product_type: 'elite_trainer_box', release_date: '2020-02-07', image_url: null, languages: ['english'], msrp: 39.99 },
  { id: 'swsh-reb-booster', name: 'Rebel Clash Booster Box', series: 'swsh', set_name: 'Rebel Clash', product_type: 'booster_box', release_date: '2020-05-01', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-daa-booster', name: 'Darkness Ablaze Booster Box', series: 'swsh', set_name: 'Darkness Ablaze', product_type: 'booster_box', release_date: '2020-08-14', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-cp-booster', name: "Champion's Path Booster (ETB)", series: 'swsh', set_name: "Champion's Path", product_type: 'elite_trainer_box', release_date: '2020-09-25', image_url: null, languages: ['english'], msrp: 49.99 },
  { id: 'swsh-vv-booster', name: 'Vivid Voltage Booster Box', series: 'swsh', set_name: 'Vivid Voltage', product_type: 'booster_box', release_date: '2020-11-13', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-vv-etb', name: 'Vivid Voltage Elite Trainer Box', series: 'swsh', set_name: 'Vivid Voltage', product_type: 'elite_trainer_box', release_date: '2020-11-13', image_url: null, languages: ['english'] },
  { id: 'swsh-sf-booster', name: 'Shining Fates Booster (ETB)', series: 'swsh', set_name: 'Shining Fates', product_type: 'elite_trainer_box', release_date: '2021-02-19', image_url: null, languages: ['english'], msrp: 49.99 },
  { id: 'swsh-sf-tin', name: 'Shining Fates Tin', series: 'swsh', set_name: 'Shining Fates', product_type: 'tin', release_date: '2021-02-19', image_url: null, languages: ['english'] },
  { id: 'swsh-brs-booster', name: 'Battle Styles Booster Box', series: 'swsh', set_name: 'Battle Styles', product_type: 'booster_box', release_date: '2021-03-19', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-cre-booster', name: 'Chilling Reign Booster Box', series: 'swsh', set_name: 'Chilling Reign', product_type: 'booster_box', release_date: '2021-06-18', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-evs-booster', name: 'Evolving Skies Booster Box', series: 'swsh', set_name: 'Evolving Skies', product_type: 'booster_box', release_date: '2021-08-27', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-evs-etb', name: 'Evolving Skies Elite Trainer Box', series: 'swsh', set_name: 'Evolving Skies', product_type: 'elite_trainer_box', release_date: '2021-08-27', image_url: null, languages: ['english'] },
  { id: 'swsh-cel-booster', name: 'Celebrations Booster (ETB)', series: 'swsh', set_name: 'Celebrations', product_type: 'elite_trainer_box', release_date: '2021-10-08', image_url: null, languages: ['english'], msrp: 49.99 },
  { id: 'swsh-cel-tin', name: 'Celebrations Tin', series: 'swsh', set_name: 'Celebrations', product_type: 'tin', release_date: '2021-10-08', image_url: null, languages: ['english'] },
  { id: 'swsh-fsi-booster', name: 'Fusion Strike Booster Box', series: 'swsh', set_name: 'Fusion Strike', product_type: 'booster_box', release_date: '2021-11-12', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-brs2-booster', name: 'Brilliant Stars Booster Box', series: 'swsh', set_name: 'Brilliant Stars', product_type: 'booster_box', release_date: '2022-02-25', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-brs2-etb', name: 'Brilliant Stars Elite Trainer Box', series: 'swsh', set_name: 'Brilliant Stars', product_type: 'elite_trainer_box', release_date: '2022-02-25', image_url: null, languages: ['english'] },
  { id: 'swsh-ast-booster', name: 'Astral Radiance Booster Box', series: 'swsh', set_name: 'Astral Radiance', product_type: 'booster_box', release_date: '2022-05-27', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-pgo-booster', name: 'Pokémon GO Booster (ETB)', series: 'swsh', set_name: 'Pokémon GO', product_type: 'elite_trainer_box', release_date: '2022-07-01', image_url: null, languages: ['english'] },
  { id: 'swsh-pgo-tin', name: 'Pokémon GO Tin', series: 'swsh', set_name: 'Pokémon GO', product_type: 'tin', release_date: '2022-07-01', image_url: null, languages: ['english'] },
  { id: 'swsh-lor-booster', name: 'Lost Origin Booster Box', series: 'swsh', set_name: 'Lost Origin', product_type: 'booster_box', release_date: '2022-09-09', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-sit-booster', name: 'Silver Tempest Booster Box', series: 'swsh', set_name: 'Silver Tempest', product_type: 'booster_box', release_date: '2022-11-11', image_url: null, languages: ['english', 'japanese'] },
  { id: 'swsh-cz-booster', name: 'Crown Zenith Booster (ETB)', series: 'swsh', set_name: 'Crown Zenith', product_type: 'elite_trainer_box', release_date: '2023-01-20', image_url: null, languages: ['english'], msrp: 49.99 },
  { id: 'swsh-cz-tin', name: 'Crown Zenith Tin', series: 'swsh', set_name: 'Crown Zenith', product_type: 'tin', release_date: '2023-01-20', image_url: null, languages: ['english'] },

  // ===== SCARLET & VIOLET SERIES =====
  { id: 'sv-base-booster', name: 'Scarlet & Violet Booster Box', series: 'sv', set_name: 'Scarlet & Violet', product_type: 'booster_box', release_date: '2023-03-31', image_url: null, languages: ['english', 'japanese', 'french', 'german', 'italian', 'spanish', 'portuguese', 'korean', 'chinese_traditional', 'chinese_simplified', 'indonesian', 'thai'] },
  { id: 'sv-base-etb', name: 'Scarlet & Violet Elite Trainer Box', series: 'sv', set_name: 'Scarlet & Violet', product_type: 'elite_trainer_box', release_date: '2023-03-31', image_url: null, languages: ['english'], msrp: 44.99 },
  { id: 'sv-base-bundle', name: 'Scarlet & Violet Booster Bundle', series: 'sv', set_name: 'Scarlet & Violet', product_type: 'bundle', release_date: '2023-03-31', image_url: null, languages: ['english'], msrp: 29.99 },
  { id: 'sv-pal-booster', name: 'Paldea Evolved Booster Box', series: 'sv', set_name: 'Paldea Evolved', product_type: 'booster_box', release_date: '2023-06-09', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-pal-etb', name: 'Paldea Evolved Elite Trainer Box', series: 'sv', set_name: 'Paldea Evolved', product_type: 'elite_trainer_box', release_date: '2023-06-09', image_url: null, languages: ['english'] },
  { id: 'sv-mew-booster', name: '151 Booster Box (JP)', series: 'sv', set_name: 'Pokémon 151', product_type: 'booster_box', release_date: '2023-06-16', image_url: null, languages: ['japanese'] },
  { id: 'sv-mew-etb', name: '151 Elite Trainer Box', series: 'sv', set_name: 'Pokémon 151', product_type: 'elite_trainer_box', release_date: '2023-09-22', image_url: null, languages: ['english'], msrp: 49.99 },
  { id: 'sv-mew-binder', name: '151 Binder Collection', series: 'sv', set_name: 'Pokémon 151', product_type: 'collection_box', release_date: '2023-09-22', image_url: null, languages: ['english'] },
  { id: 'sv-mew-mini-tin', name: '151 Mini Tin', series: 'sv', set_name: 'Pokémon 151', product_type: 'mini_tin', release_date: '2023-09-22', image_url: null, languages: ['english'] },
  { id: 'sv-obf-booster', name: 'Obsidian Flames Booster Box', series: 'sv', set_name: 'Obsidian Flames', product_type: 'booster_box', release_date: '2023-08-11', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-obf-etb', name: 'Obsidian Flames Elite Trainer Box', series: 'sv', set_name: 'Obsidian Flames', product_type: 'elite_trainer_box', release_date: '2023-08-11', image_url: null, languages: ['english'] },
  { id: 'sv-par-booster', name: 'Paradox Rift Booster Box', series: 'sv', set_name: 'Paradox Rift', product_type: 'booster_box', release_date: '2023-11-03', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-par-etb', name: 'Paradox Rift Elite Trainer Box', series: 'sv', set_name: 'Paradox Rift', product_type: 'elite_trainer_box', release_date: '2023-11-03', image_url: null, languages: ['english'] },
  { id: 'sv-pal-fates-booster', name: 'Paldean Fates Booster (ETB)', series: 'sv', set_name: 'Paldean Fates', product_type: 'elite_trainer_box', release_date: '2024-01-26', image_url: null, languages: ['english'], msrp: 49.99 },
  { id: 'sv-pal-fates-tin', name: 'Paldean Fates Tin', series: 'sv', set_name: 'Paldean Fates', product_type: 'tin', release_date: '2024-01-26', image_url: null, languages: ['english'] },
  { id: 'sv-tef-booster', name: 'Temporal Forces Booster Box', series: 'sv', set_name: 'Temporal Forces', product_type: 'booster_box', release_date: '2024-03-22', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-tef-etb', name: 'Temporal Forces Elite Trainer Box', series: 'sv', set_name: 'Temporal Forces', product_type: 'elite_trainer_box', release_date: '2024-03-22', image_url: null, languages: ['english'] },
  { id: 'sv-twm-booster', name: 'Twilight Masquerade Booster Box', series: 'sv', set_name: 'Twilight Masquerade', product_type: 'booster_box', release_date: '2024-05-24', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-twm-etb', name: 'Twilight Masquerade Elite Trainer Box', series: 'sv', set_name: 'Twilight Masquerade', product_type: 'elite_trainer_box', release_date: '2024-05-24', image_url: null, languages: ['english'] },
  { id: 'sv-sfa-booster', name: 'Shrouded Fable Booster (ETB)', series: 'sv', set_name: 'Shrouded Fable', product_type: 'elite_trainer_box', release_date: '2024-08-02', image_url: null, languages: ['english'] },
  { id: 'sv-scr-booster', name: 'Stellar Crown Booster Box', series: 'sv', set_name: 'Stellar Crown', product_type: 'booster_box', release_date: '2024-09-13', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-scr-etb', name: 'Stellar Crown Elite Trainer Box', series: 'sv', set_name: 'Stellar Crown', product_type: 'elite_trainer_box', release_date: '2024-09-13', image_url: null, languages: ['english'] },
  { id: 'sv-ssp-booster', name: 'Surging Sparks Booster Box', series: 'sv', set_name: 'Surging Sparks', product_type: 'booster_box', release_date: '2024-11-08', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-ssp-etb', name: 'Surging Sparks Elite Trainer Box', series: 'sv', set_name: 'Surging Sparks', product_type: 'elite_trainer_box', release_date: '2024-11-08', image_url: null, languages: ['english'] },
  { id: 'sv-prp-booster', name: 'Prismatic Evolutions Booster (ETB)', series: 'sv', set_name: 'Prismatic Evolutions', product_type: 'elite_trainer_box', release_date: '2025-01-17', image_url: null, languages: ['english'], msrp: 59.99 },
  { id: 'sv-prp-binder', name: 'Prismatic Evolutions Binder Collection', series: 'sv', set_name: 'Prismatic Evolutions', product_type: 'collection_box', release_date: '2025-01-17', image_url: null, languages: ['english'] },
  { id: 'sv-prp-mini-tin', name: 'Prismatic Evolutions Mini Tin', series: 'sv', set_name: 'Prismatic Evolutions', product_type: 'mini_tin', release_date: '2025-01-17', image_url: null, languages: ['english'] },
  { id: 'sv-jpa-booster', name: 'Journey Together Booster Box', series: 'sv', set_name: 'Journey Together', product_type: 'booster_box', release_date: '2025-03-28', image_url: null, languages: ['english', 'japanese'] },
  { id: 'sv-jpa-etb', name: 'Journey Together Elite Trainer Box', series: 'sv', set_name: 'Journey Together', product_type: 'elite_trainer_box', release_date: '2025-03-28', image_url: null, languages: ['english'] },
];

export function getSealedProducts(filters?: {
  series?: string;
  product_type?: ProductType;
  language?: ProductLanguage;
  search?: string;
}): SealedProduct[] {
  let results = [...SEALED_PRODUCTS];

  if (filters?.series && filters.series !== 'all') {
    results = results.filter(p => p.series === filters.series);
  }
  if (filters?.product_type && filters.product_type !== 'all' as any) {
    results = results.filter(p => p.product_type === filters.product_type);
  }
  if (filters?.language && filters.language !== 'all' as any) {
    results = results.filter(p => p.languages.includes(filters.language!));
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.set_name.toLowerCase().includes(q) ||
      p.series.toLowerCase().includes(q)
    );
  }

  return results.sort((a, b) => {
    if (a.release_date && b.release_date) return b.release_date.localeCompare(a.release_date);
    return 0;
  });
}
