// src/types/product-list.ts

export interface ProductListItem {
  id: string

  name: string
  name_am: string | null

  image_url: string | null

  retail_price: number

  price_type: 'fixed' | 'group'

  category_name: string | null
  category_name_am: string | null

  price_group_name: string | null

  is_active: boolean
}