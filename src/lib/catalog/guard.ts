export type CatalogItem = {
  id: string
}

export function getEffectiveCatalog<T extends CatalogItem>(
  products?: T[] | null,
): T[] {
  return Array.isArray(products) ? products : []
}
