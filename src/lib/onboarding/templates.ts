/* ============================================================================
 * 1. UNIFIED ENTERPRISE DOMAIN CONTRACTS
 * ========================================================================== */
export type BusinessType = 
  | 'bar_restaurant' 
  | 'cafe_restaurant' 
  | 'bar_traditional' 
  | 'retail_kiosk' 
  | 'service_hospitality' 
  | 'other';

export interface TemplateCategory {
  name: string;        // English database master index
  name_am: string;     // Localized Amharic display name
  icon?: string;       // UI layout visual anchor
  color?: string;      // Category color tag
  sort_order: number;
}

export interface TemplateProduct {
  name: string;        // English name parameter
  name_am: string;     // Local Amharic name parameter
  cost_price: number;  // Standardized database snake_case naming columns
  retail_price: number;
  unit_type: 'piece' | 'kg' | 'liter' | 'packet';
  low_stock_alert: number;
  track_inventory: boolean;
  category_name: string; // Relational anchor connecting back to the category name index
}

export interface OnboardingSectorPackage {
  categories: TemplateCategory[];
  products: TemplateProduct[];
}

/* ============================================================================
 * 2. PRODUCTION SECTOR STARTER SEED PACKAGES
 * ========================================================================== */
const SECTOR_PACKAGES: Record<BusinessType, OnboardingSectorPackage> = {
  bar_restaurant: {
    categories: [
      { name: 'Beer', name_am: 'ቢራ', icon: '🍺', color: '#FFD700', sort_order: 1 },
      { name: 'Soft Drinks', name_am: 'ለስላሳ መጠጦች', icon: '🥤', color: '#FF6347', sort_order: 2 },
      { name: 'Water', name_am: 'ውሃ', icon: '💧', color: '#4682B4', sort_order: 3 },
      { name: 'Food', name_am: 'ምግብ', icon: '🍽️', color: '#CD5C5C', sort_order: 4 }
    ],
    products: [
      { name: 'St George Beer', name_am: 'ቅዱስ ጊዮርጊስ ቢራ', cost_price: 45, retail_price: 85, unit_type: 'piece', low_stock_alert: 48, track_inventory: true, category_name: 'Beer' },
      { name: 'Dashen Beer', name_am: 'ዳሽን ቢራ', cost_price: 42, retail_price: 80, unit_type: 'piece', low_stock_alert: 48, track_inventory: true, category_name: 'Beer' },
      { name: 'Coca-Cola', name_am: 'ኮካ ኮላ', cost_price: 12, retail_price: 25, unit_type: 'piece', low_stock_alert: 24, track_inventory: true, category_name: 'Soft Drinks' },
      { name: 'Pepsi', name_am: 'ፔፕሲ', cost_price: 12, retail_price: 25, unit_type: 'piece', low_stock_alert: 24, track_inventory: true, category_name: 'Soft Drinks' },
      { name: 'Ambo Water 0.5L', name_am: 'አምቦ ውሃ 0.5ሊ', cost_price: 10, retail_price: 20, unit_type: 'piece', low_stock_alert: 24, track_inventory: true, category_name: 'Water' },
      { name: 'Chips / Snacks', name_am: 'ቺፕስ / ማቅለያ', cost_price: 30, retail_price: 60, unit_type: 'piece', low_stock_alert: 10, track_inventory: true, category_name: 'Food' }
    ]
  },
  cafe_restaurant: {
    categories: [
      { name: 'Coffee & Tea', name_am: 'ቡና እና ሻይ', icon: '☕', color: '#8B4513', sort_order: 1 },
      { name: 'Bakery', name_am: 'ዳቦ ቤት', icon: '🥐', color: '#DEB887', sort_order: 2 },
      { name: 'Food', name_am: 'ምግብ', icon: '🍽️', color: '#CD5C5C', sort_order: 3 }
    ],
    products: [
      { name: 'Macchiato', name_am: 'ማኪያቶ', cost_price: 15, retail_price: 40, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Coffee & Tea' },
      { name: 'Black Coffee', name_am: 'ጥቁር ቡና', cost_price: 10, retail_price: 25, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Coffee & Tea' },
      { name: 'Croissant', name_am: 'ክሮይሳንት', cost_price: 20, retail_price: 45, unit_type: 'piece', low_stock_alert: 15, track_inventory: true, category_name: 'Bakery' },
      { name: 'Club Sandwich', name_am: 'ክለብ ሳንድዊች', cost_price: 90, retail_price: 180, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Food' }
    ]
  },
  bar_traditional: {
    categories: [
      { name: 'Traditional Drinks', name_am: 'ባህላዊ መጠጦች', icon: '🍯', color: '#D2691E', sort_order: 1 },
      { name: 'Traditional Food', name_am: 'ባህላዊ ምግቦች', icon: '🫓', color: '#CD853F', sort_order: 2 },
      { name: 'Beer', name_am: 'ቢራ', icon: '🍺', color: '#FFD700', sort_order: 3 }
    ],
    products: [
      { name: 'Tej (Honey Wine)', name_am: 'ጠጅ', cost_price: 60, retail_price: 120, unit_type: 'liter', low_stock_alert: 20, track_inventory: true, category_name: 'Traditional Drinks' },
      { name: 'Key Wot', name_am: 'ቀይ ወጥ', cost_price: 70, retail_price: 130, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Traditional Food' },
      { name: 'St George Beer', name_am: 'ቅዱስ ጊዮርጊስ ቢራ', cost_price: 45, retail_price: 85, unit_type: 'piece', low_stock_alert: 48, track_inventory: true, category_name: 'Beer' }
    ]
  },
  retail_kiosk: {
    categories: [
      { name: 'Groceries', name_am: 'አጠቃላይ እቃዎች', icon: '🥫', color: '#4E9F3D', sort_order: 1 },
      { name: 'Beverages', name_am: 'መጠጦች', icon: '🧃', color: '#1E5128', sort_order: 2 },
      { name: 'Snacks', name_am: 'ማቅለያዎች', icon: '🍪', color: '#D8B257', sort_order: 3 }
    ],
    products: [
      { name: 'Sunlight Soap', name_am: 'ሳንላይት ሳሙና', cost_price: 25, retail_price: 35, unit_type: 'piece', low_stock_alert: 20, track_inventory: true, category_name: 'Groceries' },
      { name: 'Soft Drink 0.5L', name_am: 'ለስላሳ መጠጥ 0.5ሊ', cost_price: 18, retail_price: 30, unit_type: 'piece', low_stock_alert: 36, track_inventory: true, category_name: 'Beverages' },
      { name: 'Biscuits', name_am: 'ብስኩት', cost_price: 15, retail_price: 25, unit_type: 'piece', low_stock_alert: 50, track_inventory: true, category_name: 'Snacks' }
    ]
  },
  service_hospitality: {
    categories: [
      { name: 'Services', name_am: 'አገልግሎቶች', icon: '🛎️', color: '#4B5563', sort_order: 1 }
    ],
    products: [
      { name: 'Standard Service Charge', name_am: 'መደበኛ የአገልግሎት ክፍያ', cost_price: 0, retail_price: 200, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Services' }
    ]
  },
  other: {
    categories: [
      { name: 'General Items', name_am: 'አጠቃላይ እቃዎች', icon: '📦', color: '#6B7280', sort_order: 1 }
    ],
    products: [
      { name: 'Generic Item', name_am: 'አጠቃላይ ዕቃ', cost_price: 50, retail_price: 100, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'General Items' }
    ]
  }
};

/* ============================================================================
 * 3. DECOUPLED ONBOARDING ACCESS ADAPTERS
 * ========================================================================== */

/**
 * Enterprise Fetcher: Retrieves the entire structure package payload.
 * Fully optimized to align with incoming Python FastAPI network requests down the line.
 */
export function getSectorTemplatePackage(type: BusinessType): OnboardingSectorPackage {
  return SECTOR_PACKAGES[type] || SECTOR_PACKAGES['other'];
}

/**
 * Backward-Compatible UI Helpers
 * Preserves full functionality across your multi-step client onboarding wizards
 */
export function getCategoriesByBusiness(type: BusinessType, lang: 'am' | 'en'): string[] {
  const pkg = getSectorTemplatePackage(type);
  return pkg.categories.map((c) => (lang === 'am' ? c.name_am : c.name));
}

export function getProductsByBusiness(type: BusinessType): TemplateProduct[] {
  return getSectorTemplatePackage(type).products;
}
