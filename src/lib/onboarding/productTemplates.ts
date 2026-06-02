// Import the centralized types from your categoryTemplates module file
import { BusinessType, TemplateProduct } from './categoryTemplates'

/* ─── Localized Sector Starter Product Templates ────────────────────────── */
export const PRODUCT_TEMPLATES: Record<BusinessType, TemplateProduct[]> = {
  bar_restaurant: [
    { categoryEn: 'Beer', categoryAm: 'ቢራ', nameEn: 'St George Beer', nameAm: 'ቅዱስ ጊዮርጊስ ቢራ', cost: 45, sell: 85 },
    { categoryEn: 'Beer', categoryAm: 'ቢራ', nameEn: 'Dashen Beer', nameAm: 'ዳሽን ቢራ', cost: 42, sell: 80 },
    { categoryEn: 'Soft Drinks', categoryAm: 'ለስላሳ መጠጦች', nameEn: 'Coca-Cola', nameAm: 'ኮካ ኮላ', cost: 12, sell: 25 },
    { categoryEn: 'Soft Drinks', categoryAm: 'ለስላሳ መጠጦች', nameEn: 'Pepsi', nameAm: 'ፔፕሲ', cost: 12, sell: 25 },
    { categoryEn: 'Water', categoryAm: 'ውሃ', nameEn: 'Ambo Water 0.5L', nameAm: 'አምቦ ውሃ 0.5ሊ', cost: 10, sell: 20 },
    { categoryEn: 'Food', categoryAm: 'ምግብ', nameEn: 'Chips / Snacks', nameAm: 'ቺፕስ / ማቅለያ', cost: 30, sell: 60 }
  ],
  cafe_restaurant: [
    { categoryEn: 'Coffee & Tea', categoryAm: 'ቡና እና ሻይ', nameEn: 'Macchiato', nameAm: 'ማኪያቶ', cost: 15, sell: 40 },
    { categoryEn: 'Coffee & Tea', categoryAm: 'ቡና እና ሻይ', nameEn: 'Black Coffee', nameAm: 'ጥቁር ቡና', cost: 10, sell: 25 },
    { categoryEn: 'Bakery', categoryAm: 'ዳቦ ቤት', nameEn: 'Croissant', nameAm: 'ክሮይሳንት', cost: 20, sell: 45 },
    { categoryEn: 'Food', categoryAm: 'ምግብ', nameEn: 'Club Sandwich', nameAm: 'ክለብ ሳንድዊች', cost: 90, sell: 180 }
  ],
  bar_traditional: [
    { categoryEn: 'Traditional Drinks', categoryAm: 'ባህላዊ መጠጦች', nameEn: 'Tej (Honey Wine)', nameAm: 'ጠጅ', cost: 60, sell: 120 },
    { categoryEn: 'Traditional Food', categoryAm: 'ባህላዊ ምግቦች', nameEn: 'Key Wot', nameAm: 'ቀይ ወጥ', cost: 70, sell: 130 },
    { categoryEn: 'Beer', categoryAm: 'ቢራ', nameEn: 'St George Beer', nameAm: 'ቅዱስ ጊዮርጊስ ቢራ', cost: 45, sell: 85 }
  ],
  retail_kiosk: [
    { categoryEn: 'Groceries', categoryAm: 'አጠቃላይ እቃዎች', nameEn: 'Sunlight Soap', nameAm: 'ሳንላይት ሳሙና', cost: 25, sell: 35 },
    { categoryEn: 'Beverages', categoryAm: 'መጠጦች', nameEn: 'Soft Drink 0.5L', nameAm: 'ለስላሳ መጠጥ 0.5ሊ', cost: 18, sell: 30 },
    { categoryEn: 'Snacks', categoryAm: 'ማቅለያዎች', nameEn: 'Biscuits', nameAm: 'ብስኩት', cost: 15, sell: 25 }
  ],
  service_hospitality: [
    { categoryEn: 'Services', categoryAm: 'አገልግሎቶች', nameEn: 'Standard Service Charge', nameAm: 'መደበኛ የአገልግሎት ክፍያ', cost: 0, sell: 200 }
  ],
  other: [
    { categoryEn: 'General Items', categoryAm: 'አጠቃላይ እቃዎች', nameEn: 'Generic Item', nameAm: 'አጠቃላይ ዕቃ', cost: 50, sell: 100 }
  ]
}

/**
 * Helper to pull starter products based on selected business profile
 */
export function getProductsByBusiness(type: BusinessType): TemplateProduct[] {
  return PRODUCT_TEMPLATES[type] || PRODUCT_TEMPLATES['other']
}