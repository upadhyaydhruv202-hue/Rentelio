import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import AdBanner from '../../components/AdBanner';
import { userApi } from '../../services/api';
import { POLL_MS, qk } from '../../lib/query';
import { getCompareIds, toggleCompareId } from './Compare';

function buildParams({ search, category, brand, sort, minPrice, maxPrice }) {
  const next = new URLSearchParams();
  if (search) next.set('search', search);
  if (category) next.set('category', category);
  if (brand) next.set('brand', brand);
  if (sort) next.set('sort', sort);
  if (minPrice) next.set('minPrice', minPrice);
  if (maxPrice) next.set('maxPrice', maxPrice);
  return next;
}

export default function ProductBrowse() {
  const [params, setParams] = useSearchParams();
  const [compareIds, setCompareIds] = useState(getCompareIds);

  // URL is the single source of truth — one search applies everywhere
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const brand = params.get('brand') || '';
  const sort = params.get('sort') || '';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const [availableOnly, setAvailableOnly] = useState(true);
  const [draftSearch, setDraftSearch] = useState(search);

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  const commit = (patch) => {
    const next = buildParams({
      search,
      category,
      brand,
      sort,
      minPrice,
      maxPrice,
      ...patch,
    });
    setParams(next, { replace: true });
  };

  const filters = useMemo(
    () => ({
      search,
      category,
      brand,
      sort,
      minPrice,
      maxPrice,
      available: availableOnly ? undefined : 'false',
    }),
    [search, category, brand, sort, minPrice, maxPrice, availableOnly]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: qk.userProducts(filters),
    queryFn: () => userApi.getProducts(filters),
    refetchInterval: POLL_MS,
  });

  const { data: ads = [] } = useQuery({
    queryKey: qk.ads('browse'),
    queryFn: () => userApi.getAds('browse'),
  });

  const products = data?.products || [];
  const categories = data?.categories || [];
  const brands = data?.brands || [];

  const runSearch = (value) => {
    const q = String(value ?? draftSearch).trim();
    setDraftSearch(q);
    commit({ search: q });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{'Browse'}</h1>
        <p className="text-sm text-ink-500">
          Search once — results update immediately (no second Apply)
        </p>
      </div>

      <AdBanner ads={ads} />

      <div className="grid gap-4 rounded-2xl border border-ink-200/80 bg-white p-4 dark:border-ink-700 dark:bg-ink-900 lg:grid-cols-[1fr_auto]">
        <SearchBar
          value={draftSearch}
          onChange={setDraftSearch}
          onSubmit={runSearch}
          placeholder={'Search cameras, drones, laptops…'}
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => commit({ category: e.target.value })}
            className="rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
          >
            <option value="">{'All categories'}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={brand}
            onChange={(e) => commit({ brand: e.target.value })}
            className="rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
          >
            <option value="">{'All brands'}</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => commit({ sort: e.target.value })}
            className="rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
          >
            <option value="">{'Sort'}</option>
            <option value="price_asc">{'Price ↑'}</option>
            <option value="price_desc">{'Price ↓'}</option>
            <option value="name">{'Name'}</option>
          </select>
          <input
            type="number"
            placeholder={'Min ₹'}
            value={minPrice}
            onChange={(e) => commit({ minPrice: e.target.value })}
            className="w-24 rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
          />
          <input
            type="number"
            placeholder={'Max ₹'}
            value={maxPrice}
            onChange={(e) => commit({ maxPrice: e.target.value })}
            className="w-24 rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-950"
          />
          <label className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-sm dark:border-ink-700">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            {'In stock'}
          </label>
          {(search || category || brand || sort || minPrice || maxPrice) && (
            <button
              type="button"
              onClick={() => {
                setDraftSearch('');
                setParams(new URLSearchParams(), { replace: true });
              }}
              className="rounded-xl border border-ink-200 px-4 py-2 text-sm dark:border-ink-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {search && (
        <p className="text-sm text-ink-500">
          Showing results for <span className="font-medium text-ink-800 dark:text-ink-100">“{search}”</span>
        </p>
      )}

      {error && <p className="text-rose-600">{error.message}</p>}
      {isLoading ? (
        <p className="text-ink-500">{'Loading products…'}</p>
      ) : products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-300 bg-white p-10 text-center text-ink-500">
          {'No products match your filters'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="space-y-2">
              <ProductCard product={p} />
              <div className="flex flex-wrap gap-1 px-1">
                <button
                  type="button"
                  className={`rounded-lg px-2 py-1 text-[11px] ${
                    compareIds.includes(Number(p.id))
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-100 dark:bg-ink-800'
                  }`}
                  onClick={() => setCompareIds(toggleCompareId(p.id))}
                >
                  {'Compare'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
