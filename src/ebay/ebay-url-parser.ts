export type EbayMarketplace = 'EBAY_GB' | 'EBAY_US';

export interface EbaySearchParams {
  marketplaceId: EbayMarketplace;
  q?: string;
  categoryIds?: string;
  sort?: string;
  filters: string[];
}

const MARKETPLACE_BY_HOST: Record<string, EbayMarketplace> = {
  'www.ebay.co.uk': 'EBAY_GB',
  'ebay.co.uk': 'EBAY_GB',
  'www.ebay.com': 'EBAY_US',
  'ebay.com': 'EBAY_US',
};

const COUNTRY_BY_MARKETPLACE: Record<EbayMarketplace, string> = {
  EBAY_GB: 'GB',
  EBAY_US: 'US',
};

const SORT_BY_SOP: Record<string, string | undefined> = {
  '1': undefined,
  '10': 'newlyListed',
  '12': 'endingSoonest',
  '15': 'price',
  '16': '-price',
};

export function parseEbaySearchUrl(url: string): EbaySearchParams {
  const parsed = new URL(url);
  const marketplaceId =
    MARKETPLACE_BY_HOST[parsed.hostname] ??
    inferMarketplaceFromBrand(url) ??
    'EBAY_GB';

  const params = parsed.searchParams;
  const filters: string[] = [];

  const categoryMatch = parsed.pathname.match(/\/sch\/(\d+)/);
  const categoryIds = categoryMatch?.[1];

  const keyword = params.get('_nkw') || undefined;

  const minPrice = params.get('_udlo');
  const maxPrice = params.get('_udhi');
  if (minPrice || maxPrice) {
    filters.push(`price:[${minPrice ?? ''}..${maxPrice ?? ''}]`);
  }

  if (params.get('LH_BIN') === '1') {
    filters.push('buyingOptions:{FIXED_PRICE}');
  }

  if (params.get('_fsrp') === '1' || params.get('LH_FS') === '1') {
    filters.push('maxDeliveryCost:0');
  }

  if (params.get('LH_PrefLoc') === '1') {
    filters.push(
      `itemLocationCountry:${COUNTRY_BY_MARKETPLACE[marketplaceId]}`,
    );
  }

  const sort = SORT_BY_SOP[params.get('_sop') ?? ''];

  return {
    marketplaceId,
    q: keyword,
    categoryIds,
    sort,
    filters,
  };
}

function inferMarketplaceFromBrand(url: string): EbayMarketplace | undefined {
  if (url.includes('ebay.com')) return 'EBAY_US';
  if (url.includes('ebay.co.uk')) return 'EBAY_GB';
  return undefined;
}
