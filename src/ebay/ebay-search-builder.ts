export type Region = 'UK' | 'USA';

export interface EbaySearchParams {
  marketplaceId: 'EBAY_GB' | 'EBAY_US';
  q?: string;
  categoryIds?: string;
  sort?: string;
  filters: string[];
}

export interface BrandSearchRow {
  brandName: string;
  maxPrice?: string | number;
  buyNowOnly: boolean;
}

export function buildEbaySearchParams(
  row: BrandSearchRow,
  region: Region,
): EbaySearchParams | null {
  const brandName = row.brandName?.trim();
  if (!brandName) return null;

  const maxPrice = String(row.maxPrice || 15);
  const filters = [
    `price:[..${maxPrice}]`,
    `itemLocationCountry:${region === 'UK' ? 'GB' : 'US'}`,
  ];

  if (row.buyNowOnly) {
    filters.push('buyingOptions:{FIXED_PRICE}');
  }

  return {
    marketplaceId: region === 'UK' ? 'EBAY_GB' : 'EBAY_US',
    q: brandName,
    categoryIds: '281',
    sort: 'newlyListed',
    filters,
  };
}
