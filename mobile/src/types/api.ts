export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  model: string | null;
  category: string;
  activity_type: string;
  description: string | null;
  specifications: Record<string, unknown>;
  recommendation_context: Record<string, unknown>;
  evidence_count: number;
  review_count: number;
  average_rating: number | null;
  lowest_price: string | null;
  currency: string | null;
  media_urls: string[];
};

export type ProductOffer = {
  id: string;
  merchant_id: string;
  merchant_name: string;
  price: string;
  normal_price: string | null;
  currency: string;
  product_url: string | null;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  observed_at: string;
};

export type WardrobeItem = {
  id: string;
  owner_id: string;
  catalog_product_id: string | null;
  category: string;
  brand: string | null;
  model: string | null;
  name: string;
  description: string | null;
  specifications: Record<string, unknown>;
  photo_url: string | null;
  visibility: 'private' | 'followers' | 'public';
};

export type WardrobeItemCreatePayload = {
  catalog_product_id?: string | null;
  category: string;
  brand?: string | null;
  model?: string | null;
  name: string;
  description?: string | null;
  specifications?: Record<string, unknown>;
  photo_url?: string | null;
  visibility?: WardrobeItem['visibility'];
};

export type OfferValidationStatus = 'available' | 'expired' | 'wrong_price';

export type DealCreatePayload = {
  product_id: string;
  merchant_id?: string | null;
  merchant_name: string;
  price: number;
  normal_price?: number | null;
  currency?: string;
  url?: string | null;
  notes?: string | null;
  store_latitude?: number | null;
  store_longitude?: number | null;
  store_region?: string | null;
  expires_at?: string | null;
};

export type Trophy = {
  id: string;
  user_id: string;
  activity_type: string;
  species_name: string;
  title: string;
  description: string | null;
  weight_kg: string | number | null;
  length_cm: string | number | null;
  captured_at: string;
  release_status: 'released' | 'kept' | 'not_applicable';
  visibility: 'private' | 'followers' | 'public';
  geo_privacy:
    | 'exact'
    | 'approx_1km'
    | 'approx_5km'
    | 'region_only'
    | 'private';
  public_region: string | null;
  public_latitude: number | null;
  public_longitude: number | null;
  environmental_snapshot: Record<string, unknown> | null;
  created_at: string;
};

export type TrophyCreatePayload = {
  activity_type?: 'fishing' | 'hunting' | 'outdoor';
  species_name: string;
  title: string;
  description?: string | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  captured_at: string;
  release_status?: 'released' | 'kept' | 'not_applicable';
  visibility?: 'private' | 'followers' | 'public';
  geo_privacy?:
    | 'exact'
    | 'approx_1km'
    | 'approx_5km'
    | 'region_only'
    | 'private';
  latitude?: number | null;
  longitude?: number | null;
  public_region?: string | null;
  environmental_snapshot?: Record<string, unknown> | null;
  equipment_ids?: string[];
};

export type FeedEquipment = {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  name: string;
};

export type FeedItem = {
  id: string;
  user_id: string;
  author_name: string;
  species_name: string;
  title: string;
  description: string | null;
  weight_kg: number | null;
  length_cm: number | null;
  captured_at: string;
  release_status: string;
  public_region: string | null;
  public_latitude: number | null;
  public_longitude: number | null;
  has_image: boolean;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  equipment: FeedEquipment[];
};

export type TrophyComment = {
  id: string;
  trophy_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export type LikeState = {
  liked: boolean;
  like_count: number;
};

export type Spot = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  spot_type: string;
  visibility: string;
  geo_privacy: string;
  latitude: number | null;
  longitude: number | null;
  public_region: string | null;
  is_owner: boolean;
  created_at: string;
};

export type SpotCreatePayload = {
  name: string;
  description?: string | null;
  spot_type?: string;
  visibility?: 'private' | 'followers' | 'public';
  geo_privacy?:
    | 'exact'
    | 'approx_1km'
    | 'approx_5km'
    | 'region_only'
    | 'private';
  latitude: number;
  longitude: number;
  public_region?: string | null;
};

export type ProfileSummary = {
  user_id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  region: string | null;
  avatar_url: string | null;
  trophy_count: number;
  credential_count: number;
  wardrobe_count: number;
};

export type ProfileUpdatePayload = {
  display_name?: string | null;
  bio?: string | null;
  region?: string | null;
};

export type Deal = {
  id: string;
  reporter_id: string;
  product_id: string;
  merchant_id: string | null;
  merchant_name: string;
  price: string;
  normal_price: string | null;
  currency: string;
  store_region: string | null;
  url: string | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  available_votes: number;
  expired_votes: number;
  wrong_price_votes: number;
};


export type AffiliateRecommendation = {
  platform: 'mercadolibre' | 'temu' | 'ebay' | 'aliexpress';
  platform_label: string;
  item_id: string;
  title: string;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  affiliate_url: string;
  source_url: string | null;
  fetched_at: string;
};
