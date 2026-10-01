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
};

export type Trophy = {
  id: string;
  species_name: string;
  title: string;
  description: string | null;
  captured_at: string;
  public_region: string | null;
  public_latitude: number | null;
  public_longitude: number | null;
};

export type Deal = {
  id: string;
  product_id: string;
  merchant_name: string;
  price: string;
  normal_price: string | null;
  currency: string;
  store_region: string | null;
  available_votes: number;
  expired_votes: number;
  wrong_price_votes: number;
};
