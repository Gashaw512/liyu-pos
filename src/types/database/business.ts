// export interface Business {}

// src/types/database/business.ts

import type { BusinessPlan, BusinessVertical } from '../enum';

export interface Business {
  id: string;

  name: string;

  type: BusinessVertical;

  phone: string | null;

  email: string | null;

  address: string | null;

  city: string;

  logo_url: string | null;

  currency: string;

  timezone: string;

  language: string;

  tax_rate: number;

  is_active: boolean;

  /** Enables hotel room folio settlement for this business. */
  is_hotel_integrated: boolean;

  plan: BusinessPlan;

  trial_ends_at: string | null;

  created_at: string;

  updated_at: string;

  deleted_at: string | null;
}

export interface Branch {
  id: string;

  business_id: string;

  name: string;

  address: string | null;

  phone: string | null;

  is_main: boolean;

  is_active: boolean;

  created_at: string;

  deleted_at: string | null;
}

export interface OnboardingProgress {
  id: string;

  business_id: string;

  current_step: string;

  is_completed: boolean;

  created_at: string;

  updated_at: string;
}

// export interface Branch {}


// export interface OnboardingProgress {}
