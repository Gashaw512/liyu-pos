/* ============================================================================
 * 1. UNIFIED ENTERPRISE DOMAIN TYPES (DATABASE-ALIGNED)
 * ========================================================================== */
export type BusinessType = 
  | 'bar_restaurant' 
  | 'cafe_restaurant' 
  | 'bar_traditional' 
  | 'retail_kiosk' 
  | 'service_hospitality' 
  | 'other';

export interface TemplateCategory {
  name: string;        // English name mapping (Standard database value)
  name_am: string;     // Amharic name mapping
  icon?: string;       // Visual anchor for POS grid layouts
  color?: string;      // Category identification color token
  sort_order: number;
}

export interface TemplateProduct {
  name: string;        // English master naming
  name_am: string;     // Local Amharic naming
  cost_price: number;  // Standardized database column snake_case name conventions
  retail_price: number;
  unit_type: 'piece' | 'kg' | 'liter' | 'packet';
  barcode?: string;
  sku?: string;
  low_stock_alert: number;
  track_inventory: boolean;
  
  // Explicitly binds this starter product back to its template category reference
  category_name: string; 
}

export interface OnboardingSectorPackage {
  categories: TemplateCategory[];
  products: TemplateProduct[];
}

/* ============================================================================
 * 2. REAL-WORLD DATA MATRICES (RICH STARTER SECTOR PACKAGES)
 * ========================================================================== */
const SECTOR_PACKAGES: Record<BusinessType, OnboardingSectorPackage> = {
  cafe_restaurant: {
    categories: [
      { name: 'Coffee & Tea', name_am: 'ቡና እና ሻይ', icon: '☕', color: '#8B4513', sort_order: 1 },
      { name: 'Bakery', name_am: 'ዳቦ ቤት', icon: '🥐', color: '#DEB887', sort_order: 2 },
      { name: 'Juice', name_am: 'ጁስ', icon: '🍹', color: '#FF4500', sort_order: 3 },
      { name: 'Food', name_am: 'ምግብ', icon: '🍽️', color: '#CD5C5C', sort_order: 4 },
      { name: 'Water', name_am: 'ውሃ', icon: '💧', color: '#4682B4', sort_order: 5 }
    ],
    products: [
      { name: 'Macchiato', name_am: 'ማኪያቶ', cost_price: 25, retail_price: 45, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Coffee & Tea' },
      { name: 'Black Coffee', name_am: 'ጥቁር ቡና', cost_price: 15, retail_price: 30, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Coffee & Tea' },
      { name: 'Croissant', name_am: 'ክሮይሰንት', cost_price: 40, retail_price: 70, unit_type: 'piece', low_stock_alert: 10, track_inventory: true, category_name: 'Bakery' },
      { name: 'Avocado Juice', name_am: 'አቮካዶ ጁስ', cost_price: 50, retail_price: 90, unit_type: 'piece', low_stock_alert: 5, track_inventory: true, category_name: 'Juice' },
      { name: 'Special Burger', name_am: 'ስፔሻል በርገር', cost_price: 180, retail_price: 320, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Food' },
      { name: 'Mineral Water 500ml', name_am: 'የታሸገ ውሃ 500ml', cost_price: 12, retail_price: 25, unit_type: 'piece', low_stock_alert: 48, track_inventory: true, category_name: 'Water' }
    ]
  },
  bar_restaurant: {
    categories: [
      { name: 'Beer', name_am: 'ቢራ', icon: '🍺', color: '#FFD700', sort_order: 1 },
      { name: 'Soft Drinks', name_am: 'ለስላሳ መጠጦች', icon: '🥤', color: '#FF6347', sort_order: 2 },
      { name: 'Food', name_am: 'ምግብ', icon: '🥩', color: '#8B0000', sort_order: 3 },
      { name: 'Water', name_am: 'ውሃ', icon: '💧', color: '#4682B4', sort_order: 4 }
    ],
    products: [
      { name: 'St. George Beer', name_am: 'ቅዱስ ጊዮርጊስ ቢራ', cost_price: 55, retail_price: 85, unit_type: 'piece', low_stock_alert: 120, track_inventory: true, category_name: 'Beer' },
      { name: 'Habesha Beer', name_am: 'ሐበሻ ቢራ', cost_price: 55, retail_price: 85, unit_type: 'piece', low_stock_alert: 120, track_inventory: true, category_name: 'Beer' },
      { name: 'Coca Cola', name_am: 'ኮካ ኮላ', cost_price: 20, retail_price: 35, unit_type: 'piece', low_stock_alert: 60, track_inventory: true, category_name: 'Soft Drinks' },
      { name: 'Shekla Tibs', name_am: 'ሸክላ ጥብስ', cost_price: 350, retail_price: 550, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Food' }
    ]
  },
  bar_traditional: {
    categories: [
      { name: 'Traditional Drinks', name_am: 'ባህላዊ መጠጦች', icon: '🍯', color: '#D2691E', sort_order: 1 },
      { name: 'Beer', name_am: 'ቢራ', icon: '🍺', color: '#FFD700', sort_order: 2 },
      { name: 'Traditional Food', name_am: 'ባህላዊ ምግቦች', icon: '🫓', color: '#CD853F', sort_order: 3 }
    ],
    products: [
      { name: 'Tej Special', name_am: 'ስፔሻል ጠጅ', cost_price: 80, retail_price: 150, unit_type: 'liter', low_stock_alert: 20, track_inventory: true, category_name: 'Traditional Drinks' },
      { name: 'Tella', name_am: 'ጠላ', cost_price: 20, retail_price: 50, unit_type: 'liter', low_stock_alert: 50, track_inventory: true, category_name: 'Traditional Drinks' },
      { name: 'Beyaynetu', name_am: 'በያይነቱ', cost_price: 90, retail_price: 160, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Traditional Food' }
    ]
  },
  retail_kiosk: {
    categories: [
      { name: 'Groceries', name_am: 'አጠቃላይ እቃዎች', icon: '🥫', color: '#4E9F3D', sort_order: 1 },
      { name: 'Beverages', name_am: 'መጠጦች', icon: '🧃', color: '#1E5128', sort_order: 2 },
      { name: 'Snacks', name_am: 'ማቅለያዎች', icon: '🍪', color: '#D8B257', sort_order: 3 }
    ],
    products: [
      { name: 'Sunflower Oil 1L', name_am: 'የሱፍ ዘይት 1L', cost_price: 180, retail_price: 230, unit_type: 'piece', low_stock_alert: 12, track_inventory: true, category_name: 'Groceries' },
      { name: 'Sugar 1kg', name_am: 'ስኳር 1kg', cost_price: 90, retail_price: 120, unit_type: 'kg', low_stock_alert: 50, track_inventory: true, category_name: 'Groceries' },
      { name: 'Biskut', name_am: 'ብስኩት', cost_price: 15, retail_price: 25, unit_type: 'piece', low_stock_alert: 40, track_inventory: true, category_name: 'Snacks' }
    ]
  },
  service_hospitality: {
    categories: [
      { name: 'Services', name_am: 'አገልግሎቶች', icon: '🛎️', color: '#4B5563', sort_order: 1 },
      { name: 'Rooms', name_am: 'ክፍሎች', icon: '🛏️', color: '#2563EB', sort_order: 2 }
    ],
    products: [
      { name: 'Laundry Service', name_am: 'የልብስ እጠባ አገልግሎት', cost_price: 30, retail_price: 100, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Services' },
      { name: 'Standard Room 1 Night', name_am: 'መደበኛ ክፍል በአዳር', cost_price: 400, retail_price: 1200, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'Rooms' }
    ]
  },
  other: {
    categories: [
      { name: 'General Items', name_am: 'አጠቃላይ ዕቃዎች', icon: '📦', color: '#6B7280', sort_order: 1 },
      { name: 'Services', name_am: 'አገልግሎቶች', icon: '🛠️', color: '#374151', sort_order: 2 }
    ],
    products: [
      { name: 'General Custom Item', name_am: 'አጠቃላይ ምርት', cost_price: 0, retail_price: 0, unit_type: 'piece', low_stock_alert: 0, track_inventory: false, category_name: 'General Items' }
    ]
  }
}

/* ============================================================================
 * 3. ENTERPRISE DECOUPLED ADAPTER UTILITIES
 * ========================================================================== */

/**
 * Native API-Ready Aggregator: Retrieves the full onboarding data package for a sector.
 * Perfect for client rendering or direct backend serialization pipelines.
 */
export function getSectorTemplatePackage(type: BusinessType): OnboardingSectorPackage {
  return SECTOR_PACKAGES[type] || SECTOR_PACKAGES['other'];
}

/**
 * Lightweight Client Component UI Helper
 * Fetches localized string sets cleanly without downloading the full structural product object arrays.
 */
export function getCategoriesByBusiness(type: BusinessType, lang: 'am' | 'en'): string[] {
  const pkg = getSectorTemplatePackage(type);
  return pkg.categories.map((c) => (lang === 'am' ? c.name_am : c.name));
}
