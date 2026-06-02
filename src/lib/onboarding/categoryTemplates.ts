/* ─── Shared Core TypeScript Definitions ────────────────────────────────── */
export type BusinessType = 
  | 'bar_restaurant' 
  | 'cafe_restaurant' 
  | 'bar_traditional' 
  | 'retail_kiosk' 
  | 'service_hospitality' 
  | 'other';

export interface TemplateProduct {
  nameEn: string;
  nameAm: string;
  categoryEn: string;
  categoryAm: string;
  cost: number;
  sell: number;
}

/* ─── Localized Sector Category Mapping Matrices ────────────────────────── */
export const CATEGORY_TEMPLATES: Record<BusinessType, { en: string[]; am: string[] }> = {
  bar_restaurant: {
    en: ['Beer', 'Soft Drinks', 'Water', 'Food', 'Wine & Spirits', 'Snacks'],
    am: ['ቢራ', 'ለስላሳ መጠጦች', 'ውሃ', 'ምግብ', 'ወይን እና ስፒሪት', 'ማቅለያዎች']
  },
  cafe_restaurant: {
    en: ['Coffee & Tea', 'Bakery', 'Juice', 'Food', 'Water'],
    am: ['ቡና እና ሻይ', 'ዳቦ ቤት', 'ጁስ', 'ምግብ', 'ውሃ']
  },
  bar_traditional: {
    en: ['Traditional Drinks', 'Beer', 'Traditional Food', 'Water', 'Snacks'],
    am: ['ባህላዊ መጠጦች', 'ቢራ', 'ባህላዊ ምግቦች', 'ውሃ', 'ማቅለያዎች']
  },
  retail_kiosk: {
    en: ['Groceries', 'Beverages', 'Household', 'Snacks'],
    am: ['አጠቃላይ እቃዎች', 'መጠጦች', 'የቤት ውስጥ እቃዎች', 'ማቅለያዎች']
  },
  service_hospitality: {
    en: ['Services', 'Rooms', 'Beverages', 'Food'],
    am: ['አገልግሎቶች', 'ክፍሎች', 'መጠጦች', 'ምግብ']
  },
  other: {
    en: ['General Items', 'Services', 'Miscellaneous'],
    am: ['አጠቃላይ ዕቃዎች', 'አገልግሎቶች', 'የተለያዩ']
  }
}

/**
 * Helper to extract categories by locale smoothly inside the wizard steps
 */
export function getCategoriesByBusiness(type: BusinessType, lang: 'am' | 'en'): string[] {
  const selected = CATEGORY_TEMPLATES[type] || CATEGORY_TEMPLATES['other']
  return lang === 'am' ? selected.am : selected.en
}