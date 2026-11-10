import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ListingCard {
  id: string;
  listing_type: string;
  name: string;
  slug: string;
  tagline?: string | null;
  specialty?: string | null;
  city: string;
  area?: string | null;
  pin_code: string;
  address_line: string;
  phone?: string | null;
  consultation_fee?: number | null;
  years_of_experience?: number | null;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  is_featured: boolean;
  home_visit_available: boolean;
  online_consultation_available: boolean;
  sample_collection_available: boolean;
  availability_summary?: string | null;
  image_url?: string | null;
  services: string[];
}

export interface Category {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  sort_order: number;
}

export interface SearchResponse {
  items: ListingCard[];
  total: number;
  page: number;
  page_size: number;
  query?: string | null;
}

export interface HomeMarketplace {
  categories: Category[];
  top_doctors: ListingCard[];
  popular_hospitals: ListingCard[];
  verified_labs: ListingCard[];
  home_care: ListingCard[];
  featured: ListingCard[];
  popular_searches: string[];
}

export interface ListingDetail extends ListingCard {
  description?: string | null;
  email?: string | null;
  organization_id?: string | null;
  doctor_id?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/marketplace`;

  home() {
    return this.http.get<HomeMarketplace>(`${this.base}/home`);
  }

  categories() {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  search(params: Record<string, string | number | boolean | undefined | null>) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<SearchResponse>(`${this.base}/search`, { params: httpParams });
  }

  listing(slug: string) {
    return this.http.get<ListingDetail>(`${this.base}/listings/${slug}`);
  }

  doctor(id: string) {
    return this.http.get<Record<string, unknown>>(`${this.base}/doctors/${id}`);
  }

  organization(id: string) {
    return this.http.get<Record<string, unknown>>(`${this.base}/organizations/${id}`);
  }
}
